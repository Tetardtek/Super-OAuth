import { Repository } from 'typeorm';
import { DatabaseConnection } from '../config/database.config';
import { TenantAdminEntity } from '../entities/tenant-admin.entity';

export interface CreateTenantAdminInput {
  platformUserId: string;
  tenantId: string;
  role: 'owner' | 'admin';
  invitedBy?: string | null;
}

/**
 * Access layer for tenant_admins (SOA-002 P3).
 *
 * Invariant #1 (exactly one owner per tenant) is enforced by business logic
 * (DeleteTenant, RevokeTenantAdmin, transfer flow in P4) + composite PK.
 */
export class TenantAdminRepository {
  private readonly repository: Repository<TenantAdminEntity>;

  constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(TenantAdminEntity);
  }

  async findMembership(
    platformUserId: string,
    tenantId: string
  ): Promise<TenantAdminEntity | null> {
    const row = await this.repository.findOne({ where: { platformUserId, tenantId } });
    return row ?? null;
  }

  async findOwner(tenantId: string): Promise<TenantAdminEntity | null> {
    const row = await this.repository.findOne({ where: { tenantId, role: 'owner' } });
    return row ?? null;
  }

  async isOwner(platformUserId: string, tenantId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { platformUserId, tenantId, role: 'owner' },
    });
    return count > 0;
  }

  async listByTenant(tenantId: string): Promise<TenantAdminEntity[]> {
    return this.repository.find({
      where: { tenantId },
      order: { role: 'ASC', joinedAt: 'ASC' },
    });
  }

  async countByTenant(tenantId: string): Promise<number> {
    return this.repository.count({ where: { tenantId } });
  }

  async create(input: CreateTenantAdminInput): Promise<TenantAdminEntity> {
    const entity = this.repository.create({
      platformUserId: input.platformUserId,
      tenantId: input.tenantId,
      role: input.role,
      invitedBy: input.invitedBy ?? null,
    });
    return this.repository.save(entity);
  }

  async remove(platformUserId: string, tenantId: string): Promise<void> {
    await this.repository.delete({ platformUserId, tenantId });
  }
}
