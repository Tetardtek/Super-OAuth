import { RefreshTokenUseCase } from '../../../src/application/use-cases/refresh-token.use-case';
import {
  IUserRepository,
  ITokenService,
  ISessionRepository,
} from '../../../src/application/interfaces/repositories.interface';
import { User } from '../../../src/domain/entities';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { Nickname } from '../../../src/domain/value-objects/nickname.vo';
import { Password } from '../../../src/domain/value-objects/password.vo';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockSessionRepository: jest.Mocked<ISessionRepository>;
  let mockUser: User;
  let validSession: { userId: string; expiresAt: Date };

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

    // Create mock user
    const email = Email.create('test@example.com');
    const nickname = Nickname.create('testuser');
    const password = Password.create('Test123!@#');
    mockUser = User.createWithEmail('user-id-123', email, nickname, password);

    // Create valid session
    validSession = {
      userId: 'user-id-123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };

    useCase = new RefreshTokenUseCase(
      mockUserRepository,
      mockTokenService,
      mockSessionRepository
    );
  });

  describe('Happy Path', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Arrange
      const dto = {
        refreshToken: 'valid-refresh-token',
      };

      mockSessionRepository.findByRefreshToken.mockResolvedValue(validSession);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken.mockReturnValue('new-access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('new-refresh-token');
      mockSessionRepository.deleteByRefreshToken.mockResolvedValue(undefined);
      mockSessionRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(mockSessionRepository.findByRefreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-id-123');
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith('user-id-123');
      expect(mockTokenService.generateRefreshToken).toHaveBeenCalled();
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe('user-id-123');
    });

    it('should rotate refresh token (delete old, create new)', async () => {
      // Arrange
      const dto = {
        refreshToken: 'old-refresh-token',
      };

      mockSessionRepository.findByRefreshToken.mockResolvedValue(validSession);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('new-refresh-token');

      // Act
      await useCase.execute(dto);

      // Assert
      expect(mockSessionRepository.deleteByRefreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        'user-id-123',
        'new-refresh-token',
        expect.any(Date)
      );

      // Verify new session has correct expiration
      const createCall = (mockSessionRepository.create as jest.Mock).mock.calls[0];
      const expiresAt = createCall[2] as Date;
      const expectedExpiration = Date.now() + 604800000; // 7 days

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiration - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiration + 1000);
    });

    it('should return user data in response', async () => {
      // Arrange
      const dto = {
        refreshToken: 'valid-refresh-token',
      };

      mockSessionRepository.findByRefreshToken.mockResolvedValue(validSession);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result.user).toEqual({
        id: 'user-id-123',
        email: 'test@example.com',
        nickname: 'testuser',
        emailVerified: false,
        isActive: true,
        linkedProviders: [],
        createdAt: expect.any(Date),
        lastLogin: null,
        loginCount: 0,
      });
    });
  });

  describe('Error Cases - Invalid Token', () => {
    it('should throw error if refresh token not found', async () => {
      // Arrange
      const dto = {
        refreshToken: 'non-existent-token',
      };

      mockSessionRepository.findByRefreshToken.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Invalid refresh token');
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockSessionRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error and cleanup if refresh token expired', async () => {
      // Arrange
      const dto = {
        refreshToken: 'expired-token',
      };

      const expiredSession = {
        userId: 'user-id-123',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      };

      mockSessionRepository.findByRefreshToken.mockResolvedValue(expiredSession);
      mockSessionRepository.deleteByRefreshToken.mockResolvedValue(undefined);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Refresh token has expired');
      expect(mockSessionRepository.deleteByRefreshToken).toHaveBeenCalledWith('expired-token');
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('Error Cases - User Validation', () => {
    it('should throw error and cleanup if user not found', async () => {
      // Arrange
      const dto = {
        refreshToken: 'orphaned-token',
      };

      mockSessionRepository.findByRefreshToken.mockResolvedValue(validSession);
      mockUserRepository.findById.mockResolvedValue(null);
      mockSessionRepository.deleteByRefreshToken.mockResolvedValue(undefined);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('User not found');
      expect(mockSessionRepository.deleteByRefreshToken).toHaveBeenCalledWith('orphaned-token');
      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('should throw error and cleanup all sessions if user inactive', async () => {
      // Arrange
      const dto = {
        refreshToken: 'valid-token',
      };

      // Deactivate user
      mockUser.deactivate('Account suspended');

      mockSessionRepository.findByRefreshToken.mockResolvedValue(validSession);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockSessionRepository.deleteByUserId.mockResolvedValue(undefined);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Account is deactivated');
      expect(mockSessionRepository.deleteByUserId).toHaveBeenCalledWith('user-id-123');
      expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with null email', async () => {
      // Arrange
      const dto = {
        refreshToken: 'valid-token',
      };

      // Create user with null email
      const userWithNullEmail = User.reconstruct(
        'user-id',
        null,
        'testuser',
        Password.create('Test123!@#').hash(),
        false,
        true,
        new Date(),
        new Date(),
        null,
        0
      );

      mockSessionRepository.findByRefreshToken.mockResolvedValue(validSession);
      mockUserRepository.findById.mockResolvedValue(userWithNullEmail);
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result.user.email).toBeNull();
      expect(result.user.nickname).toBe('testuser');
    });

    it('should handle session expiring exactly at current time', async () => {
      // Arrange
      const dto = {
        refreshToken: 'token-expiring-now',
      };

      const sessionExpiringNow = {
        userId: 'user-id-123',
        expiresAt: new Date(Date.now() - 1), // Just expired
      };

      mockSessionRepository.findByRefreshToken.mockResolvedValue(sessionExpiringNow);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Refresh token has expired');
      expect(mockSessionRepository.deleteByRefreshToken).toHaveBeenCalled();
    });
  });

  describe('Security Features', () => {
    it('should clean up expired tokens automatically', async () => {
      // Arrange
      const dto = {
        refreshToken: 'expired-token',
      };

      const expiredSession = {
        userId: 'user-id-123',
        expiresAt: new Date(Date.now() - 10000),
      };

      mockSessionRepository.findByRefreshToken.mockResolvedValue(expiredSession);

      // Act
      try {
        await useCase.execute(dto);
      } catch (error) {
        // Expected to throw
      }

      // Assert - Verify cleanup was called
      expect(mockSessionRepository.deleteByRefreshToken).toHaveBeenCalledWith('expired-token');
    });

    it('should clean up orphaned sessions (user deleted)', async () => {
      // Arrange
      const dto = {
        refreshToken: 'orphaned-token',
      };

      mockSessionRepository.findByRefreshToken.mockResolvedValue(validSession);
      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      try {
        await useCase.execute(dto);
      } catch (error) {
        // Expected to throw
      }

      // Assert - Verify orphaned session cleanup
      expect(mockSessionRepository.deleteByRefreshToken).toHaveBeenCalledWith('orphaned-token');
    });

    it('should clean up all user sessions when user deactivated', async () => {
      // Arrange
      const dto = {
        refreshToken: 'valid-token',
      };

      mockUser.deactivate('Security breach');

      mockSessionRepository.findByRefreshToken.mockResolvedValue(validSession);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      try {
        await useCase.execute(dto);
      } catch (error) {
        // Expected to throw
      }

      // Assert - Verify all sessions cleaned up
      expect(mockSessionRepository.deleteByUserId).toHaveBeenCalledWith('user-id-123');
    });
  });
});
