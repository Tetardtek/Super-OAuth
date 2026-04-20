import { IsNull, Repository } from 'typeorm';
import { DatabaseConnection } from '../config/database.config';
import { TenantInvitationEntity } from '../entities/tenant-invitation.entity';

export interface CreateInvitationInput {
  id: string;
  tokenHash: string;
  email: string;
  tenantId: string;
  invitedBy: string;
  expiresAt: Date;
}

/**
 * Access layer for tenant_invitations (SOA-002 P3).
 *
 * All `token` parameters here are SHA-256 hex hashes of the raw token — the raw
 * token is only ever sent in the invitation email, never persisted or queried.
 *
 * "Pending" = cancelled_at IS NULL AND used_at IS NULL AND expires_at > NOW().
 * The soft-delete columns (cancelled_at, cancelled_by) preserve the audit trail
 * even after an owner cancels an invitation.
 */
export class TenantInvitationRepository {
  private readonly repository: Repository<TenantInvitationEntity>;

  constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(TenantInvitationEntity);
  }

  async findPendingByEmailAndTenant(
    email: string,
    tenantId: string
  ): Promise<TenantInvitationEntity | null> {
    const row = await this.repository.findOne({
      where: {
        email: email.toLowerCase(),
        tenantId,
        cancelledAt: IsNull(),
        usedAt: IsNull(),
      },
    });
    return row ?? null;
  }

  async findByTokenHash(tokenHash: string): Promise<TenantInvitationEntity | null> {
    const row = await this.repository.findOne({ where: { token: tokenHash } });
    return row ?? null;
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<TenantInvitationEntity | null> {
    const row = await this.repository.findOne({ where: { id, tenantId } });
    return row ?? null;
  }

  async listPendingByTenant(tenantId: string): Promise<TenantInvitationEntity[]> {
    return this.repository.find({
      where: {
        tenantId,
        cancelledAt: IsNull(),
        usedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async create(input: CreateInvitationInput): Promise<TenantInvitationEntity> {
    const entity = this.repository.create({
      id: input.id,
      token: input.tokenHash,
      email: input.email.toLowerCase(),
      tenantId: input.tenantId,
      role: 'admin',
      invitedBy: input.invitedBy,
      expiresAt: input.expiresAt,
    });
    return this.repository.save(entity);
  }

  async resetToken(invitationId: string, newTokenHash: string, newExpiresAt: Date): Promise<void> {
    await this.repository.update(
      { id: invitationId },
      { token: newTokenHash, expiresAt: newExpiresAt }
    );
  }

  async cancel(invitationId: string, cancelledBy: string): Promise<void> {
    await this.repository.update(
      { id: invitationId },
      { cancelledAt: new Date(), cancelledBy }
    );
  }

  async markUsed(invitationId: string): Promise<void> {
    await this.repository.update({ id: invitationId }, { usedAt: new Date() });
  }
}
