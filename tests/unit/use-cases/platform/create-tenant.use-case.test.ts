import { CreateTenantUseCase } from '../../../../src/application/use-cases/platform/create-tenant.use-case';
import { PlatformUser } from '../../../../src/domain/entities/platform-user.entity';
import { Email } from '../../../../src/domain/value-objects/email.vo';
import { Password } from '../../../../src/domain/value-objects/password.vo';

describe('CreateTenantUseCase — guard clauses', () => {
  // These tests cover the invariants that are enforced BEFORE any DB write.
  // Full tenant creation (involving a QueryRunner transaction) is covered by
  // integration tests against the real database in P6.

  let mockRepo: { findById: jest.Mock };
  let mockCrypto: {
    generateSalt: jest.Mock;
    hashClientSecret: jest.Mock;
    encryptValue: jest.Mock;
  };
  let useCase: CreateTenantUseCase;

  beforeEach(() => {
    mockRepo = { findById: jest.fn() };
    mockCrypto = {
      generateSalt: jest.fn().mockReturnValue('salt'),
      hashClientSecret: jest.fn().mockReturnValue('hash'),
      encryptValue: jest.fn().mockReturnValue({ encrypted: 'enc', iv: 'iv' }),
    };
    useCase = new CreateTenantUseCase(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockRepo as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCrypto as any
    );
  });

  it('returns user_not_found when the platform user does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const result = await useCase.execute({ platformUserId: 'ghost', name: 'acme' });
    expect(result.status).toBe('user_not_found');
    expect(mockCrypto.generateSalt).not.toHaveBeenCalled();
  });

  it('returns email_not_verified when the user has not verified their email yet', async () => {
    const user = PlatformUser.create(
      'u-1',
      Email.create('owner@example.com'),
      Password.create('StrongPass1!')
    );
    expect(user.emailVerified).toBe(false);
    mockRepo.findById.mockResolvedValue(user);

    const result = await useCase.execute({ platformUserId: 'u-1', name: 'acme' });
    expect(result.status).toBe('email_not_verified');
    expect(mockCrypto.generateSalt).not.toHaveBeenCalled();
  });
});
