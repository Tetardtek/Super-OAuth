import { Repository } from 'typeorm';
import { TenantEntity } from '../../../infrastructure/database/entities/tenant.entity';
import { DatabaseConnection } from '../../../infrastructure/database/config/database.config';

export interface OwnedTenantRecord {
  clientId: string;
  name: string;
  isActive: boolean;
  retentionDays: number;
  createdAt: Date;
  webhookUrl: string | null;
  allowedOrigins: string[] | null;
  redirectUris: string[] | null;
}

export class ListOwnedTenantsUseCase {
  private repository: Repository<TenantEntity>;

  constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(TenantEntity);
  }

  async execute(platformUserId: string): Promise<OwnedTenantRecord[]> {
    const tenants = await this.repository.find({
      where: { ownerPlatformUserId: platformUserId },
      order: { createdAt: 'DESC' },
    });

    return tenants.map((t) => ({
      clientId: t.clientId,
      name: t.name,
      isActive: t.isActive,
      retentionDays: t.retentionDays,
      createdAt: t.createdAt,
      webhookUrl: t.webhookUrl ?? null,
      allowedOrigins: t.allowedOrigins ?? null,
      redirectUris: t.redirectUris ?? null,
    }));
  }
}
