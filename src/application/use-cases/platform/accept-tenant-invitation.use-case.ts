import crypto, { randomUUID } from 'crypto';
import { PlatformUser } from '../../../domain/entities/platform-user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Password } from '../../../domain/value-objects/password.vo';
import { IPlatformUserRepository } from '../../../domain/repositories/platform-user.repository.interface';
import { TenantInvitationRepository } from '../../../infrastructure/database/repositories/tenant-invitation.repository';
import { TenantAdminRepository } from '../../../infrastructure/database/repositories/tenant-admin.repository';
import { PlatformTokenService } from '../../../infrastructure/services/platform-token.service';
import { PlatformSessionService } from '../../../infrastructure/services/platform-session.service';

export interface AcceptTenantInvitationInput {
  rawToken: string;
  password: string;
  metadata?: { ipAddress?: string; userAgent?: string; deviceFingerprint?: string };
}

export type AcceptTenantInvitationOutcome =
  | {
      status: 'accepted';
      accessToken: string;
      refreshToken: string;
      platformUser: {
        id: string;
        email: string;
        role: 'suadmin' | 'client';
        emailVerified: boolean;
      };
      tenant: { clientId: string; role: 'admin' };
    }
  | { status: 'invalid_token' }
  | { status: 'expired' }
  | { status: 'already_used' }
  | { status: 'invalid_credentials' };

/**
 * Accepts a tenant admin invitation (SOA-002 P3).
 *
 * Flow :
 * 1. Hash raw token (SHA-256) → lookup invitation
 * 2. Validate : not cancelled, not used, not expired
 * 3. Branch on existing platform_user with matching email :
 *    - exists  → password must verify (anti-hijack if the email link leaks)
 *    - new     → create PlatformUser with emailVerified=true (invariant #6)
 * 4. For existing user with emailVerified=false → flip to true (invariant #6)
 *    The invitation click proves email ownership.
 * 5. Create tenant_admins(admin) + mark invitation used + auto-login (JWT + session)
 *
 * On invalid_token : indistinguishable response whether the token never existed
 * or was cancelled — avoids leaking existence of past invitations to attackers.
 */
export class AcceptTenantInvitationUseCase {
  constructor(
    private readonly userRepository: IPlatformUserRepository,
    private readonly invitationRepo: TenantInvitationRepository,
    private readonly tenantAdminRepo: TenantAdminRepository,
    private readonly tokenService: PlatformTokenService,
    private readonly sessionService: PlatformSessionService
  ) {}

  async execute(input: AcceptTenantInvitationInput): Promise<AcceptTenantInvitationOutcome> {
    const tokenHash = crypto.createHash('sha256').update(input.rawToken).digest('hex');
    const invitation = await this.invitationRepo.findByTokenHash(tokenHash);

    if (!invitation || invitation.cancelledAt) return { status: 'invalid_token' };
    if (invitation.usedAt) return { status: 'already_used' };
    if (invitation.expiresAt.getTime() <= Date.now()) return { status: 'expired' };

    const email = invitation.email.toLowerCase();
    let user = await this.userRepository.findByEmail(email);

    if (user) {
      if (user.requiresPasswordReset() || !user.verifyPassword(input.password)) {
        return { status: 'invalid_credentials' };
      }
      if (!user.emailVerified) {
        user.verifyEmail();
      }
      user.recordLogin();
      await this.userRepository.update(user);
    } else {
      const emailVo = Email.create(email);
      const passwordVo = Password.create(input.password);
      user = PlatformUser.create(randomUUID(), emailVo, passwordVo);
      user.verifyEmail();
      user.recordLogin();
      await this.userRepository.save(user);
    }

    await this.tenantAdminRepo.create({
      platformUserId: user.id,
      tenantId: invitation.tenantId,
      role: 'admin',
      invitedBy: invitation.invitedBy,
    });

    await this.invitationRepo.markUsed(invitation.id);

    const accessToken = this.tokenService.generateAccessToken(user.id, user.role);
    const refreshToken = this.tokenService.generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.tokenService.getRefreshExpirationMs());
    await this.sessionService.create(user.id, refreshToken, expiresAt, input.metadata);

    return {
      status: 'accepted',
      accessToken,
      refreshToken,
      platformUser: {
        id: user.id,
        email: user.email.toString(),
        role: user.role,
        emailVerified: user.emailVerified,
      },
      tenant: { clientId: invitation.tenantId, role: 'admin' },
    };
  }
}
