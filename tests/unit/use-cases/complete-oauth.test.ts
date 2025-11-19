import { CompleteOAuthUseCase } from '../../../src/application/use-cases/complete-oauth.use-case';
import {
  IUserRepository,
  ITokenService,
  ISessionRepository,
  IOAuthService,
} from '../../../src/application/interfaces/repositories.interface';
import { User } from '../../../src/domain/entities';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { Nickname } from '../../../src/domain/value-objects/nickname.vo';
import { Password } from '../../../src/domain/value-objects/password.vo';

describe('CompleteOAuthUseCase', () => {
  let useCase: CompleteOAuthUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockSessionRepository: jest.Mocked<ISessionRepository>;
  let mockOAuthService: jest.Mocked<IOAuthService>;
  let mockOAuthResult: {
    accessToken: string;
    refreshToken?: string;
    userInfo: { id: string; email?: string; nickname: string };
  };

  beforeEach(() => {
    // Mock repositories and services
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByProvider: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      getTokenExpiration: jest.fn().mockReturnValue({
        accessToken: 900000, // 15 min
        refreshToken: 604800000, // 7 days
      }),
    };

    mockSessionRepository = {
      create: jest.fn(),
      findByRefreshToken: jest.fn(),
      deleteByRefreshToken: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteExpired: jest.fn(),
    };

    mockOAuthService = {
      getAuthUrl: jest.fn(),
      exchangeCodeForTokens: jest.fn(),
    };

    // Mock OAuth result
    mockOAuthResult = {
      accessToken: 'oauth-access-token',
      refreshToken: 'oauth-refresh-token',
      userInfo: {
        id: 'google-user-123',
        email: 'oauth@example.com',
        nickname: 'oauthuser',
      },
    };

    useCase = new CompleteOAuthUseCase(
      mockUserRepository,
      mockTokenService,
      mockSessionRepository,
      mockOAuthService
    );
  });

  describe('Happy Path - Existing User Login', () => {
    it('should login existing OAuth user successfully', async () => {
      // Arrange
      const dto = {
        provider: 'google',
        code: 'auth-code-123',
        state: 'state-token',
      };

      // Create existing OAuth user
      const existingUser = User.reconstruct(
        'user-id-123',
        'oauth@example.com',
        'oauthuser',
        null, // OAuth user has no password
        true,
        true,
        new Date(),
        new Date(),
        null,
        0
      );

      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(mockOAuthResult);
      mockUserRepository.findByProvider.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue(existingUser);
      mockTokenService.generateAccessToken.mockReturnValue('jwt-access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('jwt-refresh-token');

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(mockOAuthService.exchangeCodeForTokens).toHaveBeenCalledWith('google', 'auth-code-123', 'state-token');
      expect(mockUserRepository.findByProvider).toHaveBeenCalledWith('google', 'google-user-123');
      expect(mockUserRepository.save).toHaveBeenCalledWith(existingUser);
      expect(result.accessToken).toBe('jwt-access-token');
      expect(result.refreshToken).toBe('jwt-refresh-token');
      expect(result.user.email).toBe('oauth@example.com');
    });

    it('should update login statistics for existing user', async () => {
      // Arrange
      const dto = {
        provider: 'github',
        code: 'code-123',
        state: 'state-123',
      };

      const existingUser = User.reconstruct(
        'user-id',
        'user@example.com',
        'existinguser',
        null,
        true,
        true,
        new Date(),
        new Date(),
        null,
        0
      );

      const initialLoginCount = existingUser.loginCount;

      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(mockOAuthResult);
      mockUserRepository.findByProvider.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue(existingUser);
      mockTokenService.generateAccessToken.mockReturnValue('access');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh');

      // Act
      await useCase.execute(dto);

      // Assert
      expect(existingUser.lastLogin).toBeInstanceOf(Date);
      expect(existingUser.loginCount).toBe(initialLoginCount + 1);
      expect(mockUserRepository.save).toHaveBeenCalledWith(existingUser);
    });
  });

  describe('Happy Path - New User Registration', () => {
    it('should create new user if not exists', async () => {
      // Arrange
      const dto = {
        provider: 'google',
        code: 'auth-code-new',
        state: 'state-new',
      };

      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(mockOAuthResult);
      mockUserRepository.findByProvider.mockResolvedValue(null); // User doesn't exist
      mockUserRepository.findByEmail.mockResolvedValue(null); // Email not taken
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
      mockTokenService.generateAccessToken.mockReturnValue('new-access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('new-refresh-token');

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(mockUserRepository.save).toHaveBeenCalled();
      const savedUser = (mockUserRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedUser).toBeInstanceOf(User);
      expect(savedUser.nickname.toString()).toBe('oauthuser');
      expect(result.accessToken).toBe('new-access-token');
      expect(result.user.nickname).toBe('oauthuser');
    });

    it('should create user with limited email from OAuth provider', async () => {
      // Arrange
      const dto = {
        provider: 'discord',
        code: 'code-123',
        state: 'state-123',
      };

      const oauthResultLimitedEmail = {
        ...mockOAuthResult,
        userInfo: {
          id: 'discord-user-123',
          email: 'discord@example.com',
          nickname: 'discorduser',
        },
      };

      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(oauthResultLimitedEmail);
      mockUserRepository.findByProvider.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
      mockTokenService.generateAccessToken.mockReturnValue('access');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh');

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result.user.email).toBe('discord@example.com');
      expect(result.user.nickname).toBe('discorduser');
    });
  });

  describe('Happy Path - Link Provider to Existing Email', () => {
    it('should link OAuth provider to existing user with same email', async () => {
      // Arrange
      const dto = {
        provider: 'google',
        code: 'code-link',
        state: 'state-link',
      };

      // Create existing user with email/password
      const email = Email.create('oauth@example.com');
      const nickname = Nickname.create('existinguser');
      const password = Password.create('Test123!@#');
      const existingUser = User.createWithEmail('550e8400-e29b-41d4-a716-446655440000', email, nickname, password);

      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(mockOAuthResult);
      mockUserRepository.findByProvider.mockResolvedValue(null); // No OAuth user
      mockUserRepository.findByEmail.mockResolvedValue(existingUser); // But email exists
      mockUserRepository.save.mockResolvedValue(existingUser);
      mockTokenService.generateAccessToken.mockReturnValue('access');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh');

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('oauth@example.com');
      expect(existingUser.linkedProviders).toContain('google');
      expect(mockUserRepository.save).toHaveBeenCalledWith(existingUser);
      expect(result.user.linkedProviders).toContain('google');
    });
  });

  describe('Error Cases - Account Status', () => {
    it('should throw error if existing OAuth user is inactive', async () => {
      // Arrange
      const dto = {
        provider: 'google',
        code: 'code-123',
        state: 'state-123',
      };

      const inactiveUser = User.reconstruct(
        'user-id',
        'oauth@example.com',
        'oauthuser',
        null,
        true,
        false, // Inactive
        new Date(),
        new Date(),
        null,
        0
      );

      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(mockOAuthResult);
      mockUserRepository.findByProvider.mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Account is deactivated');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockSessionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Error Cases - OAuth Flow', () => {
    it('should throw error if OAuth code exchange fails', async () => {
      // Arrange
      const dto = {
        provider: 'google',
        code: 'invalid-code',
        state: 'state-123',
      };

      mockOAuthService.exchangeCodeForTokens.mockRejectedValue(
        new Error('Invalid authorization code')
      );

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Invalid authorization code');
      expect(mockUserRepository.findByProvider).not.toHaveBeenCalled();
    });

    it('should throw error if OAuth state mismatch', async () => {
      // Arrange
      const dto = {
        provider: 'google',
        code: 'code-123',
        state: 'wrong-state',
      };

      mockOAuthService.exchangeCodeForTokens.mockRejectedValue(new Error('State mismatch'));

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('State mismatch');
    });
  });

  describe('Token Generation and Session', () => {
    it('should create session with correct expiration', async () => {
      // Arrange
      const dto = {
        provider: 'google',
        code: 'code-123',
        state: 'state-123',
      };

      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(mockOAuthResult);
      mockUserRepository.findByProvider.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
      mockTokenService.generateAccessToken.mockReturnValue('access');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh');

      // Act
      await useCase.execute(dto);

      // Assert
      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.any(String),
        'refresh',
        expect.any(Date)
      );

      const createCall = (mockSessionRepository.create as jest.Mock).mock.calls[0];
      const expiresAt = createCall[2] as Date;
      const expectedExpiration = Date.now() + 604800000; // 7 days

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiration - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiration + 1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle OAuth provider with no refresh token', async () => {
      // Arrange
      const dto = {
        provider: 'github',
        code: 'code-123',
        state: 'state-123',
      };

      const oauthResultNoRefresh = {
        accessToken: 'oauth-access-only',
        userInfo: mockOAuthResult.userInfo,
        // No refreshToken
      };

      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(oauthResultNoRefresh);
      mockUserRepository.findByProvider.mockResolvedValue(null);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
      mockTokenService.generateAccessToken.mockReturnValue('access');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh');

      // Act
      const result = await useCase.execute(dto);

      // Assert - Should still work, our JWT tokens are independent
      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
    });

    it('should handle multiple OAuth providers for same user', async () => {
      // Arrange
      const dto = {
        provider: 'github',
        code: 'code-123',
        state: 'state-123',
      };

      // User already has Google linked, now linking GitHub
      const email = Email.create('multi@example.com');
      const nickname = Nickname.create('multiuser');
      const password = Password.create('Test123!@#');
      const existingUser = User.createWithEmail('660e8400-e29b-41d4-a716-446655440000', email, nickname, password);

      const githubOAuthResult = {
        ...mockOAuthResult,
        userInfo: {
          id: 'github-user-123',
          email: 'multi@example.com',
          nickname: 'multiuser',
        },
      };

      mockOAuthService.exchangeCodeForTokens.mockResolvedValue(githubOAuthResult);
      mockUserRepository.findByProvider.mockResolvedValue(null); // GitHub not linked yet
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue(existingUser);
      mockTokenService.generateAccessToken.mockReturnValue('access');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh');

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(existingUser.linkedProviders).toContain('github');
      expect(result.user.linkedProviders).toContain('github');
    });
  });
});
