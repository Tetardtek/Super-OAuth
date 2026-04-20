import crypto from 'crypto';
import { TenantTransferRepository } from '../../../infrastructure/database/repositories/tenant-transfer.repository';

export interface DeclineOwnershipTransferInput {
  rawToken: string;
}

export type DeclineOwnershipTransferOutcome =
  | { status: 'declined' }
  | { status: 'invalid_token' }
  | { status: 'expired' }
  | { status: 'already_completed' }
  | { status: 'already_declined' }
  | { status: 'already_cancelled' };

/**
 * Target declines a pending ownership transfer (SOA-002 P4).
 *
 * Public route — no password required. The impact of an unauthorized decline
 * is low (the owner simply re-initiates) compared to accept (which changes
 * roles), so the UX of a one-click "décliner" from the email is acceptable.
 * Invalid-token response covers missing tokens uniformly — no leak of past
 * transfer existence.
 */
export class DeclineOwnershipTransferUseCase {
  constructor(private readonly transferRepo: TenantTransferRepository) {}

  async execute(
    input: DeclineOwnershipTransferInput
  ): Promise<DeclineOwnershipTransferOutcome> {
    const tokenHash = crypto.createHash('sha256').update(input.rawToken).digest('hex');
    const transfer = await this.transferRepo.findByTokenHash(tokenHash);
    if (!transfer) return { status: 'invalid_token' };
    if (transfer.cancelledAt) return { status: 'already_cancelled' };
    if (transfer.declinedAt) return { status: 'already_declined' };
    if (transfer.completedAt) return { status: 'already_completed' };
    if (transfer.expiresAt.getTime() <= Date.now()) return { status: 'expired' };

    await this.transferRepo.markDeclined(transfer.id);
    return { status: 'declined' };
  }
}
