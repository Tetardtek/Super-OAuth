import { RefreshPlatformSessionUseCase } from '../../../../src/application/use-cases/platform/refresh-platform-session.use-case';
import { PlatformUser } from '../../../../src/domain/entities/platform-user.entity';
import { Email } from '../../../../src/domain/value-objects/email.vo';
import { Password } from '../../../../src/domain/value-objects/password.vo';

describe('RefreshPlatformSessionUseCase', () => {
  let useCase: RefreshPlatformSessionUseCase;
  let mockRepo: { findById: jest.Mock };
  let mockTokenService: {
    verifyRefreshToken: jest.Mock;
    generateAccessToken: jest.Mock;
    generateRefreshToken: jest.Mock;
    getRefreshExpirationMs: jest.Mock;
  };
  let mockSessionService: {
    findByRefreshToken: jest.Mock;
    revokeByRefreshToken: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(() => {
    mockRepo = { findById: jest.fn() };
    mockTokenService = {
      verifyRefreshToken: jest.fn(),
      generateAccessToken: jest.fn().mockReturnValue('new-access'),
      generateRefreshToken: jest.fn().mockReturnValue('new-refresh'),
      getRefreshExpirationMs: jest.fn().mockReturnValue(7 * 86_400_000),
    };
    mockSessionService = {
      findByRefreshToken: jest.fn(),
      revokeByRefreshToken: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new RefreshPlatformSessionUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTokenService as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSessionService as any
    );
  });

  it('returns invalid_refresh_token when JWT verification fails', async () => {
    mockTokenService.verifyRefreshToken.mockReturnValue(null);
    const result = await useCase.execute({ refreshToken: 'bad' });
    expect(result.status).toBe('invalid_refresh_token');
    expect(mockSessionService.findByRefreshToken).not.toHaveBeenCalled();
  });

  it('returns invalid_refresh_token when DB session is missing (revoked or unknown)', async () => {
    mockTokenService.verifyRefreshToken.mockReturnValue({ jti: 'j1' });
    mockSessionService.findByRefreshToken.mockResolvedValue(null);
    const result = await useCase.execute({ refreshToken: 'raw' });
    expect(result.status).toBe('invalid_refresh_token');
    expect(mockSessionService.revokeByRefreshToken).not.toHaveBeenCalled();
  });

  it('returns invalid_refresh_token when the platform user no longer exists', async () => {
    mockTokenService.verifyRefreshToken.mockReturnValue({ jti: 'j1' });
    mockSessionService.findByRefreshToken.mockResolvedValue({
      id: 's1',
      platformUserId: 'ghost',
      expiresAt: new Date(),
    });
    mockRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute({ refreshToken: 'raw' });
    expect(result.status).toBe('invalid_refresh_token');
  });

  it('rotates the session and returns a new token pair on success', async () => {
    const user = PlatformUser.create(
      'u-1',
      Email.create('owner@example.com'),
      Password.create('StrongPass1!')
    );
    user.verifyEmail();

    mockTokenService.verifyRefreshToken.mockReturnValue({ jti: 'j1' });
    mockSessionService.findByRefreshToken.mockResolvedValue({
      id: 's1',
      platformUserId: 'u-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockRepo.findById.mockResolvedValue(user);

    const result = await useCase.execute({ refreshToken: 'raw' });

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
    }
    expect(mockSessionService.revokeByRefreshToken).toHaveBeenCalledWith('raw');
    expect(mockSessionService.create).toHaveBeenCalledWith(
      'u-1',
      'new-refresh',
      expect.any(Date),
      undefined
    );
  });
});
