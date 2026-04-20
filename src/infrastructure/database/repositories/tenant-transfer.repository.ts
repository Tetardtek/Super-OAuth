import { IsNull, MoreThan, Repository } from 'typeorm';
import { DatabaseConnection } from '../config/database.config';
import { TenantTransferEntity } from '../entities/tenant-transfer.entity';

export interface CreateTransferInput {
  id: string;
  tenantId: string;
  fromOwnerId: string;
  toAdminId: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Access layer for tenant_transfers (SOA-002 P4).
 *
 * Token hashed SHA-256 — raw token only in the target's email.
 * "Active pending" = no terminal state set AND not expired. One per tenant max
 * (invariant enforced at use-case layer using findActivePendingByTenant).
 */
export class TenantTransferRepository {
  private readonly repository: Repository<TenantTransferEntity>;

  constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(TenantTransferEntity);
  }

  async findActivePendingByTenant(tenantId: string): Promise<TenantTransferEntity | null> {
    const row = await this.repository.findOne({
      where: {
        tenantId,
        completedAt: IsNull(),
        declinedAt: IsNull(),
        cancelledAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
    return row ?? null;
  }

  async findByTokenHash(tokenHash: string): Promise<TenantTransferEntity | null> {
    const row = await this.repository.findOne({ where: { token: tokenHash } });
    return row ?? null;
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<TenantTransferEntity | null> {
    const row = await this.repository.findOne({ where: { id, tenantId } });
    return row ?? null;
  }

  async create(input: CreateTransferInput): Promise<TenantTransferEntity> {
    const entity = this.repository.create({
      id: input.id,
      tenantId: input.tenantId,
      fromOwnerId: input.fromOwnerId,
      toAdminId: input.toAdminId,
      token: input.tokenHash,
      expiresAt: input.expiresAt,
    });
    return this.repository.save(entity);
  }

  async markCompleted(id: string): Promise<void> {
    await this.repository.update({ id }, { completedAt: new Date() });
  }

  async markDeclined(id: string): Promise<void> {
    await this.repository.update({ id }, { declinedAt: new Date() });
  }

  async markCancelled(id: string, cancelledBy: string): Promise<void> {
    await this.repository.update({ id }, { cancelledAt: new Date(), cancelledBy });
  }
}
