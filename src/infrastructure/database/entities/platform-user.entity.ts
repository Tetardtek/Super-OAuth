import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Platform-level user (SOA-002 — SUAdmin + client owners).
 *
 * Distinct from tenant `users` table : no tenantId, email unique globally,
 * password_hash nullable (forces password reset flow for seeded users).
 *
 * Minimal mapping for P1 shared services. Full domain entity + use cases
 * will be built in P2 (Backend platform).
 */
@Entity('platform_users')
@Index('idx_platform_users_email', ['email'], { unique: true })
@Index('idx_platform_users_role', ['role'])
export class PlatformUserEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 60, nullable: true, name: 'password_hash' })
  passwordHash?: string | null;

  @Column({ type: 'enum', enum: ['suadmin', 'client'], default: 'client' })
  role!: 'suadmin' | 'client';

  @Column({ type: 'tinyint', width: 1, default: 0, name: 'email_verified' })
  emailVerified!: number;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'last_login_at' })
  lastLoginAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', precision: 3 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', precision: 3 })
  updatedAt!: Date;
}
