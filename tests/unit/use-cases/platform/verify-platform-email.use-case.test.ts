import { VerifyPlatformEmailUseCase } from '../../../../src/application/use-cases/platform/verify-platform-email.use-case';
import { PlatformUser } from '../../../../src/domain/entities/platform-user.entity';
import { Email } from '../../../../src/domain/value-objects/email.vo';
import { Password } from '../../../../src/domain/value-objects/password.vo';

describe('VerifyPlatformEmailUseCase', () => {
  let useCase: VerifyPlatformEmailUseCase;
  let mockRepo: {
    findById: jest.Mock;
    update: jest.Mock;
    findByEmail: jest.Mock;
    save: jest.Mock;
    existsByEmail: jest.Mock;
    delete: jest.Mock;
  };
  let mockEmailTokenService: {
    verifyToken: jest.Mock;
    createVerificationToken: jest.Mock;
    createPasswordResetToken: jest.Mock;
  };

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      findByEmail: jest.fn(),
      save: jest.fn(),
      existsByEmail: jest.fn(),
      delete: jest.fn(),
    };
    mockEmailTokenService = {
      verifyToken: jest.fn(),
      createVerificationToken: jest.fn(),
      createPasswordResetToken: jest.fn(),
    };

    useCase = new VerifyPlatformEmailUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEmailTokenService as any
    );
  });

  it('returns invalid_token when the token cannot be verified', async () => {
    mockEmailTokenService.verifyToken.mockResolvedValue(null);
    const result = await useCase.execute({ rawToken: 'bad' });
    expect(result.status).toBe('invalid_token');
    expect(mockRepo.findById).not.toHaveBeenCalled();
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('returns user_not_found when the token is valid but the user is gone', async () => {
    mockEmailTokenService.verifyToken.mockResolvedValue({ platformUserId: 'ghost' });
    mockRepo.findById.mockResolvedValue(null);

    const result = await useCase.execute({ rawToken: 'raw' });
    expect(result.status).toBe('user_not_found');
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('marks the email verified and persists when everything checks out', async () => {
    const user = PlatformUser.create(
      'u-1',
      Email.create('owner@example.com'),
      Password.create('StrongPass1!')
    );
    expect(user.emailVerified).toBe(false);

    mockEmailTokenService.verifyToken.mockResolvedValue({ platformUserId: 'u-1' });
    mockRepo.findById.mockResolvedValue(user);

    const result = await useCase.execute({ rawToken: 'raw' });

    expect(result.status).toBe('verified');
    if (result.status === 'verified') {
      expect(result.platformUserId).toBe('u-1');
      expect(result.email).toBe('owner@example.com');
    }
    expect(user.emailVerified).toBe(true);
    expect(mockRepo.update).toHaveBeenCalledWith(user);
  });

  it('asks the token service for the correct type (verification)', async () => {
    mockEmailTokenService.verifyToken.mockResolvedValue(null);
    await useCase.execute({ rawToken: 'raw' });
    expect(mockEmailTokenService.verifyToken).toHaveBeenCalledWith('raw', 'verification');
  });
});
