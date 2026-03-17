import crypto from 'crypto';
import { Repository } from 'typeorm';
import { DatabaseConnection } from '../database/config/database.config';
import { TenantProviderEntity } from '../database/entities/tenant-provider.entity';
import { TenantCryptoService } from './tenant-crypto.service';

export interface ProviderConfig {
  tenantId: string;
  provider: string;
  clientId: string;
  clientSecretPlain: string;
}

export class TenantProviderRepository {
  private repository: Repository<TenantProviderEntity>;
  private crypto: TenantCryptoService;

  constructor(crypto: TenantCryptoService) {
    this.repository = DatabaseConnection.getInstance().getRepository(TenantProviderEntity);
    this.crypto = crypto;
  }

  async upsert(config: ProviderConfig): Promise<void> {
    const { encrypted, iv } = this.crypto.encryptValue(config.clientSecretPlain);

    const existing = await this.repository.findOne({
      where: { tenantId: config.tenantId, provider: config.provider },
    });

    if (existing) {
      await this.repository.update(existing.id, {
        clientId: config.clientId,
        clientSecretEncrypted: encrypted,
        clientSecretIv: iv,
      });
    } else {
      await this.repository.save(this.repository.create({
        id: crypto.randomUUID(),
        tenantId: config.tenantId,
        provider: config.provider,
        clientId: config.clientId,
        clientSecretEncrypted: encrypted,
        clientSecretIv: iv,
      }));
    }
  }

  /**
   * Get decrypted provider credentials for a tenant.
   * Returns null if not configured (caller should fallback to global creds).
   */
  async getDecrypted(tenantId: string, provider: string): Promise<{ clientId: string; clientSecret: string } | null> {
    const entity = await this.repository.findOne({ where: { tenantId, provider } });
    if (!entity) return null;

    return {
      clientId: entity.clientId,
      clientSecret: this.crypto.decryptValue(entity.clientSecretEncrypted, entity.clientSecretIv),
    };
  }

  async listByTenant(tenantId: string): Promise<Array<{ provider: string; clientId: string }>> {
    const entities = await this.repository.find({ where: { tenantId } });
    return entities.map(e => ({ provider: e.provider, clientId: e.clientId }));
  }

  async deleteByTenantAndProvider(tenantId: string, provider: string): Promise<void> {
    await this.repository.delete({ tenantId, provider });
  }
}
