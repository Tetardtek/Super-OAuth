import { DataSource, Repository } from 'typeorm';
import { DatabaseConnection } from '../config/database.config';
import { TenantAdminEntity } from '../entities/tenant-admin.entity';

export interface CreateTenantAdminInput {
  platformUserId: string;
  tenantId: string;
  role: 'owner' | 'admin';
  invitedBy?: string | null;
}

export interface TenantAdminWithUser {
  platformUserId: string;
  email: string;
  role: 'owner' | 'admin';
  invitedBy: string | null;
  joinedAt: Date;
}

/**
 * Access layer for tenant_admins (SOA-002 P3).
 *
 * Invariant #1 (exactly one owner per tenant) is enforced by business logic
 * (DeleteTenant, RevokeTenantAdmin, transfer flow in P4) + composite PK.
 */
export class TenantAdminRepository {
  private readonly repository: Repository<TenantAdminEntity>;
  private readonly dataSource: DataSource;

  constructor() {
    const ds = DatabaseConnection.getInstance();
    this.repository = ds.getRepository(TenantAdminEntity);
    this.dataSource = ds;
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

  /**
   * Same as listByTenant but joins platform_users to include the admin's email.
   * Preferred for UI consumption — avoids an N+1 lookup client-side.
   */
  async listByTenantWithUser(tenantId: string): Promise<TenantAdminWithUser[]> {
    const rows = (await this.dataSource.query(
      `SELECT
         ta.platform_user_id AS platformUserId,
         pu.email AS email,
         ta.role AS role,
         ta.invited_by AS invitedBy,
         ta.joined_at AS joinedAt
       FROM tenant_admins ta
       INNER JOIN platform_users pu ON pu.id = ta.platform_user_id
       WHERE ta.tenant_id = ?
       ORDER BY ta.role ASC, ta.joined_at ASC`,
      [tenantId],
    )) as Array<{
      platformUserId: string;
      email: string;
      role: 'owner' | 'admin';
      invitedBy: string | null;
      joinedAt: Date;
    }>;
    return rows.map((r) => ({
      platformUserId: r.platformUserId,
      email: r.email,
      role: r.role,
      invitedBy: r.invitedBy,
      joinedAt: r.joinedAt,
    }));
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
