import crypto from 'crypto';
import { IPlatformUserRepository } from '../../../domain/repositories/platform-user.repository.interface';
import { TenantTransferRepository } from '../../../infrastructure/database/repositories/tenant-transfer.repository';
import { TenantAdminRepository } from '../../../infrastructure/database/repositories/tenant-admin.repository';
import { TenantRepository } from '../../../infrastructure/services/tenant.repository';
import { EmailService } from '../../../infrastructure/email/email.service';

const TRANSFER_TTL_DAYS = 7;
const TRANSFER_TTL_MS = TRANSFER_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface InitiateOwnershipTransferInput {
  tenantId: string;
  ownerPlatformUserId: string;
  currentPassword: string;
  targetPlatformUserId: string;
}

export type InitiateOwnershipTransferOutcome =
  | { status: 'initiated'; expiresAt: Date }
  | { status: 'invalid_credentials' }
  | { status: 'target_not_admin' }
  | { status: 'pending_transfer_exists' }
  | { status: 'tenant_not_found' };

/**
 * Owner initiates a tenant ownership transfer (SOA-002 P4).
 *
 * Invariants enforced :
 * - #7 Password re-auth required — invalid_credentials if the owner's current
 *   password does not verify. Protects against session hijack + accidental
 *   initiation from an authenticated but abandoned session.
 * - #8 Target must be an existing admin of the tenant — target_not_admin
 *   otherwise. Restrictive pattern blocks typo/phishing (ADR SOA-002
 *   "Transfer permissif rejected" rationale).
 * - 1 pending transfer max per tenant (pending_transfer_exists). Avoids
 *   race conditions where two pending transfers compete.
 *
 * Owner-only enforcement is the caller's responsibility (requireTenantOwner
 * middleware on the route).
 *
 * Emits two emails : target (with raw token + CTA) and owner (audit trail).
 */
export class InitiateOwnershipTransferUseCase {
  constructor(
    private readonly platformUserRepo: IPlatformUserRepository,
    private readonly transferRepo: TenantTransferRepository,
    private readonly tenantAdminRepo: TenantAdminRepository,
    private readonly tenantRepo: TenantRepository,
    private readonly emailService: EmailService
  ) {}

  async execute(
    input: InitiateOwnershipTransferInput
  ): Promise<InitiateOwnershipTransferOutcome> {
    const tenant = await this.tenantRepo.findByClientId(input.tenantId);
    if (!tenant) return { status: 'tenant_not_found' };

    const owner = await this.platformUserRepo.findById(input.ownerPlatformUserId);
    if (!owner || !owner.verifyPassword(input.currentPassword)) {
      return { status: 'invalid_credentials' };
    }

    const targetMembership = await this.tenantAdminRepo.findMembership(
      input.targetPlatformUserId,
      input.tenantId
    );
    if (!targetMembership || targetMembership.role !== 'admin') {
      return { status: 'target_not_admin' };
    }

    const pending = await this.transferRepo.findActivePendingByTenant(input.tenantId);
    if (pending) return { status: 'pending_transfer_exists' };

    const target = await this.platformUserRepo.findById(input.targetPlatformUserId);
    if (!target) return { status: 'target_not_admin' };

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + TRANSFER_TTL_MS);

    await this.transferRepo.create({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      fromOwnerId: input.ownerPlatformUserId,
      toAdminId: input.targetPlatformUserId,
      tokenHash,
      expiresAt,
    });

    await this.emailService.sendOwnershipTransferEmail(
      target.email.toString(),
      rawToken,
      tenant.name,
      owner.email.toString()
    );
    await this.emailService.sendOwnershipTransferNoticeEmail(
      owner.email.toString(),
      target.email.toString(),
      tenant.name
    );

    return { status: 'initiated', expiresAt };
  }
}
