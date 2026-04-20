import crypto from 'crypto';
import { AcceptOwnershipTransferUseCase } from '../../../../src/application/use-cases/platform/accept-ownership-transfer.use-case';
import { PlatformUser } from '../../../../src/domain/entities/platform-user.entity';
import { Email } from '../../../../src/domain/value-objects/email.vo';
import { Password } from '../../../../src/domain/value-objects/password.vo';
import { DatabaseConnection } from '../../../../src/infrastructure/database/config/database.config';

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

describe('AcceptOwnershipTransferUseCase', () => {
  let useCase: AcceptOwnershipTransferUseCase;
  let mockUserRepo: {
    findById: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findByEmail: jest.Mock;
    existsByEmail: jest.Mock;
    delete: jest.Mock;
  };
  let mockTransferRepo: { findByTokenHash: jest.Mock };
  let mockTokenService: {
    generateAccessToken: jest.Mock;
    generateRefreshToken: jest.Mock;
    getRefreshExpirationMs: jest.Mock;
  };
  let mockSessionService: { create: jest.Mock };
  let managerUpdate: jest.Mock;

  const RAW_TOKEN = 'a'.repeat(64);
  const TOKEN_HASH = hashToken(RAW_TOKEN);
  const target = PlatformUser.create(
    'target-1',
    Email.create('target@example.com'),
    Password.create('TargetPass123!')
  );

  function pending(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'tr-1',
      token: TOKEN_HASH,
      tenantId: 'tenant-abc',
      fromOwnerId: 'owner-1',
      toAdminId: 'target-1',
      expiresAt: new Date(Date.now() + 3600_000),
      completedAt: null,
      declinedAt: null,
      cancelledAt: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    mockUserRepo = {
      findById: jest.fn().mockResolvedValue(target),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      findByEmail: jest.fn(),
      existsByEmail: jest.fn(),
      delete: jest.fn(),
    };
    mockTransferRepo = { findByTokenHash: jest.fn().mockResolvedValue(pending()) };
    mockTokenService = {
      generateAccessToken: jest.fn().mockReturnValue('access-jwt'),
      generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
      getRefreshExpirationMs: jest.fn().mockReturnValue(30 * 24 * 3600_000),
    };
    mockSessionService = { create: jest.fn().mockResolvedValue(undefined) };

    managerUpdate = jest.fn().mockResolvedValue(undefined);
    const mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      isTransactionActive: false,
      isReleased: false,
      manager: { update: managerUpdate },
    };
    jest
      .spyOn(DatabaseConnection, 'getInstance')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ createQueryRunner: () => mockQueryRunner } as any);

    useCase = new AcceptOwnershipTransferUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUserRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTransferRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTokenService as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSessionService as any
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns invalid_token when token does not match', async () => {
    mockTransferRepo.findByTokenHash.mockResolvedValue(null);
    const r = await useCase.execute({ rawToken: RAW_TOKEN, password: 'TargetPass123!' });
    expect(r.status).toBe('invalid_token');
    expect(managerUpdate).not.toHaveBeenCalled();
  });

  it.each([
    ['expired', { expiresAt: new Date(Date.now() - 1000) }],
    ['already_completed', { completedAt: new Date() }],
    ['already_declined', { declinedAt: new Date() }],
    ['already_cancelled', { cancelledAt: new Date() }],
  ])('returns %s for matching lifecycle state', async (expected, overrides) => {
    mockTransferRepo.findByTokenHash.mockResolvedValue(pending(overrides));
    const r = await useCase.execute({ rawToken: RAW_TOKEN, password: 'TargetPass123!' });
    expect(r.status).toBe(expected);
    expect(managerUpdate).not.toHaveBeenCalled();
  });

  it('returns invalid_credentials when target password does not verify', async () => {
    const r = await useCase.execute({ rawToken: RAW_TOKEN, password: 'WrongPass!' });
    expect(r.status).toBe('invalid_credentials');
    expect(managerUpdate).not.toHaveBeenCalled();
  });

  it('performs atomic role swap and returns auto-login tokens', async () => {
    const r = await useCase.execute({ rawToken: RAW_TOKEN, password: 'TargetPass123!' });

    expect(r.status).toBe('accepted');
    if (r.status !== 'accepted') return;

    expect(r.tenant.clientId).toBe('tenant-abc');
    expect(r.tenant.role).toBe('owner');
    expect(r.accessToken).toBe('access-jwt');
    expect(r.refreshToken).toBe('refresh-token');

    // 4 updates: tenants.owner, admin->owner, from->admin, transfer.completed
    expect(managerUpdate).toHaveBeenCalledTimes(4);

    const calls = managerUpdate.mock.calls;
    // tenants update (ownerPlatformUserId = target)
    expect(calls[0][2]).toMatchObject({ ownerPlatformUserId: 'target-1' });
    // tenant_admins: target -> owner
    expect(calls[1][1]).toMatchObject({ platformUserId: 'target-1', tenantId: 'tenant-abc' });
    expect(calls[1][2]).toMatchObject({ role: 'owner' });
    // tenant_admins: fromOwner -> admin
    expect(calls[2][1]).toMatchObject({ platformUserId: 'owner-1', tenantId: 'tenant-abc' });
    expect(calls[2][2]).toMatchObject({ role: 'admin' });
    // transfer: completedAt set
    expect(calls[3][2]).toHaveProperty('completedAt');

    expect(mockSessionService.create).toHaveBeenCalledTimes(1);
  });
});
