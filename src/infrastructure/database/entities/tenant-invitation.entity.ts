import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Admin invitation lifecycle (SOA-002 M5 — P3).
 *
 * Token stored as SHA-256 hex — raw token is sent in the email link only, never persisted.
 * Soft-deleted via cancelled_at + cancelled_by (audit trail preserved).
 * Idempotent invite pattern : a 2nd invite to the same (email, tenant) resets the token on
 * the existing pending row instead of creating a duplicate (invariant #5).
 * Role is locked to 'admin' — owner lifecycle uses tenant_transfers, not invitations.
 */
@Entity('tenant_invitations')
@Index('idx_tenant_invitations_tenant_email', ['tenantId', 'email'])
@Index('idx_tenant_invitations_expires', ['expiresAt'])
export class TenantInvitationEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Index('idx_tenant_invitations_token', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  token!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 50, name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'enum', enum: ['admin'], default: 'admin' })
  role!: 'admin';

  @Column({ type: 'varchar', length: 36, name: 'invited_by' })
  invitedBy!: string;

  @Column({ type: 'datetime', precision: 3, name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'used_at' })
  usedAt?: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'cancelled_at' })
  cancelledAt?: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'cancelled_by' })
  cancelledBy?: string | null;

  @CreateDateColumn({ name: 'created_at', precision: 3 })
  createdAt!: Date;
}
