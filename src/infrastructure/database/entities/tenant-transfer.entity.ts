import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Ownership transfer flow (SOA-002 M5 — P4).
 *
 * Token stored as SHA-256 hex — raw token is sent in the target's email only.
 * Lifecycle fields (completedAt, declinedAt, cancelledAt) are mutually exclusive :
 * exactly one may be set for a closed transfer. "Pending" = all three NULL AND
 * expiresAt > NOW(). Only one pending transfer per tenant is allowed (invariant
 * enforced at application layer, unique partial index not available in MySQL 8).
 *
 * Target (to_admin_id) MUST be an existing admin of the tenant at initiation
 * time — restrictive pattern protects against typo/phishing (ADR SOA-002
 * "Transfer permissif rejected" rationale).
 */
@Entity('tenant_transfers')
@Index('idx_tenant_transfers_tenant', ['tenantId'])
@Index('idx_tenant_transfers_expires', ['expiresAt'])
export class TenantTransferEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 50, name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 36, name: 'from_owner_id' })
  fromOwnerId!: string;

  @Column({ type: 'varchar', length: 36, name: 'to_admin_id' })
  toAdminId!: string;

  @Index('idx_tenant_transfers_token', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  token!: string;

  @Column({ type: 'datetime', precision: 3, name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'completed_at' })
  completedAt?: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'declined_at' })
  declinedAt?: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'cancelled_at' })
  cancelledAt?: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'cancelled_by' })
  cancelledBy?: string | null;

  @CreateDateColumn({ name: 'created_at', precision: 3 })
  createdAt!: Date;
}
