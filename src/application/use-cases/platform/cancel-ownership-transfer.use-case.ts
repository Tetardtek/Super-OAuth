import { TenantTransferRepository } from '../../../infrastructure/database/repositories/tenant-transfer.repository';

export interface CancelOwnershipTransferInput {
  tenantId: string;
  cancelledBy: string;
}

export type CancelOwnershipTransferOutcome =
  | { status: 'cancelled' }
  | { status: 'no_pending_transfer' };

/**
 * Owner cancels their active pending transfer (SOA-002 P4).
 *
 * Only one transfer can be pending per tenant (see findActivePendingByTenant
 * in the repository), so we resolve it directly from the tenantId instead of
 * requiring a transfer id in the URL — consistent with the single-point
 * DELETE /tenants/:clientId/transfer route shape.
 *
 * Owner-only enforcement is the caller's responsibility (requireTenantOwner
 * middleware on the route). The cancelledBy column is filled with the owner's
 * id for audit.
 */
export class CancelOwnershipTransferUseCase {
  constructor(private readonly transferRepo: TenantTransferRepository) {}

  async execute(
    input: CancelOwnershipTransferInput
  ): Promise<CancelOwnershipTransferOutcome> {
    const pending = await this.transferRepo.findActivePendingByTenant(input.tenantId);
    if (!pending) return { status: 'no_pending_transfer' };

    await this.transferRepo.markCancelled(pending.id, input.cancelledBy);
    return { status: 'cancelled' };
  }
}
