import { CancelTenantInvitationUseCase } from '../../../../src/application/use-cases/platform/cancel-tenant-invitation.use-case';

describe('CancelTenantInvitationUseCase', () => {
  let useCase: CancelTenantInvitationUseCase;
  let mockRepo: { findByIdAndTenant: jest.Mock; cancel: jest.Mock };

  function invitation(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'inv-1',
      tenantId: 'tenant-abc',
      usedAt: null,
      cancelledAt: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    mockRepo = {
      findByIdAndTenant: jest.fn().mockResolvedValue(invitation()),
      cancel: jest.fn().mockResolvedValue(undefined),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useCase = new CancelTenantInvitationUseCase(mockRepo as any);
  });

  it('cancels a pending invitation with cancelled_by set', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-abc',
      invitationId: 'inv-1',
      cancelledBy: 'owner-1',
    });

    expect(result.status).toBe('cancelled');
    expect(mockRepo.cancel).toHaveBeenCalledWith('inv-1', 'owner-1');
  });

  it('returns not_found when the invitation belongs to another tenant (invariant #9)', async () => {
    mockRepo.findByIdAndTenant.mockResolvedValue(null);

    const result = await useCase.execute({
      tenantId: 'tenant-B',
      invitationId: 'inv-from-A',
      cancelledBy: 'owner-B',
    });

    expect(result.status).toBe('not_found');
    expect(mockRepo.cancel).not.toHaveBeenCalled();
  });

  it('returns already_used when invitation was consumed', async () => {
    mockRepo.findByIdAndTenant.mockResolvedValue(invitation({ usedAt: new Date() }));

    const result = await useCase.execute({
      tenantId: 'tenant-abc',
      invitationId: 'inv-1',
      cancelledBy: 'owner-1',
    });

    expect(result.status).toBe('already_used');
    expect(mockRepo.cancel).not.toHaveBeenCalled();
  });

  it('returns already_cancelled when invitation was previously cancelled', async () => {
    mockRepo.findByIdAndTenant.mockResolvedValue(invitation({ cancelledAt: new Date() }));

    const result = await useCase.execute({
      tenantId: 'tenant-abc',
      invitationId: 'inv-1',
      cancelledBy: 'owner-1',
    });

    expect(result.status).toBe('already_cancelled');
    expect(mockRepo.cancel).not.toHaveBeenCalled();
  });
});
