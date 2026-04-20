import { InviteTenantAdminUseCase } from '../../../../src/application/use-cases/platform/invite-tenant-admin.use-case';
import { PlatformUser } from '../../../../src/domain/entities/platform-user.entity';
import { Email } from '../../../../src/domain/value-objects/email.vo';
import { Password } from '../../../../src/domain/value-objects/password.vo';

describe('InviteTenantAdminUseCase', () => {
  let useCase: InviteTenantAdminUseCase;
  let mockPlatformUserRepo: { findByEmail: jest.Mock; findById: jest.Mock };
  let mockInvitationRepo: {
    findPendingByEmailAndTenant: jest.Mock;
    create: jest.Mock;
    resetToken: jest.Mock;
  };
  let mockTenantAdminRepo: { findMembership: jest.Mock };
  let mockTenantRepo: { findByClientId: jest.Mock };
  let mockEmailService: { sendAdminInvitationEmail: jest.Mock };

  const baseInput = {
    tenantId: 'tenant-abc',
    inviterPlatformUserId: 'owner-1',
    inviterEmail: 'owner@example.com',
    email: 'NewAdmin@Example.com',
  };

  beforeEach(() => {
    mockPlatformUserRepo = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
    };
    mockInvitationRepo = {
      findPendingByEmailAndTenant: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
      resetToken: jest.fn().mockResolvedValue(undefined),
    };
    mockTenantAdminRepo = { findMembership: jest.fn().mockResolvedValue(null) };
    mockTenantRepo = {
      findByClientId: jest.fn().mockResolvedValue({
        clientId: 'tenant-abc',
        name: 'Acme Corp',
      }),
    };
    mockEmailService = { sendAdminInvitationEmail: jest.fn().mockResolvedValue(undefined) };

    useCase = new InviteTenantAdminUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPlatformUserRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockInvitationRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTenantAdminRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTenantRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEmailService as any
    );
  });

  it('returns tenant_not_found when the tenant does not exist', async () => {
    mockTenantRepo.findByClientId.mockResolvedValue(null);

    const result = await useCase.execute(baseInput);

    expect(result.status).toBe('tenant_not_found');
    expect(mockInvitationRepo.create).not.toHaveBeenCalled();
    expect(mockEmailService.sendAdminInvitationEmail).not.toHaveBeenCalled();
  });

  it('returns already_member when the email already has a membership on the tenant', async () => {
    mockPlatformUserRepo.findByEmail.mockResolvedValue(
      PlatformUser.create('u-2', Email.create('newadmin@example.com'), Password.create('StrongPass1!'))
    );
    mockTenantAdminRepo.findMembership.mockResolvedValue({ role: 'admin' });

    const result = await useCase.execute(baseInput);

    expect(result.status).toBe('already_member');
    expect(mockInvitationRepo.create).not.toHaveBeenCalled();
  });

  it('creates a new invitation and sends the email when no pending row exists', async () => {
    const result = await useCase.execute(baseInput);

    expect(result.status).toBe('invited');
    expect(mockInvitationRepo.create).toHaveBeenCalledTimes(1);
    expect(mockInvitationRepo.resetToken).not.toHaveBeenCalled();

    const createCall = mockInvitationRepo.create.mock.calls[0][0];
    expect(createCall.email).toBe('newadmin@example.com'); // lowercase
    expect(createCall.tenantId).toBe('tenant-abc');
    expect(createCall.invitedBy).toBe('owner-1');
    expect(createCall.tokenHash).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex

    expect(mockEmailService.sendAdminInvitationEmail).toHaveBeenCalledWith(
      'newadmin@example.com',
      expect.stringMatching(/^[a-f0-9]{64}$/), // raw token hex
      'Acme Corp',
      'owner@example.com'
    );
  });

  it('resets the token on existing pending row (invariant #5 — idempotent invite)', async () => {
    mockInvitationRepo.findPendingByEmailAndTenant.mockResolvedValue({
      id: 'inv-existing',
      email: 'newadmin@example.com',
      tenantId: 'tenant-abc',
    });

    const result = await useCase.execute(baseInput);

    expect(result.status).toBe('resent');
    expect(mockInvitationRepo.create).not.toHaveBeenCalled();
    expect(mockInvitationRepo.resetToken).toHaveBeenCalledTimes(1);

    const resetCall = mockInvitationRepo.resetToken.mock.calls[0];
    expect(resetCall[0]).toBe('inv-existing');
    expect(resetCall[1]).toMatch(/^[a-f0-9]{64}$/); // new token hash
    expect(resetCall[2]).toBeInstanceOf(Date); // new expiry

    expect(mockEmailService.sendAdminInvitationEmail).toHaveBeenCalledTimes(1);
  });

  it('sets expiry to ~7 days from now', async () => {
    const before = Date.now();
    const result = await useCase.execute(baseInput);
    const after = Date.now();

    expect(result.status).toBe('invited');
    if (result.status !== 'invited') return;

    const expires = result.expiresAt.getTime();
    const expectedMin = before + 7 * 24 * 3600_000 - 1000;
    const expectedMax = after + 7 * 24 * 3600_000 + 1000;
    expect(expires).toBeGreaterThanOrEqual(expectedMin);
    expect(expires).toBeLessThanOrEqual(expectedMax);
  });
});
