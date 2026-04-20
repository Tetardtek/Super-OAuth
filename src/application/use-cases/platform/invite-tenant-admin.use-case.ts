import crypto from 'crypto';
import { IPlatformUserRepository } from '../../../domain/repositories/platform-user.repository.interface';
import { TenantInvitationRepository } from '../../../infrastructure/database/repositories/tenant-invitation.repository';
import { TenantAdminRepository } from '../../../infrastructure/database/repositories/tenant-admin.repository';
import { TenantRepository } from '../../../infrastructure/services/tenant.repository';
import { EmailService } from '../../../infrastructure/email/email.service';

const INVITATION_TTL_DAYS = 7;
const INVITATION_TTL_MS = INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface InviteTenantAdminInput {
  tenantId: string;
  inviterPlatformUserId: string;
  inviterEmail: string;
  email: string;
}

export type InviteTenantAdminOutcome =
  | { status: 'invited' | 'resent'; expiresAt: Date }
  | { status: 'already_member' }
  | { status: 'tenant_not_found' };

/**
 * Owner invites a new admin by email (SOA-002 P3).
 *
 * Invariants :
 * - #5 Idempotent : re-invite on same (email, tenant) resets the token + expiry
 *   on the existing row, invalidating the previous email link. Collapses
 *   duplicate-invite and resend into one action.
 * - Already-member check spans both owner and admin roles — owners cannot
 *   invite themselves, admins cannot be "re-invited" to their own tenant.
 * - Raw token is sent by email ONLY; DB stores SHA-256 hex — a stolen DB
 *   dump cannot be used to accept invitations.
 *
 * TTL fixed to 7 days (aligned with ADR SOA-002 transfer flow).
 *
 * NOTE: tier gate (admin count vs plan limit) is deferred to SOA-004
 * (tier gate license JWT chantier). Invitations are unlimited in P3.
 */
export class InviteTenantAdminUseCase {
  constructor(
    private readonly platformUserRepo: IPlatformUserRepository,
    private readonly invitationRepo: TenantInvitationRepository,
    private readonly tenantAdminRepo: TenantAdminRepository,
    private readonly tenantRepo: TenantRepository,
    private readonly emailService: EmailService
  ) {}

  async execute(input: InviteTenantAdminInput): Promise<InviteTenantAdminOutcome> {
    const tenant = await this.tenantRepo.findByClientId(input.tenantId);
    if (!tenant) return { status: 'tenant_not_found' };

    const email = input.email.trim().toLowerCase();

    const existingUser = await this.platformUserRepo.findByEmail(email);
    if (existingUser) {
      const membership = await this.tenantAdminRepo.findMembership(
        existingUser.id,
        input.tenantId
      );
      if (membership) return { status: 'already_member' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const pending = await this.invitationRepo.findPendingByEmailAndTenant(email, input.tenantId);
    let outcome: 'invited' | 'resent';
    if (pending) {
      await this.invitationRepo.resetToken(pending.id, tokenHash, expiresAt);
      outcome = 'resent';
    } else {
      await this.invitationRepo.create({
        id: crypto.randomUUID(),
        tokenHash,
        email,
        tenantId: input.tenantId,
        invitedBy: input.inviterPlatformUserId,
        expiresAt,
      });
      outcome = 'invited';
    }

    await this.emailService.sendAdminInvitationEmail(
      email,
      rawToken,
      tenant.name,
      input.inviterEmail
    );

    return { status: outcome, expiresAt };
  }
}
