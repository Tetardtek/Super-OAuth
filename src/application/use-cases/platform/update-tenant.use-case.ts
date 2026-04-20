import { Repository } from 'typeorm';
import { TenantEntity } from '../../../infrastructure/database/entities/tenant.entity';
import { DatabaseConnection } from '../../../infrastructure/database/config/database.config';

export interface UpdateTenantInput {
  clientId: string;
  platformUserId: string;
  patch: {
    webhookUrl?: string | null;
    allowedOrigins?: string[] | null;
    redirectUris?: string[] | null;
    retentionDays?: number;
  };
}

export type UpdateTenantOutcome =
  | { status: 'updated' }
  | { status: 'not_found' }
  | { status: 'forbidden' };

/**
 * Owner-only update. Non-rotatable attributes (client_secret, jwt_secret) are
 * explicitly excluded — rotation is a separate flow (out of P2 scope).
 */
export class UpdateTenantUseCase {
  private repository: Repository<TenantEntity>;

  constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(TenantEntity);
  }

  async execute(input: UpdateTenantInput): Promise<UpdateTenantOutcome> {
    const tenant = await this.repository.findOne({ where: { clientId: input.clientId } });
    if (!tenant) return { status: 'not_found' };
    if (tenant.ownerPlatformUserId !== input.platformUserId) {
      return { status: 'forbidden' };
    }

    if (input.patch.webhookUrl !== undefined) tenant.webhookUrl = input.patch.webhookUrl;
    if (input.patch.allowedOrigins !== undefined)
      tenant.allowedOrigins = input.patch.allowedOrigins;
    if (input.patch.redirectUris !== undefined) tenant.redirectUris = input.patch.redirectUris;
    if (input.patch.retentionDays !== undefined) tenant.retentionDays = input.patch.retentionDays;

    await this.repository.save(tenant);

    return { status: 'updated' };
  }
}
