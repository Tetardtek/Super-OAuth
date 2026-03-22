import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { UserEntity } from './user.entity';

/**
 * Email verification and merge tokens.
 *
 * Types:
 * - verification: sent on register, activates the account
 * - merge: sent when a provider login matches an existing email, links the provider
 */
@Entity('email_tokens')
@Index('idx_email_tokens_user', ['userId'])
@Index('idx_email_tokens_expires', ['expiresAt'])
export class EmailTokenEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  token!: string; // SHA-256 hash of raw token

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 36, name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: 'verification' | 'merge';

  // For merge tokens: the provider + providerId to link on confirmation
  @Column({ type: 'varchar', length: 50, nullable: true })
  provider?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_id' })
  providerId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_display_name' })
  providerDisplayName?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_email' })
  providerEmail?: string | null;

  // OAuth tokens to store for the merge (encrypted at rest via DB)
  @Column({ type: 'text', nullable: true, name: 'provider_metadata' })
  providerMetadata?: string | null; // JSON stringified

  @Column({ type: 'datetime', precision: 3, name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'used_at' })
  usedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
