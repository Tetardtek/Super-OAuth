import crypto from 'crypto';
import { AcceptTenantInvitationUseCase } from '../../../../src/application/use-cases/platform/accept-tenant-invitation.use-case';
import { PlatformUser } from '../../../../src/domain/entities/platform-user.entity';
import { Email } from '../../../../src/domain/value-objects/email.vo';
import { Password } from '../../../../src/domain/value-objects/password.vo';

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

describe('AcceptTenantInvitationUseCase', () => {
  let useCase: AcceptTenantInvitationUseCase;
  let mockUserRepo: {
    findByEmail: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findById: jest.Mock;
    existsByEmail: jest.Mock;
    delete: jest.Mock;
  };
  let mockInvitationRepo: { findByTokenHash: jest.Mock; markUsed: jest.Mock };
  let mockTenantAdminRepo: { create: jest.Mock };
  let mockTokenService: {
    generateAccessToken: jest.Mock;
    generateRefreshToken: jest.Mock;
    getRefreshExpirationMs: jest.Mock;
  };
  let mockSessionService: { create: jest.Mock };

  const RAW_TOKEN = 'a'.repeat(64);
  const TOKEN_HASH = hashToken(RAW_TOKEN);

  function pendingInvitation(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'inv-1',
      token: TOKEN_HASH,
      email: 'invited@example.com',
      tenantId: 'tenant-abc',
      role: 'admin',
      invitedBy: 'owner-1',
      expiresAt: new Date(Date.now() + 3600_000),
      usedAt: null,
      cancelledAt: null,
      cancelledBy: null,
      createdAt: new Date(),
      ...overrides,
    };
  }

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      existsByEmail: jest.fn(),
      delete: jest.fn(),
    };
    mockInvitationRepo = {
      findByTokenHash: jest.fn().mockResolvedValue(pendingInvitation()),
      markUsed: jest.fn().mockResolvedValue(undefined),
    };
    mockTenantAdminRepo = { create: jest.fn().mockResolvedValue(undefined) };
    mockTokenService = {
      generateAccessToken: jest.fn().mockReturnValue('access-jwt'),
      generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
      getRefreshExpirationMs: jest.fn().mockReturnValue(30 * 24 * 3600_000),
    };
    mockSessionService = { create: jest.fn().mockResolvedValue(undefined) };

    useCase = new AcceptTenantInvitationUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUserRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockInvitationRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTenantAdminRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTokenService as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSessionService as any
    );
  });

  it('returns invalid_token when the hash matches no invitation', async () => {
    mockInvitationRepo.findByTokenHash.mockResolvedValue(null);

    const result = await useCase.execute({ rawToken: RAW_TOKEN, password: 'StrongPass1!' });

    expect(result.status).toBe('invalid_token');
    expect(mockTenantAdminRepo.create).not.toHaveBeenCalled();
  });

  it('returns invalid_token for a cancelled invitation (no enumeration leak)', async () => {
    mockInvitationRepo.findByTokenHash.mockResolvedValue(
      pendingInvitation({ cancelledAt: new Date(), cancelledBy: 'owner-1' })
    );

    const result = await useCase.execute({ rawToken: RAW_TOKEN, password: 'StrongPass1!' });

    expect(result.status).toBe('invalid_token');
  });

  it('returns already_used when the invitation was consumed', async () => {
    mockInvitationRepo.findByTokenHash.mockResolvedValue(
      pendingInvitation({ usedAt: new Date() })
    );

    const result = await useCase.execute({ rawToken: RAW_TOKEN, password: 'StrongPass1!' });

    expect(result.status).toBe('already_used');
  });

  it('returns expired when expires_at is in the past', async () => {
    mockInvitationRepo.findByTokenHash.mockResolvedValue(
      pendingInvitation({ expiresAt: new Date(Date.now() - 1000) })
    );

    const result = await useCase.execute({ rawToken: RAW_TOKEN, password: 'StrongPass1!' });

    expect(result.status).toBe('expired');
  });

  it('creates a new platform_user with emailVerified=true (invariant #6 — new user flow)', async () => {
    const result = await useCase.execute({ rawToken: RAW_TOKEN, password: 'StrongPass1!' });

    expect(result.status).toBe('accepted');
    expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
    const saved: PlatformUser = mockUserRepo.save.mock.calls[0][0];
    expect(saved.emailVerified).toBe(true);
    expect(saved.email.toString()).toBe('invited@example.com');

    expect(mockTenantAdminRepo.create).toHaveBeenCalledWith({
      platformUserId: saved.id,
      tenantId: 'tenant-abc',
      role: 'admin',
      invitedBy: 'owner-1',
    });
    expect(mockInvitationRepo.markUsed).toHaveBeenCalledWith('inv-1');
  });

  it('flips emailVerified=true for an existing unverified user (invariant #6 — existing user flow)', async () => {
    const existing = PlatformUser.create(
      'u-existing',
      Email.create('invited@example.com'),
      Password.create('StrongPass1!')
    );
    expect(existing.emailVerified).toBe(false); // precondition
    mockUserRepo.findByEmail.mockResolvedValue(existing);

    const result = await useCase.execute({ rawToken: RAW_TOKEN, password: 'StrongPass1!' });

    expect(result.status).toBe('accepted');
    expect(mockUserRepo.update).toHaveBeenCalledTimes(1);
    const updated: PlatformUser = mockUserRepo.update.mock.calls[0][0];
    expect(updated.emailVerified).toBe(true);
    expect(mockUserRepo.save).not.toHaveBeenCalled();
  });

  it('returns invalid_credentials when existing user password does not verify', async () => {
    const existing = PlatformUser.create(
      'u-existing',
      Email.create('invited@example.com'),
      Password.create('StrongPass1!')
    );
    mockUserRepo.findByEmail.mockResolvedValue(existing);

    const result = await useCase.execute({ rawToken: RAW_TOKEN, password: 'WrongPass!' });

    expect(result.status).toBe('invalid_credentials');
    expect(mockTenantAdminRepo.create).not.toHaveBeenCalled();
    expect(mockInvitationRepo.markUsed).not.toHaveBeenCalled();
  });
});
