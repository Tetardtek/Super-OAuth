import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { TenantEntity } from './tenant.entity';

@Entity('authorization_codes')
export class AuthorizationCodeEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 36, name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 36, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ type: 'varchar', length: 500, name: 'redirect_uri' })
  redirectUri!: string;

  @Column({ type: 'varchar', length: 128, name: 'code_challenge' })
  codeChallenge!: string;

  @Column({ type: 'varchar', length: 10, name: 'code_challenge_method', default: 'S256' })
  codeChallengeMethod!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  scope?: string | null;

  @Column({ type: 'datetime', precision: 3, name: 'expires_at' })
  expiresAt!: Date;

  @Column({ type: 'datetime', precision: 3, nullable: true, name: 'used_at' })
  usedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne('TenantEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id', referencedColumnName: 'clientId' })
  tenant!: TenantEntity;
}
