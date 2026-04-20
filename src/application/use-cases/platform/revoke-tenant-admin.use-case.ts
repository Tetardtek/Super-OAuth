import { TenantAdminRepository } from '../../../infrastructure/database/repositories/tenant-admin.repository';

export interface RevokeTenantAdminInput {
  tenantId: string;
  targetPlatformUserId: string;
}

export type RevokeTenantAdminOutcome =
  | { status: 'revoked' }
  | { status: 'not_found' }
  | { status: 'cannot_revoke_owner' };

/**
 * Owner removes an admin from a tenant (SOA-002 P3).
 *
 * Invariant #1 : the owner role cannot be revoked through this flow —
 * ownership changes go through the transfer mechanism (P4). Attempting to
 * revoke the owner returns 'cannot_revoke_owner' (409 at the HTTP layer).
 *
 * Owner-only enforcement is the caller's responsibility (requireTenantOwner
 * middleware on the route).
 *
 * Once revoked, the ex-admin loses access immediately on next request
 * (middleware re-checks membership per request — no token invalidation needed).
 */
export class RevokeTenantAdminUseCase {
  constructor(private readonly tenantAdminRepo: TenantAdminRepository) {}

  async execute(input: RevokeTenantAdminInput): Promise<RevokeTenantAdminOutcome> {
    const membership = await this.tenantAdminRepo.findMembership(
      input.targetPlatformUserId,
      input.tenantId
    );
    if (!membership) return { status: 'not_found' };
    if (membership.role === 'owner') return { status: 'cannot_revoke_owner' };

    await this.tenantAdminRepo.remove(input.targetPlatformUserId, input.tenantId);
    return { status: 'revoked' };
  }
}
