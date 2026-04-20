import { Repository } from 'typeorm';
import { TenantEntity } from '../../../infrastructure/database/entities/tenant.entity';
import { DatabaseConnection } from '../../../infrastructure/database/config/database.config';

export interface DeleteTenantInput {
  clientId: string;
  platformUserId: string;
}

export type DeleteTenantOutcome =
  | { status: 'deactivated' }
  | { status: 'not_found' }
  | { status: 'forbidden' };

/**
 * Soft-deletes a tenant by flipping isActive=false. Rows, credentials, and
 * tenant_admins associations are preserved for audit/recovery. Hard delete
 * (if ever needed) would require cascading cleanup and is out of P2 scope.
 */
export class DeleteTenantUseCase {
  private repository: Repository<TenantEntity>;

  constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(TenantEntity);
  }

  async execute(input: DeleteTenantInput): Promise<DeleteTenantOutcome> {
    const tenant = await this.repository.findOne({ where: { clientId: input.clientId } });
    if (!tenant) return { status: 'not_found' };
    if (tenant.ownerPlatformUserId !== input.platformUserId) {
      return { status: 'forbidden' };
    }

    tenant.isActive = false;
    await this.repository.save(tenant);

    return { status: 'deactivated' };
  }
}
