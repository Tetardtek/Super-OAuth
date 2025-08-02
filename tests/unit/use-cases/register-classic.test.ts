import { RegisterClassicUseCase } from '../../../src/application/use-cases/register-classic.use-case';
import { IUserRepository, ITokenService } from '../../../src/application/interfaces/repositories.interface';
import { User } from '../../../src/domain/entities';

describe('RegisterClassicUseCase', () => {
  let useCase: RegisterClassicUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockTokenService: jest.Mocked<ITokenService>;

  beforeEach(() => {
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
      getTokenExpiration: jest.fn(),
    };

    useCase = new RegisterClassicUseCase(mockUserRepository, mockTokenService);
  });

  it('should register a new user successfully', async () => {
    // Arrange
    const dto = {
      email: 'test@example.com',
      password: 'Test123!@#',
      nickname: 'testuser'
    };

    const mockUser = {
      id: 'mock-user-id',
      email: { toString: () => 'test@example.com' },
      nickname: { toString: () => 'testuser' },
      emailVerified: false,
      isActive: true,
      linkedProviders: [],
      createdAt: new Date(),
      lastLogin: null,
      loginCount: 0
    } as any;

    mockUserRepository.findByEmail.mockResolvedValue(null); // User doesn't exist
    mockUserRepository.save.mockResolvedValue(mockUser); // Mock saved user
    mockTokenService.generateAccessToken.mockReturnValue('mock-access-token');
    mockTokenService.generateRefreshToken.mockReturnValue('mock-refresh-token');

    // Act
    const result = await useCase.execute(dto);

    // Assert
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(dto.email);
    expect(mockUserRepository.save).toHaveBeenCalled();
    expect(mockTokenService.generateAccessToken).toHaveBeenCalled();
    expect(mockTokenService.generateRefreshToken).toHaveBeenCalled();
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.nickname).toBe('testuser');
  });

  it('should throw error if user already exists', async () => {
    // Arrange
    const dto = {
      email: 'test@example.com',
      password: 'Test123!@#',
      nickname: 'testuser'
    };

    mockUserRepository.findByEmail.mockResolvedValue({} as User); // User exists

    // Act & Assert
    await expect(useCase.execute(dto)).rejects.toThrow('User with this email already exists');
  });

  it('should throw error for invalid email', async () => {
    // Arrange
    const dto = {
      email: 'invalid-email',
      password: 'Test123!@#',
      nickname: 'testuser'
    };

    // Act & Assert
    await expect(useCase.execute(dto)).rejects.toThrow('Invalid email format');
  });

  it('should throw error for weak password', async () => {
    // Arrange
    const dto = {
      email: 'test@example.com',
      password: 'weak',
      nickname: 'testuser'
    };

    // Act & Assert
    await expect(useCase.execute(dto)).rejects.toThrow();
  });
});
