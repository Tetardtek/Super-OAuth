import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { TenantEntity } from './tenant.entity';

@Entity('tenant_providers')
@Index('uq_tenant_provider', ['tenantId', 'provider'], { unique: true })
export class TenantProviderEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  @Column({ type: 'varchar', length: 255, name: 'client_id' })
  clientId!: string;

  @Column({ type: 'text', name: 'client_secret_encrypted' })
  clientSecretEncrypted!: string;

  @Column({ type: 'varchar', length: 32, name: 'client_secret_iv' })
  clientSecretIv!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne('TenantEntity', 'providers', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id', referencedColumnName: 'client_id' })
  tenant!: TenantEntity;
}
