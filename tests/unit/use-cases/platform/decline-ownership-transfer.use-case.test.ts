import crypto from 'crypto';
import { DeclineOwnershipTransferUseCase } from '../../../../src/application/use-cases/platform/decline-ownership-transfer.use-case';

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

describe('DeclineOwnershipTransferUseCase', () => {
  let useCase: DeclineOwnershipTransferUseCase;
  let mockRepo: { findByTokenHash: jest.Mock; markDeclined: jest.Mock };
  const RAW_TOKEN = 'd'.repeat(64);
  const TOKEN_HASH = hashToken(RAW_TOKEN);

  function pending(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'tr-1',
      token: TOKEN_HASH,
      expiresAt: new Date(Date.now() + 3600_000),
      completedAt: null,
      declinedAt: null,
      cancelledAt: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    mockRepo = {
      findByTokenHash: jest.fn().mockResolvedValue(pending()),
      markDeclined: jest.fn().mockResolvedValue(undefined),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useCase = new DeclineOwnershipTransferUseCase(mockRepo as any);
  });

  it('declines a pending transfer', async () => {
    const r = await useCase.execute({ rawToken: RAW_TOKEN });
    expect(r.status).toBe('declined');
    expect(mockRepo.markDeclined).toHaveBeenCalledWith('tr-1');
  });

  it('returns invalid_token when no match', async () => {
    mockRepo.findByTokenHash.mockResolvedValue(null);
    const r = await useCase.execute({ rawToken: RAW_TOKEN });
    expect(r.status).toBe('invalid_token');
  });

  it.each([
    ['expired', { expiresAt: new Date(Date.now() - 1000) }],
    ['already_completed', { completedAt: new Date() }],
    ['already_declined', { declinedAt: new Date() }],
    ['already_cancelled', { cancelledAt: new Date() }],
  ])('returns %s for matching lifecycle state', async (expected, overrides) => {
    mockRepo.findByTokenHash.mockResolvedValue(pending(overrides));
    const r = await useCase.execute({ rawToken: RAW_TOKEN });
    expect(r.status).toBe(expected);
    expect(mockRepo.markDeclined).not.toHaveBeenCalled();
  });
});
