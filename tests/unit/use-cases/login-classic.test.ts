import { LoginClassicUseCase } from '../../../src/application/use-cases/login-classic.use-case';
import {
  IUserRepository,
  ITokenService,
  ISessionRepository,
} from '../../../src/application/interfaces/repositories.interface';
import { User } from '../../../src/domain/entities';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { Nickname } from '../../../src/domain/value-objects/nickname.vo';
import { Password } from '../../../src/domain/value-objects/password.vo';

describe('LoginClassicUseCase', () => {
  let useCase: LoginClassicUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockSessionRepository: jest.Mocked<ISessionRepository>;
  let mockUser: User;

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

    // Create a mock user with all necessary methods
    const email = Email.create('test@example.com');
    const nickname = Nickname.create('testuser');
    const password = Password.create('Test123!@#');

    mockUser = User.createWithEmail('user-id-123', email, nickname, password);

    useCase = new LoginClassicUseCase(
      mockUserRepository,
      mockTokenService,
      mockSessionRepository
    );
  });

  describe('Happy Path', () => {
    it('should login user successfully with valid credentials', async () => {
      // Arrange
      const dto = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken.mockReturnValue('mock-access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('mock-refresh-token');
      mockSessionRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith('user-id-123');
      expect(mockTokenService.generateRefreshToken).toHaveBeenCalled();
      expect(mockSessionRepository.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.nickname).toBe('testuser');
    });

    it('should update last login time and login count', async () => {
      // Arrange
      const dto = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const initialLoginCount = mockUser.loginCount;

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken.mockReturnValue('mock-access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('mock-refresh-token');

      // Act
      await useCase.execute(dto);

      // Assert
      expect(mockUser.lastLogin).toBeInstanceOf(Date);
      expect(mockUser.loginCount).toBe(initialLoginCount + 1);
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('should create session with correct expiration', async () => {
      // Arrange
      const dto = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');

      // Act
      await useCase.execute(dto);

      // Assert
      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        'user-id-123',
        'refresh-token',
        expect.any(Date)
      );

      const sessionCreateCall = (mockSessionRepository.create as jest.Mock).mock.calls[0];
      const expiresAt = sessionCreateCall[2] as Date;
      const expectedExpiration = Date.now() + 604800000; // 7 days

      // Allow 1 second tolerance for test execution time
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiration - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiration + 1000);
    });
  });

  describe('Error Cases - Invalid Credentials', () => {
    it('should throw error if user not found', async () => {
      // Arrange
      const dto = {
        email: 'nonexistent@example.com',
        password: 'Test123!@#',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Invalid credentials');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockSessionRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if password is incorrect', async () => {
      // Arrange
      const dto = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Invalid credentials');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockSessionRepository.create).not.toHaveBeenCalled();
    });

    it('should throw generic error to prevent user enumeration', async () => {
      // Arrange
      const dtoUserNotFound = {
        email: 'nonexistent@example.com',
        password: 'Test123!@#',
      };

      const dtoWrongPassword = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      mockUserRepository.findByEmail.mockResolvedValueOnce(null); // User not found
      mockUserRepository.findByEmail.mockResolvedValueOnce(mockUser); // User found

      // Act & Assert - Same error message for both cases
      await expect(useCase.execute(dtoUserNotFound)).rejects.toThrow('Invalid credentials');
      await expect(useCase.execute(dtoWrongPassword)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Error Cases - Account Status', () => {
    it('should throw error if user account is inactive', async () => {
      // Arrange
      const dto = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      // Deactivate user
      mockUser.deactivate('Account suspended');
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Account is deactivated');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockSessionRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if user has no password (OAuth-only user)', async () => {
      // Arrange
      const dto = {
        email: 'oauth@example.com',
        password: 'Test123!@#',
      };

      // Create OAuth-only user (no password)
      const oauthUser = User.reconstruct(
        'oauth-user-id',
        'oauth@example.com',
        'oauthuser',
        null, // No password hash
        true,
        true,
        new Date(),
        new Date(),
        null,
        0
      );

      mockUserRepository.findByEmail.mockResolvedValue(oauthUser);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow(
        'This account was created with OAuth. Please use OAuth login.'
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockSessionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('Error Cases - Input Validation', () => {
    it('should throw error for invalid email format', async () => {
      // Arrange
      const dto = {
        email: 'invalid-email',
        password: 'Test123!@#',
      };

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Invalid email format');
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should throw error for empty email', async () => {
      // Arrange
      const dto = {
        email: '',
        password: 'Test123!@#',
      };

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow();
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should throw error for missing password', async () => {
      // Arrange
      const dto = {
        email: 'test@example.com',
        password: '',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(useCase.execute(dto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with null email', async () => {
      // Arrange
      const dto = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      // Create user with null email (OAuth user who later set password)
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

      mockUserRepository.findByEmail.mockResolvedValue(userWithNullEmail);
      mockUserRepository.save.mockResolvedValue(userWithNullEmail);
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');

      // Act
      const result = await useCase.execute(dto);

      // Assert
      expect(result.user.email).toBeNull();
      expect(result.user.nickname).toBe('testuser');
    });

    it('should handle first-time login (loginCount = 0)', async () => {
      // Arrange
      const dto = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockTokenService.generateAccessToken.mockReturnValue('access-token');
      mockTokenService.generateRefreshToken.mockReturnValue('refresh-token');

      // Act
      await useCase.execute(dto);

      // Assert
      expect(mockUser.loginCount).toBe(1);
      expect(mockUser.lastLogin).toBeInstanceOf(Date);
    });
  });

  describe('Security Features', () => {
    it('should not expose different errors for user existence', async () => {
      // Test that error messages don't leak information about user existence

      // Arrange - Non-existent user
      const dtoNonExistent = {
        email: 'nonexistent@example.com',
        password: 'Test123!@#',
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      let errorMessage1 = '';
      try {
        await useCase.execute(dtoNonExistent);
      } catch (error) {
        errorMessage1 = (error as Error).message;
      }

      // Arrange - Existent user with wrong password
      const dtoWrongPassword = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      let errorMessage2 = '';
      try {
        await useCase.execute(dtoWrongPassword);
      } catch (error) {
        errorMessage2 = (error as Error).message;
      }

      // Assert - Both should have the same generic error
      expect(errorMessage1).toBe(errorMessage2);
      expect(errorMessage1).toBe('Invalid credentials');
    });
  });
});
