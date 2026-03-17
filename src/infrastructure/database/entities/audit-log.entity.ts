import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type AuditEvent =
  | 'login'
  | 'register'
  | 'link'
  | 'unlink'
  | 'merge'
  | 'password_reset'
  | 'token_refresh';

@Entity('audit_logs')
@Index('idx_audit_tenant_date', ['tenantId', 'createdAt'])
@Index('idx_audit_tenant_user', ['tenantId', 'userId'])
export class AuditLogEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'tenant_id' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'user_id' })
  userId?: string | null;

  @Column({ type: 'varchar', length: 50 })
  event!: AuditEvent;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'user_agent' })
  userAgent?: string | null;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
