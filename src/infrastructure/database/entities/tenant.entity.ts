import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { TenantProviderEntity } from './tenant-provider.entity';

@Entity('tenants')
@Index('uq_tenants_name', ['name'], { unique: true })
export class TenantEntity {
  @PrimaryColumn({ type: 'varchar', length: 36, name: 'client_id' })
  clientId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 64, name: 'client_secret_hash' })
  clientSecretHash!: string;

  @Column({ type: 'varchar', length: 64, name: 'client_secret_salt' })
  clientSecretSalt!: string;

  @Column({ type: 'text', name: 'jwt_secret_encrypted' })
  jwtSecretEncrypted!: string;

  @Column({ type: 'varchar', length: 32, name: 'jwt_secret_iv' })
  jwtSecretIv!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'webhook_url' })
  webhookUrl?: string | null;

  @Column({ type: 'json', nullable: true, name: 'allowed_origins' })
  allowedOrigins?: string[] | null;

  @Column({ type: 'int', default: 90, name: 'retention_days' })
  retentionDays!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany('TenantProviderEntity', 'tenant', { cascade: true })
  providers!: TenantProviderEntity[];
}
