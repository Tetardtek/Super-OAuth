import { LoginPlatformUserUseCase } from '../../../../src/application/use-cases/platform/login-platform-user.use-case';
import { PlatformUser } from '../../../../src/domain/entities/platform-user.entity';
import { Email } from '../../../../src/domain/value-objects/email.vo';
import { Password } from '../../../../src/domain/value-objects/password.vo';

describe('LoginPlatformUserUseCase', () => {
  let useCase: LoginPlatformUserUseCase;
  let mockRepo: { findByEmail: jest.Mock; update: jest.Mock };
  let mockTokenService: {
    generateAccessToken: jest.Mock;
    generateRefreshToken: jest.Mock;
    getRefreshExpirationMs: jest.Mock;
  };
  let mockSessionService: { create: jest.Mock };

  const buildVerifiedUser = () => {
    const user = PlatformUser.create(
      'u-1',
      Email.create('owner@example.com'),
      Password.create('StrongPass1!')
    );
    user.verifyEmail();
    return user;
  };

  beforeEach(() => {
    mockRepo = {
      findByEmail: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    mockTokenService = {
      generateAccessToken: jest.fn().mockReturnValue('access-jwt'),
      generateRefreshToken: jest.fn().mockReturnValue('refresh-jwt'),
      getRefreshExpirationMs: jest.fn().mockReturnValue(7 * 86_400_000),
    };
    mockSessionService = {
      create: jest.fn().mockResolvedValue({ id: 's-1' }),
    };

    useCase = new LoginPlatformUserUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTokenService as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSessionService as any
    );
  });

  it('returns invalid_credentials when the user does not exist', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);
    const result = await useCase.execute({ email: 'ghost@x.com', password: 'StrongPass1!' });
    expect(result.status).toBe('invalid_credentials');
    expect(mockSessionService.create).not.toHaveBeenCalled();
  });

  it('returns invalid_credentials on wrong password', async () => {
    mockRepo.findByEmail.mockResolvedValue(buildVerifiedUser());
    const result = await useCase.execute({ email: 'owner@example.com', password: 'WrongPass1!' });
    expect(result.status).toBe('invalid_credentials');
  });

  it('returns email_not_verified when the account has not been verified yet', async () => {
    const user = PlatformUser.create(
      'u-2',
      Email.create('new@example.com'),
      Password.create('StrongPass1!')
    );
    mockRepo.findByEmail.mockResolvedValue(user);

    const result = await useCase.execute({ email: 'new@example.com', password: 'StrongPass1!' });
    expect(result.status).toBe('email_not_verified');
    expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
  });

  it('returns requires_password_reset when the user has no password set (seed user)', async () => {
    const seedUser = PlatformUser.reconstruct(
      'u-3',
      'seed@example.com',
      null,
      'suadmin',
      true,
      null,
      new Date(),
      new Date()
    );
    mockRepo.findByEmail.mockResolvedValue(seedUser);

    const result = await useCase.execute({ email: 'seed@example.com', password: 'anything' });
    expect(result.status).toBe('requires_password_reset');
  });

  it('issues tokens and persists a session on success', async () => {
    const user = buildVerifiedUser();
    mockRepo.findByEmail.mockResolvedValue(user);

    const result = await useCase.execute({
      email: 'owner@example.com',
      password: 'StrongPass1!',
      metadata: { ipAddress: '1.2.3.4' },
    });

    expect(result.status).toBe('ok');
    expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith('u-1', 'client');
    expect(mockSessionService.create).toHaveBeenCalledWith(
      'u-1',
      'refresh-jwt',
      expect.any(Date),
      { ipAddress: '1.2.3.4' }
    );
    expect(mockRepo.update).toHaveBeenCalledWith(user);
    expect(user.lastLoginAt).toBeInstanceOf(Date);
  });
});
