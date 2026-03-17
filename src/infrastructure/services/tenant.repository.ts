import crypto from 'crypto';
import { Repository } from 'typeorm';
import { DatabaseConnection } from '../database/config/database.config';
import { TenantEntity } from '../database/entities/tenant.entity';
import { TenantCryptoService } from './tenant-crypto.service';

export interface TenantCredentials {
  clientId: string;
  clientSecretPlain: string; // returned only at creation time
}

export interface TenantRecord {
  clientId: string;
  name: string;
  webhookUrl: string | null;
  allowedOrigins: string[] | null;
  retentionDays: number;
  isActive: boolean;
  createdAt: Date;
}

export class TenantRepository {
  private repository: Repository<TenantEntity>;
  private crypto: TenantCryptoService;

  constructor(crypto: TenantCryptoService) {
    this.repository = DatabaseConnection.getInstance().getRepository(TenantEntity);
    this.crypto = crypto;
  }

  /**
   * Create a tenant. Returns the plain client_secret once — never stored in clear.
   */
  async create(name: string, opts?: {
    webhookUrl?: string;
    allowedOrigins?: string[];
    retentionDays?: number;
  }): Promise<{ tenant: TenantRecord; clientSecret: string }> {
    const clientId = crypto.randomUUID();
    const clientSecretPlain = crypto.randomBytes(32).toString('hex');
    const salt = this.crypto.generateSalt();
    const hash = this.crypto.hashClientSecret(clientSecretPlain, salt);

    // JWT secret: 32 random bytes → AES-256-GCM
    const jwtSecretPlain = crypto.randomBytes(32).toString('hex');
    const { encrypted: jwtSecretEncrypted, iv: jwtSecretIv } = this.crypto.encryptValue(jwtSecretPlain);

    const entity = this.repository.create({
      clientId,
      name,
      clientSecretHash: hash,
      clientSecretSalt: salt,
      jwtSecretEncrypted,
      jwtSecretIv,
      webhookUrl: opts?.webhookUrl ?? null,
      allowedOrigins: opts?.allowedOrigins ?? null,
      retentionDays: opts?.retentionDays ?? 90,
      isActive: true,
    });

    const saved = await this.repository.save(entity);
    return { tenant: this.toRecord(saved), clientSecret: clientSecretPlain };
  }

  async findByClientId(clientId: string): Promise<TenantEntity | null> {
    return this.repository.findOne({ where: { clientId, isActive: true } });
  }

  /**
   * Verify client credentials. Returns tenantId on success, null on failure.
   */
  async verifyCredentials(clientId: string, clientSecret: string): Promise<string | null> {
    const entity = await this.repository.findOne({ where: { clientId, isActive: true } });
    if (!entity) return null;

    const valid = this.crypto.verifyClientSecret(
      clientSecret,
      entity.clientSecretSalt,
      entity.clientSecretHash
    );
    return valid ? entity.clientId : null;
  }

  /**
   * Decrypt the JWT secret for a tenant to sign tokens.
   */
  async getJwtSecret(clientId: string): Promise<string | null> {
    const entity = await this.repository.findOne({ where: { clientId, isActive: true } });
    if (!entity) return null;
    return this.crypto.decryptValue(entity.jwtSecretEncrypted, entity.jwtSecretIv);
  }

  private toRecord(entity: TenantEntity): TenantRecord {
    return {
      clientId: entity.clientId,
      name: entity.name,
      webhookUrl: entity.webhookUrl ?? null,
      allowedOrigins: entity.allowedOrigins ?? null,
      retentionDays: entity.retentionDays,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
    };
  }
}
