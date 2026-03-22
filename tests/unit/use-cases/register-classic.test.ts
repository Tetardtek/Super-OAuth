import { RegisterClassicUseCase } from '../../../src/application/use-cases/register-classic.use-case';
import {
  IUserRepository,
  IAuditLogService,
  IEmailService,
  IEmailTokenService,
} from '../../../src/application/interfaces/repositories.interface';
import { User } from '../../../src/domain/entities';

describe('RegisterClassicUseCase', () => {
  let useCase: RegisterClassicUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockAuditLogService: jest.Mocked<IAuditLogService>;
  let mockEmailService: jest.Mocked<IEmailService>;
  let mockEmailTokenService: jest.Mocked<IEmailTokenService>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByProvider: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    mockAuditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    mockEmailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendMergeEmail: jest.fn().mockResolvedValue(undefined),
    };

    mockEmailTokenService = {
      createVerificationToken: jest.fn().mockResolvedValue({ rawToken: 'mock-token', expiresAt: new Date() }),
      createMergeToken: jest.fn().mockResolvedValue({ rawToken: 'mock-token', expiresAt: new Date() }),
    };

    useCase = new RegisterClassicUseCase(
      mockUserRepository,
      mockAuditLogService,
      mockEmailService,
      mockEmailTokenService
    );
  });

  it('should register a new user and send verification email', async () => {
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
      tenantId: 'test-tenant',
      createdAt: new Date(),
      lastLogin: null,
      loginCount: 0
    } as any;

    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.save.mockResolvedValue(mockUser);

    const result = await useCase.execute(dto);

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(dto.email, dto.tenantId);
    expect(mockUserRepository.save).toHaveBeenCalled();
    expect(mockEmailTokenService.createVerificationToken).toHaveBeenCalled();
    expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
      dto.email,
      'mock-token',
      dto.tenantId
    );
    expect(result.message).toBe('VERIFICATION_EMAIL_SENT');
    expect(result.email).toBe('test@example.com');
    // No tokens returned — must verify email first
    expect((result as any).accessToken).toBeUndefined();
  });

  it('should resend verification for unverified existing user', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'Test123!@#',
      nickname: 'testuser',
      tenantId: 'test-tenant'
    };

    mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing-id', emailVerified: false } as User);

    const result = await useCase.execute(dto);

    expect(result.message).toBe('VERIFICATION_EMAIL_SENT');
    expect(mockEmailTokenService.createVerificationToken).toHaveBeenCalled();
    expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    // Should NOT create a new user
    expect(mockUserRepository.save).not.toHaveBeenCalled();
  });

  it('should throw error if verified user already exists', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'Test123!@#',
      nickname: 'testuser',
      tenantId: 'test-tenant'
    };

    mockUserRepository.findByEmail.mockResolvedValue({ emailVerified: true } as User);

    await expect(useCase.execute(dto)).rejects.toThrow('User with this email already exists');
  });

  it('should throw error for invalid email', async () => {
    const dto = {
      email: 'invalid-email',
      password: 'Test123!@#',
      nickname: 'testuser',
      tenantId: 'test-tenant'
    };

    await expect(useCase.execute(dto)).rejects.toThrow('Invalid email format');
  });

  it('should throw error for weak password', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'weak',
      nickname: 'testuser',
      tenantId: 'test-tenant'
    };

    await expect(useCase.execute(dto)).rejects.toThrow();
  });
});
