import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type WebhookEvent = 'user.created' | 'user.linked' | 'user.merged';
export type WebhookStatus = 'pending' | 'delivered' | 'failed';

@Entity('webhook_deliveries')
@Index('idx_webhook_tenant_event', ['tenantId', 'event'])
@Index('idx_webhook_status', ['status'])
export class WebhookDeliveryEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 50 })
  event!: WebhookEvent;

  @Column({ type: 'varchar', length: 500, name: 'target_url' })
  targetUrl!: string;

  @Column({ type: 'json' })
  payload!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: WebhookStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_attempt_at' })
  lastAttemptAt!: Date | null;

  @Column({ type: 'text', nullable: true, name: 'last_error' })
  lastError!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
