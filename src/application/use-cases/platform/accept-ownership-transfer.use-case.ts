import crypto from 'crypto';
import { IPlatformUserRepository } from '../../../domain/repositories/platform-user.repository.interface';
import { TenantTransferRepository } from '../../../infrastructure/database/repositories/tenant-transfer.repository';
import { DatabaseConnection } from '../../../infrastructure/database/config/database.config';
import { TenantEntity } from '../../../infrastructure/database/entities/tenant.entity';
import { TenantAdminEntity } from '../../../infrastructure/database/entities/tenant-admin.entity';
import { TenantTransferEntity } from '../../../infrastructure/database/entities/tenant-transfer.entity';
import { PlatformTokenService } from '../../../infrastructure/services/platform-token.service';
import { PlatformSessionService } from '../../../infrastructure/services/platform-session.service';

export interface AcceptOwnershipTransferInput {
  rawToken: string;
  password: string;
  metadata?: { ipAddress?: string; userAgent?: string; deviceFingerprint?: string };
}

export type AcceptOwnershipTransferOutcome =
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
      tenant: { clientId: string; role: 'owner' };
    }
  | { status: 'invalid_token' }
  | { status: 'expired' }
  | { status: 'already_completed' }
  | { status: 'already_declined' }
  | { status: 'already_cancelled' }
  | { status: 'invalid_credentials' };

/**
 * Target accepts a pending ownership transfer (SOA-002 P4).
 *
 * Password re-auth required (consistent with P3 accept-invitation) — blocks
 * hijack if the email link leaks before the target's own session expires.
 *
 * The swap is performed in a single DB transaction :
 *   1. UPDATE tenants.owner_platform_user_id = target
 *   2. UPDATE tenant_admins : target role → owner, fromOwner role → admin
 *   3. UPDATE tenant_transfers.completed_at = NOW()
 *
 * Invariant #1 (exactly one owner per tenant) is preserved throughout because
 * the full swap is atomic — outside readers never see two owners or zero owners.
 *
 * On success, the target is auto-logged-in (fresh JWT + session), mirroring
 * the UX pattern of AcceptTenantInvitationUseCase.
 */
export class AcceptOwnershipTransferUseCase {
  constructor(
    private readonly userRepository: IPlatformUserRepository,
    private readonly transferRepo: TenantTransferRepository,
    private readonly tokenService: PlatformTokenService,
    private readonly sessionService: PlatformSessionService
  ) {}

  async execute(
    input: AcceptOwnershipTransferInput
  ): Promise<AcceptOwnershipTransferOutcome> {
    const tokenHash = crypto.createHash('sha256').update(input.rawToken).digest('hex');
    const transfer = await this.transferRepo.findByTokenHash(tokenHash);
    if (!transfer) return { status: 'invalid_token' };
    if (transfer.cancelledAt) return { status: 'already_cancelled' };
    if (transfer.declinedAt) return { status: 'already_declined' };
    if (transfer.completedAt) return { status: 'already_completed' };
    if (transfer.expiresAt.getTime() <= Date.now()) return { status: 'expired' };

    const target = await this.userRepository.findById(transfer.toAdminId);
    if (!target || !target.verifyPassword(input.password)) {
      return { status: 'invalid_credentials' };
    }

    const dataSource = DatabaseConnection.getInstance();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(
        TenantEntity,
        { clientId: transfer.tenantId },
        { ownerPlatformUserId: transfer.toAdminId }
      );

      await queryRunner.manager.update(
        TenantAdminEntity,
        { platformUserId: transfer.toAdminId, tenantId: transfer.tenantId },
        { role: 'owner' }
      );

      await queryRunner.manager.update(
        TenantAdminEntity,
        { platformUserId: transfer.fromOwnerId, tenantId: transfer.tenantId },
        { role: 'admin' }
      );

      await queryRunner.manager.update(
        TenantTransferEntity,
        { id: transfer.id },
        { completedAt: new Date() }
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }

    target.recordLogin();
    await this.userRepository.update(target);

    const accessToken = this.tokenService.generateAccessToken(target.id, target.role);
    const refreshToken = this.tokenService.generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.tokenService.getRefreshExpirationMs());
    await this.sessionService.create(target.id, refreshToken, expiresAt, input.metadata);

    return {
      status: 'accepted',
      accessToken,
      refreshToken,
      platformUser: {
        id: target.id,
        email: target.email.toString(),
        role: target.role,
        emailVerified: target.emailVerified,
      },
      tenant: { clientId: transfer.tenantId, role: 'owner' },
    };
  }
}
