import { InitiateOwnershipTransferUseCase } from '../../../../src/application/use-cases/platform/initiate-ownership-transfer.use-case';
import { PlatformUser } from '../../../../src/domain/entities/platform-user.entity';
import { Email } from '../../../../src/domain/value-objects/email.vo';
import { Password } from '../../../../src/domain/value-objects/password.vo';

describe('InitiateOwnershipTransferUseCase', () => {
  let useCase: InitiateOwnershipTransferUseCase;
  let mockUserRepo: { findByEmail: jest.Mock; findById: jest.Mock };
  let mockTransferRepo: { findActivePendingByTenant: jest.Mock; create: jest.Mock };
  let mockTenantAdminRepo: { findMembership: jest.Mock };
  let mockTenantRepo: { findByClientId: jest.Mock };
  let mockEmailService: {
    sendOwnershipTransferEmail: jest.Mock;
    sendOwnershipTransferNoticeEmail: jest.Mock;
  };

  const owner = PlatformUser.create(
    'owner-1',
    Email.create('owner@example.com'),
    Password.create('OwnerPass123!')
  );
  const target = PlatformUser.create(
    'target-1',
    Email.create('target@example.com'),
    Password.create('TargetPass123!')
  );

  const baseInput = {
    tenantId: 'tenant-abc',
    ownerPlatformUserId: 'owner-1',
    currentPassword: 'OwnerPass123!',
    targetPlatformUserId: 'target-1',
  };

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(async (id: string) => (id === 'owner-1' ? owner : id === 'target-1' ? target : null)),
    };
    mockTransferRepo = {
      findActivePendingByTenant: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
    };
    mockTenantAdminRepo = {
      findMembership: jest.fn().mockResolvedValue({ role: 'admin' }),
    };
    mockTenantRepo = {
      findByClientId: jest.fn().mockResolvedValue({ clientId: 'tenant-abc', name: 'Acme' }),
    };
    mockEmailService = {
      sendOwnershipTransferEmail: jest.fn().mockResolvedValue(undefined),
      sendOwnershipTransferNoticeEmail: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new InitiateOwnershipTransferUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUserRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTransferRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTenantAdminRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTenantRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEmailService as any
    );
  });

  it('returns tenant_not_found when tenant is missing', async () => {
    mockTenantRepo.findByClientId.mockResolvedValue(null);
    const result = await useCase.execute(baseInput);
    expect(result.status).toBe('tenant_not_found');
    expect(mockTransferRepo.create).not.toHaveBeenCalled();
  });

  it('returns invalid_credentials when owner password does not verify (invariant #7)', async () => {
    const result = await useCase.execute({ ...baseInput, currentPassword: 'WrongPass!' });
    expect(result.status).toBe('invalid_credentials');
    expect(mockTransferRepo.create).not.toHaveBeenCalled();
  });

  it('returns target_not_admin when target has no membership (invariant #8)', async () => {
    mockTenantAdminRepo.findMembership.mockResolvedValue(null);
    const result = await useCase.execute(baseInput);
    expect(result.status).toBe('target_not_admin');
  });

  it('returns target_not_admin when target has role=owner (invariant #8)', async () => {
    mockTenantAdminRepo.findMembership.mockResolvedValue({ role: 'owner' });
    const result = await useCase.execute(baseInput);
    expect(result.status).toBe('target_not_admin');
  });

  it('returns pending_transfer_exists when one already exists (1-max invariant)', async () => {
    mockTransferRepo.findActivePendingByTenant.mockResolvedValue({ id: 'existing' });
    const result = await useCase.execute(baseInput);
    expect(result.status).toBe('pending_transfer_exists');
    expect(mockTransferRepo.create).not.toHaveBeenCalled();
  });

  it('creates transfer, sends 2 emails, returns initiated + 7-day expiry', async () => {
    const before = Date.now();
    const result = await useCase.execute(baseInput);
    const after = Date.now();

    expect(result.status).toBe('initiated');
    if (result.status !== 'initiated') return;

    expect(mockTransferRepo.create).toHaveBeenCalledTimes(1);
    const createCall = mockTransferRepo.create.mock.calls[0][0];
    expect(createCall.tenantId).toBe('tenant-abc');
    expect(createCall.fromOwnerId).toBe('owner-1');
    expect(createCall.toAdminId).toBe('target-1');
    expect(createCall.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    const ttl = 7 * 24 * 3600_000;
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + ttl - 1000);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + ttl + 1000);

    expect(mockEmailService.sendOwnershipTransferEmail).toHaveBeenCalledWith(
      'target@example.com',
      expect.stringMatching(/^[a-f0-9]{64}$/),
      'Acme',
      'owner@example.com'
    );
    expect(mockEmailService.sendOwnershipTransferNoticeEmail).toHaveBeenCalledWith(
      'owner@example.com',
      'target@example.com',
      'Acme'
    );
  });
});
