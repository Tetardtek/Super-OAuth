import { TenantInvitationRepository } from '../../../infrastructure/database/repositories/tenant-invitation.repository';

export interface CancelTenantInvitationInput {
  tenantId: string;
  invitationId: string;
  cancelledBy: string;
}

export type CancelTenantInvitationOutcome =
  | { status: 'cancelled' }
  | { status: 'not_found' }
  | { status: 'already_used' }
  | { status: 'already_cancelled' };

/**
 * Owner soft-deletes a pending invitation (SOA-002 P3).
 *
 * Soft delete preserves the audit trail : cancelled_at + cancelled_by remain
 * queryable for future investigation. The invitation row stays but is no
 * longer "pending" (the email link it produced becomes dead on next lookup).
 *
 * Cross-tenant isolation : the invitation must belong to the provided tenant,
 * otherwise 'not_found' — an owner of tenant A cannot cancel tenant B's
 * invitations even if they guess the ID.
 *
 * Owner-only enforcement is the caller's responsibility (requireTenantOwner
 * middleware on the route).
 */
export class CancelTenantInvitationUseCase {
  constructor(private readonly invitationRepo: TenantInvitationRepository) {}

  async execute(input: CancelTenantInvitationInput): Promise<CancelTenantInvitationOutcome> {
    const invitation = await this.invitationRepo.findByIdAndTenant(
      input.invitationId,
      input.tenantId
    );
    if (!invitation) return { status: 'not_found' };
    if (invitation.usedAt) return { status: 'already_used' };
    if (invitation.cancelledAt) return { status: 'already_cancelled' };

    await this.invitationRepo.cancel(input.invitationId, input.cancelledBy);
    return { status: 'cancelled' };
  }
}
