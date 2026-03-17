import { RegisterClassicUseCase } from '../../../src/application/use-cases/register-classic.use-case';
import {
  IUserRepository,
  ITokenService,
  ITenantTokenService,
  IAuditLogService,
} from '../../../src/application/interfaces/repositories.interface';
import { User } from '../../../src/domain/entities';

describe('RegisterClassicUseCase', () => {
  let useCase: RegisterClassicUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockTenantTokenService: jest.Mocked<ITenantTokenService>;
  let mockAuditLogService: jest.Mocked<IAuditLogService>;

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
      decodeAccessToken: jest.fn(),
      getTokenExpiration: jest.fn(),
    };

    mockTenantTokenService = {
      generateAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
      verifyAccessToken: jest.fn(),
    };

    mockAuditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new RegisterClassicUseCase(
      mockUserRepository,
      mockTokenService,
      mockTenantTokenService,
      mockAuditLogService
    );
  });

  it('should register a new user successfully', async () => {
    // Arrange
    const dto = {
      email: 'test@example.com',
      password: 'Test123!@#',
      nickname: 'testuser',
      tenantId: 'test-tenant'
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
    mockTenantTokenService.generateAccessToken.mockResolvedValue('mock-access-token');
    mockTokenService.generateRefreshToken.mockReturnValue('mock-refresh-token');

    // Act
    const result = await useCase.execute(dto);

    // Assert
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(dto.email, dto.tenantId);
    expect(mockUserRepository.save).toHaveBeenCalled();
    expect(mockTenantTokenService.generateAccessToken).toHaveBeenCalled();
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
      nickname: 'testuser',
      tenantId: 'test-tenant'
    };

    mockUserRepository.findByEmail.mockResolvedValue({ emailVerified: true } as User); // User exists

    // Act & Assert
    await expect(useCase.execute(dto)).rejects.toThrow('User with this email already exists');
  });

  it('should throw error for invalid email', async () => {
    // Arrange
    const dto = {
      email: 'invalid-email',
      password: 'Test123!@#',
      nickname: 'testuser',
      tenantId: 'test-tenant'
    };

    // Act & Assert
    await expect(useCase.execute(dto)).rejects.toThrow('Invalid email format');
  });

  it('should throw error for weak password', async () => {
    // Arrange
    const dto = {
      email: 'test@example.com',
      password: 'weak',
      nickname: 'testuser',
      tenantId: 'test-tenant'
    };

    // Act & Assert
    await expect(useCase.execute(dto)).rejects.toThrow();
  });
});
