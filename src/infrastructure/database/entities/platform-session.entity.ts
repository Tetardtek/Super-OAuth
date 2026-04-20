import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Platform-level refresh token sessions (SOA-002).
 *
 * Distinct from tenant `sessions` — JWT audience='platform' enforces isolation
 * at middleware level (invariant #10 in SOA-002 tests).
 *
 * Security upgrade vs tenant sessions: stores SHA-256 hash of refresh token,
 * never the raw token. Also uses `revoked_at` (nullable DATETIME) instead of
 * boolean `is_active` for audit trail.
 */
@Entity('platform_sessions')
@Index('idx_platform_sessions_token', ['refreshTokenHash'], { unique: true })
@Index('idx_platform_sessions_user', ['platformUserId'])
@Index('idx_platform_sessions_expires', ['expiresAt'])
export class PlatformSessionEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'platform_user_id' })
  platformUserId!: string;

  @Column({ type: 'varchar', length: 64, name: 'refresh_token_hash' })
  refreshTokenHash!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'user_agent' })
  userAgent?: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'device_fingerprint' })
  deviceFingerprint?: string | null;

  @Column({ type: 'datetime', precision: 3, name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'revoked_at' })
  revokedAt?: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'last_used_at' })
  lastUsedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', precision: 3 })
  createdAt!: Date;
}
