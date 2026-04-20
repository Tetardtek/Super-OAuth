import { RegisterPlatformUserUseCase } from '../../../../src/application/use-cases/platform/register-platform-user.use-case';
import { PlatformUser } from '../../../../src/domain/entities/platform-user.entity';
import { Email } from '../../../../src/domain/value-objects/email.vo';
import { Password } from '../../../../src/domain/value-objects/password.vo';

describe('RegisterPlatformUserUseCase', () => {
  let useCase: RegisterPlatformUserUseCase;
  let mockRepo: {
    findByEmail: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findById: jest.Mock;
    existsByEmail: jest.Mock;
    delete: jest.Mock;
  };
  let mockEmailTokenService: {
    createVerificationToken: jest.Mock;
    createPasswordResetToken: jest.Mock;
    verifyToken: jest.Mock;
  };

  beforeEach(() => {
    mockRepo = {
      findByEmail: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      existsByEmail: jest.fn(),
      delete: jest.fn(),
    };
    mockEmailTokenService = {
      createVerificationToken: jest.fn().mockResolvedValue({
        rawToken: 'raw-token-abc',
        expiresAt: new Date(Date.now() + 24 * 3600_000),
      }),
      createPasswordResetToken: jest.fn(),
      verifyToken: jest.fn(),
    };

    useCase = new RegisterPlatformUserUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockEmailTokenService as any
    );
  });

  describe('input validation', () => {
    it('rejects invalid email via Email value object', async () => {
      await expect(
        useCase.execute({ email: 'not-an-email', password: 'Strong1!' })
      ).rejects.toThrow(/email/i);
      expect(mockRepo.findByEmail).not.toHaveBeenCalled();
    });

    it('rejects weak password via Password value object', async () => {
      await expect(
        useCase.execute({ email: 'user@example.com', password: 'weak' })
      ).rejects.toThrow();
      expect(mockRepo.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('when the email is new', () => {
    it('saves the new user and issues a verification token (status=created)', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);

      const result = await useCase.execute({
        email: 'owner@example.com',
        password: 'StrongPass1!',
      });

      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      const saved: PlatformUser = mockRepo.save.mock.calls[0][0];
      expect(saved.email.toString()).toBe('owner@example.com');

      expect(mockEmailTokenService.createVerificationToken).toHaveBeenCalledWith({
        platformUserId: saved.id,
      });
      expect(result.status).toBe('created');
      if (result.status === 'created') {
        expect(result.verificationToken).toBe('raw-token-abc');
      }
    });
  });

  describe('when the email already belongs to a verified user', () => {
    it('returns already_verified without issuing a token or saving', async () => {
      const existing = PlatformUser.reconstruct(
        'u-1',
        'owner@example.com',
        '$2b$12$existing',
        'client',
        true,
        null,
        new Date(),
        new Date()
      );
      mockRepo.findByEmail.mockResolvedValue(existing);

      const result = await useCase.execute({
        email: 'owner@example.com',
        password: 'StrongPass1!',
      });

      expect(result.status).toBe('already_verified');
      expect(mockRepo.save).not.toHaveBeenCalled();
      expect(mockEmailTokenService.createVerificationToken).not.toHaveBeenCalled();
    });
  });

  describe('when the email belongs to an unverified user', () => {
    it('re-issues a verification token without creating a new user (status=resent)', async () => {
      const existing = PlatformUser.create(
        'u-2',
        Email.create('owner@example.com'),
        Password.create('StrongPass1!')
      );
      mockRepo.findByEmail.mockResolvedValue(existing);

      const result = await useCase.execute({
        email: 'owner@example.com',
        password: 'StrongPass1!',
      });

      expect(result.status).toBe('resent');
      expect(mockRepo.save).not.toHaveBeenCalled();
      expect(mockEmailTokenService.createVerificationToken).toHaveBeenCalledWith({
        platformUserId: 'u-2',
      });
      if (result.status === 'resent') {
        expect(result.verificationToken).toBe('raw-token-abc');
      }
    });
  });
});
