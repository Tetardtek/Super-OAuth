import { RevokeTenantAdminUseCase } from '../../../../src/application/use-cases/platform/revoke-tenant-admin.use-case';

describe('RevokeTenantAdminUseCase', () => {
  let useCase: RevokeTenantAdminUseCase;
  let mockRepo: { findMembership: jest.Mock; remove: jest.Mock };

  beforeEach(() => {
    mockRepo = {
      findMembership: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useCase = new RevokeTenantAdminUseCase(mockRepo as any);
  });

  it('revokes an admin membership', async () => {
    mockRepo.findMembership.mockResolvedValue({ role: 'admin' });

    const result = await useCase.execute({
      tenantId: 'tenant-abc',
      targetPlatformUserId: 'admin-1',
    });

    expect(result.status).toBe('revoked');
    expect(mockRepo.remove).toHaveBeenCalledWith('admin-1', 'tenant-abc');
  });

  it('refuses to revoke the owner (invariant #1)', async () => {
    mockRepo.findMembership.mockResolvedValue({ role: 'owner' });

    const result = await useCase.execute({
      tenantId: 'tenant-abc',
      targetPlatformUserId: 'owner-1',
    });

    expect(result.status).toBe('cannot_revoke_owner');
    expect(mockRepo.remove).not.toHaveBeenCalled();
  });

  it('returns not_found when the user has no membership on the tenant (invariant #9)', async () => {
    mockRepo.findMembership.mockResolvedValue(null);

    const result = await useCase.execute({
      tenantId: 'tenant-abc',
      targetPlatformUserId: 'stranger',
    });

    expect(result.status).toBe('not_found');
    expect(mockRepo.remove).not.toHaveBeenCalled();
  });
});
