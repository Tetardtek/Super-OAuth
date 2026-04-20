import { CancelOwnershipTransferUseCase } from '../../../../src/application/use-cases/platform/cancel-ownership-transfer.use-case';

describe('CancelOwnershipTransferUseCase', () => {
  let useCase: CancelOwnershipTransferUseCase;
  let mockRepo: { findActivePendingByTenant: jest.Mock; markCancelled: jest.Mock };

  beforeEach(() => {
    mockRepo = {
      findActivePendingByTenant: jest.fn(),
      markCancelled: jest.fn().mockResolvedValue(undefined),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useCase = new CancelOwnershipTransferUseCase(mockRepo as any);
  });

  it('cancels the active pending transfer with audit trail', async () => {
    mockRepo.findActivePendingByTenant.mockResolvedValue({ id: 'tr-1' });
    const r = await useCase.execute({ tenantId: 't-1', cancelledBy: 'owner-1' });
    expect(r.status).toBe('cancelled');
    expect(mockRepo.markCancelled).toHaveBeenCalledWith('tr-1', 'owner-1');
  });

  it('returns no_pending_transfer when nothing active', async () => {
    mockRepo.findActivePendingByTenant.mockResolvedValue(null);
    const r = await useCase.execute({ tenantId: 't-1', cancelledBy: 'owner-1' });
    expect(r.status).toBe('no_pending_transfer');
    expect(mockRepo.markCancelled).not.toHaveBeenCalled();
  });
});
