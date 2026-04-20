import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Tenant staff roster (SOA-002 M3). Owner/admin role mapping between platform_users
 * and tenants. Invariant : EXACTLY 1 role='owner' per tenant_id (DB-enforced via
 * composite PK + check constraints).
 */
@Entity('tenant_admins')
@Index('idx_tenant_admins_tenant_role', ['tenantId', 'role'])
export class TenantAdminEntity {
  @PrimaryColumn({ type: 'varchar', length: 36, name: 'platform_user_id' })
  platformUserId!: string;

  @PrimaryColumn({ type: 'varchar', length: 36, name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'enum', enum: ['owner', 'admin'] })
  role!: 'owner' | 'admin';

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'invited_by' })
  invitedBy?: string | null;

  @CreateDateColumn({ name: 'joined_at', precision: 3 })
  joinedAt!: Date;
}
