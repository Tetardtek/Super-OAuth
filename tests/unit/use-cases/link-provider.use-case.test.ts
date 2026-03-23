import { LinkProviderUseCase, LinkProviderInput } from '../../../src/application/use-cases/link-provider.use-case';
import {
  IUserRepository,
  IAuditLogService,
} from '../../../src/application/interfaces/repositories.interface';
import { User } from '../../../src/domain/entities';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { Nickname } from '../../../src/domain/value-objects/nickname.vo';
import { Password } from '../../../src/domain/value-objects/password.vo';
import { LinkedAccount } from '../../../src/domain/entities/linked-account';
import { UserId } from '../../../src/domain/value-objects/user-id';
import { ProviderRawData } from '../../../src/infrastructure/oauth/oauth-config';

// Extended interface matching the use case's internal cast
interface UserRepositoryWithLink extends IUserRepository {
  linkOAuthAccount(
    userId: string,
    data: {
      tenantId: string;
      provider: string;
      providerId: string;
      email?: string;
      nickname?: string;
      avatar?: string;
      linkedAt: Date;
      raw?: unknown;
    }
  ): Promise<void>;
}

describe('LinkProviderUseCase', () => {
  let useCase: LinkProviderUseCase;
  let mockUserRepository: jest.Mocked<UserRepositoryWithLink>;
  let mockAuditLogService: jest.Mocked<IAuditLogService>;

  const TENANT_ID = 'test-tenant';
  const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

  function makeActiveUser(id: string = USER_ID, providers: string[] = []): User {
    const email = Email.create('user@example.com');
    const nickname = Nickname.create('testuser');
    const password = Password.create('Test123!@#');
    const user = User.createWithEmail(id, email, nickname, password, TENANT_ID);

    // Link existing providers if needed
    for (const provider of providers) {
      const linkedAccount = LinkedAccount.create({
        userId: new UserId(id),
        tenantId: TENANT_ID,
        provider: provider as 'discord' | 'google' | 'github' | 'twitch',
        providerId: `${provider}-id-existing`,
        displayName: `${provider}User`,
        email: 'user@example.com',
      });
      user.linkAccount(linkedAccount);
    }

    return user;
  }

  function makeInput(overrides: Partial<LinkProviderInput> = {}): LinkProviderInput {
    return {
      linkingUserId: USER_ID,
      tenantId: TENANT_ID,
      provider: 'discord',
      oauthUserInfo: {
        id: 'discord-user-456',
        email: 'discord@example.com',
        emailVerified: true,
        nickname: 'discorduser',
        avatar: 'https://cdn.example.com/avatar.png',
        provider: 'discord',
        raw: { id: 'discord-user-456', username: 'discorduser', discriminator: '0' } as ProviderRawData,
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByProvider: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      updateFields: jest.fn(),
      linkOAuthAccount: jest.fn(),
    };

    mockAuditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new LinkProviderUseCase(mockUserRepository, mockAuditLogService);
  });

  // ─── Happy Path ───────────────────────────────────────────────

  describe('Happy Path', () => {
    it('should link provider to existing user successfully', async () => {
      const currentUser = makeActiveUser();
      const input = makeInput();

      mockUserRepository.findById.mockResolvedValue(currentUser);
      mockUserRepository.findByProvider.mockResolvedValue(null);
      mockUserRepository.linkOAuthAccount.mockResolvedValue(undefined);

      const result = await useCase.execute(input);

      expect(result).toEqual({ success: true, provider: 'discord' });
      expect(mockUserRepository.findById).toHaveBeenCalledWith(USER_ID);
      expect(mockUserRepository.findByProvider).toHaveBeenCalledWith('discord', 'discord-user-456', TENANT_ID);
      expect(mockUserRepository.linkOAuthAccount).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({
          tenantId: TENANT_ID,
          provider: 'discord',
          providerId: 'discord-user-456',
          email: 'discord@example.com',
          nickname: 'discorduser',
          avatar: 'https://cdn.example.com/avatar.png',
          linkedAt: expect.any(Date),
          raw: { id: 'discord-user-456', username: 'discorduser', discriminator: '0' },
        })
      );
    });

    it('should link provider without optional fields (email, avatar)', async () => {
      const currentUser = makeActiveUser();
      const input = makeInput({
        oauthUserInfo: {
          id: 'github-user-789',
          emailVerified: false,
          nickname: 'ghuser',
          provider: 'github',
          raw: { id: 'github-user-789', username: 'ghuser', discriminator: '0' } as ProviderRawData,
        },
      });
      input.provider = 'github';

      mockUserRepository.findById.mockResolvedValue(currentUser);
      mockUserRepository.findByProvider.mockResolvedValue(null);
      mockUserRepository.linkOAuthAccount.mockResolvedValue(undefined);

      const result = await useCase.execute(input);

      expect(result).toEqual({ success: true, provider: 'github' });

      const linkCall = mockUserRepository.linkOAuthAccount.mock.calls[0][1];
      expect(linkCall.email).toBeUndefined();
      expect(linkCall.avatar).toBeUndefined();
    });

    it('should fire audit log after successful link', async () => {
      const currentUser = makeActiveUser();
      const input = makeInput();

      mockUserRepository.findById.mockResolvedValue(currentUser);
      mockUserRepository.findByProvider.mockResolvedValue(null);
      mockUserRepository.linkOAuthAccount.mockResolvedValue(undefined);

      await useCase.execute(input);

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        userId: USER_ID,
        event: 'link',
        metadata: { provider: 'discord' },
      });
    });
  });

  // ─── Security Gate [SG5] — linkingUserId from Redis ───────────

  describe('[SG5] linkingUserId sourced from Redis state', () => {
    it('should use linkingUserId from input, not from OAuth callback data', async () => {
      const currentUser = makeActiveUser();
      const input = makeInput();
      // oauthUserInfo.id is the PROVIDER's user id, NOT our user id
      // linkingUserId is what matters — it comes from Redis state

      mockUserRepository.findById.mockResolvedValue(currentUser);
      mockUserRepository.findByProvider.mockResolvedValue(null);
      mockUserRepository.linkOAuthAccount.mockResolvedValue(undefined);

      await useCase.execute(input);

      // findById must use linkingUserId, not oauthUserInfo.id
      expect(mockUserRepository.findById).toHaveBeenCalledWith(USER_ID);
      expect(mockUserRepository.findById).not.toHaveBeenCalledWith('discord-user-456');
    });
  });

  // ─── Security Gate [SG10] — PROVIDER_CONFLICT ─────────────────

  describe('[SG10] PROVIDER_CONFLICT — no info leak', () => {
    it('should throw PROVIDER_CONFLICT if provider is linked to another user', async () => {
      const currentUser = makeActiveUser();
      const otherUser = makeActiveUser('660e8400-e29b-41d4-a716-446655440001');
      const input = makeInput();

      mockUserRepository.findById.mockResolvedValue(currentUser);
      // Provider already owned by another user
      mockUserRepository.findByProvider.mockResolvedValue(otherUser);

      await expect(useCase.execute(input)).rejects.toThrow('PROVIDER_CONFLICT');

      // Should NOT call linkOAuthAccount
      expect(mockUserRepository.linkOAuthAccount).not.toHaveBeenCalled();
    });

    it('should NOT throw PROVIDER_CONFLICT if same user already owns provider+providerId', async () => {
      // Edge case: user re-links same provider with same providerId
      // findByProvider returns the same user → not a conflict
      // BUT isProviderLinked will catch it as ALREADY_LINKED
      const currentUser = makeActiveUser(USER_ID, ['discord']);
      const input = makeInput();

      mockUserRepository.findById.mockResolvedValue(currentUser);
      mockUserRepository.findByProvider.mockResolvedValue(currentUser);

      // Should not throw PROVIDER_CONFLICT, but ALREADY_LINKED
      await expect(useCase.execute(input)).rejects.toThrow('ALREADY_LINKED');
    });
  });

  // ─── Error Cases ──────────────────────────────────────────────

  describe('Error Cases', () => {
    it('should throw LINK_USER_NOT_FOUND if user does not exist', async () => {
      const input = makeInput();
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow('LINK_USER_NOT_FOUND');
      expect(mockUserRepository.linkOAuthAccount).not.toHaveBeenCalled();
    });

    it('should throw LINK_USER_NOT_FOUND if user is inactive', async () => {
      const inactiveUser = User.reconstruct(
        USER_ID, 'user@example.com', 'testuser', 'hash',
        true, false, // isActive = false
        new Date(), new Date(), null, 0, [], TENANT_ID
      );
      const input = makeInput();

      mockUserRepository.findById.mockResolvedValue(inactiveUser);

      await expect(useCase.execute(input)).rejects.toThrow('LINK_USER_NOT_FOUND');
    });

    it('should throw ALREADY_LINKED if provider type already linked to user', async () => {
      const currentUser = makeActiveUser(USER_ID, ['discord']);
      const input = makeInput();

      mockUserRepository.findById.mockResolvedValue(currentUser);
      mockUserRepository.findByProvider.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow('ALREADY_LINKED');
      expect(mockUserRepository.linkOAuthAccount).not.toHaveBeenCalled();
    });

    it('should not fire audit log on failure', async () => {
      const input = makeInput();
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow('LINK_USER_NOT_FOUND');
      expect(mockAuditLogService.log).not.toHaveBeenCalled();
    });
  });
});
