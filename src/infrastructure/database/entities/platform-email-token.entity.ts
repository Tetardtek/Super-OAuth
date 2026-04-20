import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Platform-level email tokens (SOA-002 — distinct from tenant email_tokens).
 *
 * Types:
 * - verification  : sent on platform_users signup, activates the account
 * - password_reset: sent on password reset request
 *
 * FK to platform_users enforced at DB level (M6 migration, ON DELETE CASCADE).
 * Relation mapping to PlatformUserEntity will be added in P2 when the entity exists.
 */
@Entity('platform_email_tokens')
@Index('idx_platform_email_tokens_user', ['platformUserId'])
@Index('idx_platform_email_tokens_expires', ['expiresAt'])
@Index('idx_platform_email_tokens_type_user', ['type', 'platformUserId'])
export class PlatformEmailTokenEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  token!: string;

  @Column({ type: 'varchar', length: 36, name: 'platform_user_id' })
  platformUserId!: string;

  @Column({ type: 'enum', enum: ['verification', 'password_reset'] })
  type!: 'verification' | 'password_reset';

  @Column({ type: 'datetime', precision: 3, name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'used_at' })
  usedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', precision: 3 })
  createdAt!: Date;
}
