import crypto from 'crypto';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { DatabaseConnection } from '../database/config/database.config';
import { AuditLogEntity, AuditEvent } from '../database/entities/audit-log.entity';

export interface AuditLogEntry {
  tenantId: string;
  userId?: string | null;
  event: AuditEvent;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditQueryOptions {
  page?: number;
  limit?: number;
  event?: AuditEvent;
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export class AuditLogService {
  private repository: Repository<AuditLogEntity>;

  constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(AuditLogEntity);
  }

  async log(entry: AuditLogEntry): Promise<void> {
    const entity = this.repository.create({
      id: crypto.randomUUID(),
      tenantId: entry.tenantId,
      userId: entry.userId ?? null,
      event: entry.event,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      metadata: entry.metadata ?? null,
    });
    await this.repository.save(entity);
  }

  async query(tenantId: string, opts: AuditQueryOptions = {}): Promise<{
    data: AuditLogEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<AuditLogEntity> = { tenantId };

    if (opts.event) where.event = opts.event;
    if (opts.userId) where.userId = opts.userId;
    if (opts.fromDate && opts.toDate) {
      where.createdAt = Between(opts.fromDate, opts.toDate);
    }

    const [data, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /**
   * Purge old logs beyond retention period.
   * Called by a scheduled job (not yet implemented — Tier 4).
   */
  async purgeExpired(tenantId: string, retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('tenant_id = :tenantId AND created_at < :cutoff', { tenantId, cutoff })
      .execute();

    return result.affected ?? 0;
  }
}
