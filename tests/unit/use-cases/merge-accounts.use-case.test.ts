import { MergeAccountsUseCase, MergeAccountsInput } from '../../../src/application/use-cases/merge-accounts.use-case';
import {
  IUserRepository,
  ITokenService,
  ITokenBlacklist,
  ITenantTokenService,
  IAuditLogService,
} from '../../../src/application/interfaces/repositories.interface';
import { User } from '../../../src/domain/entities';
import { LinkedAccount } from '../../../src/domain/entities/linked-account';
import { UserId } from '../../../src/domain/value-objects/user-id';
import { DataSource, QueryRunner, EntityManager } from 'typeorm';

describe('MergeAccountsUseCase', () => {
  let useCase: MergeAccountsUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockTokenService: jest.Mocked<ITokenService>;
  let mockTokenBlacklist: jest.Mocked<ITokenBlacklist>;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockTenantTokenService: jest.Mocked<ITenantTokenService>;
  let mockAuditLogService: jest.Mocked<IAuditLogService>;
  let mockQueryRunner: jest.Mocked<QueryRunner>;
  let mockManager: jest.Mocked<EntityManager>;

  const TENANT_ID = 'test-tenant';
  const CURRENT_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
  const TARGET_USER_ID = '660e8400-e29b-41d4-a716-446655440001';
  const TARGET_TOKEN = 'valid-target-jwt-token';

  function makeUser(
    id: string,
    opts: {
      email?: string | null;
      emailVerified?: boolean;
      isActive?: boolean;
      tenantId?: string;
      providers?: string[];
      emailSource?: string | null;
    } = {}
  ): User {
    const {
      email = 'user@example.com',
      emailVerified = true,
      isActive = true,
      tenantId = TENANT_ID,
      providers = [],
      emailSource = null,
    } = opts;

    const linkedAccounts = providers.map((p) =>
      LinkedAccount.create({
        userId: new UserId(id),
        tenantId,
        provider: p as 'discord' | 'google' | 'github' | 'twitch',
        providerId: `${p}-id-existing`,
        displayName: `${p}User`,
        email: email ?? 'user@example.com',
      })
    );

    return User.reconstruct(
      id,
      email,
      `user-${id.slice(-4)}`,
      'password-hash',
      emailVerified,
      isActive,
      new Date(),
      new Date(),
      null,
      0,
      linkedAccounts,
      tenantId,
      emailSource
    );
  }

  function makeInput(overrides: Partial<MergeAccountsInput> = {}): MergeAccountsInput {
    return {
      currentUserId: CURRENT_USER_ID,
      targetToken: TARGET_TOKEN,
      tenantId: TENANT_ID,
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
    };

    mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      decodeAccessToken: jest.fn(),
      getTokenExpiration: jest.fn(),
    };

    mockTokenBlacklist = {
      revoke: jest.fn().mockResolvedValue(undefined),
      isRevoked: jest.fn(),
    };

    mockTenantTokenService = {
      generateAccessToken: jest.fn(),
      verifyAccessToken: jest.fn(),
    };

    mockAuditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    // QueryRunner mock — transaction lifecycle
    mockManager = {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EntityManager>;

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
      manager: mockManager,
    } as unknown as jest.Mocked<QueryRunner>;

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    } as unknown as jest.Mocked<DataSource>;

    useCase = new MergeAccountsUseCase(
      mockUserRepository,
      mockTokenService,
      mockTokenBlacklist,
      mockDataSource,
      mockTenantTokenService,
      mockAuditLogService
    );
  });

  // ─── Happy Path ───────────────────────────────────────────────

  describe('Happy Path', () => {
    it('should merge target into current — transfer linked accounts, delete target', async () => {
      const currentUser = makeUser(CURRENT_USER_ID, { providers: ['google'] });
      const targetUser = makeUser(TARGET_USER_ID, { email: 'target@example.com' });
      const input = makeInput();

      // Target token verification
      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID,
        jti: 'target-jti',
        tenantId: TENANT_ID,
      });

      // Fetch users
      mockUserRepository.findById
        .mockResolvedValueOnce(currentUser)   // currentUser
        .mockResolvedValueOnce(targetUser)    // targetUser
        .mockResolvedValueOnce(currentUser);  // re-fetch after merge

      // Target has a discord account to transfer
      const targetLinkedAccounts = [
        { id: 'la-1', provider: 'discord', userId: TARGET_USER_ID },
      ];
      mockManager.find.mockImplementation((entity: unknown) => {
        // LinkedAccountEntity query
        if (entity && (entity as { name?: string }).name === 'LinkedAccountEntity') {
          return Promise.resolve(targetLinkedAccounts);
        }
        // SessionEntity query — no active sessions
        return Promise.resolve([]);
      });

      // Decode target token for blacklist
      mockTokenService.decodeAccessToken.mockReturnValue({
        userId: TARGET_USER_ID,
        jti: 'target-jti',
        exp: Math.floor(Date.now() / 1000) + 300,
        tenantId: TENANT_ID,
      });

      const result = await useCase.execute(input);

      expect(result.merged).toBe(true);
      expect(mockTenantTokenService.verifyAccessToken).toHaveBeenCalledWith(TARGET_TOKEN, TENANT_ID);
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('should transfer linked accounts that current user does not have', async () => {
      const currentUser = makeUser(CURRENT_USER_ID, { providers: ['google'] });
      const targetUser = makeUser(TARGET_USER_ID);
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(targetUser)
        .mockResolvedValueOnce(currentUser);

      // Target has discord (new) + google (duplicate)
      const targetLinkedAccounts = [
        { id: 'la-discord', provider: 'discord', userId: TARGET_USER_ID },
        { id: 'la-google', provider: 'google', userId: TARGET_USER_ID },
      ];
      mockManager.find.mockResolvedValueOnce(targetLinkedAccounts); // linked accounts
      mockManager.find.mockResolvedValueOnce([]);                   // sessions

      mockTokenService.decodeAccessToken.mockReturnValue({
        userId: TARGET_USER_ID, jti: 'jti', exp: Math.floor(Date.now() / 1000) + 300, tenantId: TENANT_ID,
      });

      await useCase.execute(input);

      // Only discord should be transferred (google already on current)
      const updateCalls = mockQueryRunner.query.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('UPDATE linked_accounts')
      );
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0][1]).toEqual([CURRENT_USER_ID, 'la-discord']);
    });

    it('should copy email from target if current has no email', async () => {
      const currentUser = makeUser(CURRENT_USER_ID, { email: null, emailVerified: false });
      const targetUser = makeUser(TARGET_USER_ID, {
        email: 'target@example.com',
        emailVerified: true,
        emailSource: 'google',
      });
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(targetUser)
        .mockResolvedValueOnce(currentUser);

      mockManager.find.mockResolvedValue([]); // no linked accounts, no sessions
      mockTokenService.decodeAccessToken.mockReturnValue({
        userId: TARGET_USER_ID, jti: 'jti', exp: Math.floor(Date.now() / 1000) + 300, tenantId: TENANT_ID,
      });

      await useCase.execute(input);

      // Check email copy query was called
      const emailUpdateCalls = mockQueryRunner.query.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('UPDATE users SET email')
      );
      expect(emailUpdateCalls).toHaveLength(1);
      expect(emailUpdateCalls[0][1]).toEqual(
        expect.arrayContaining(['target@example.com', CURRENT_USER_ID])
      );
    });

    it('should NOT copy email if current already has one', async () => {
      const currentUser = makeUser(CURRENT_USER_ID, { email: 'current@example.com' });
      const targetUser = makeUser(TARGET_USER_ID, { email: 'target@example.com' });
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(targetUser)
        .mockResolvedValueOnce(currentUser);

      mockManager.find.mockResolvedValue([]);
      mockTokenService.decodeAccessToken.mockReturnValue({
        userId: TARGET_USER_ID, jti: 'jti', exp: Math.floor(Date.now() / 1000) + 300, tenantId: TENANT_ID,
      });

      await useCase.execute(input);

      const emailUpdateCalls = mockQueryRunner.query.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('UPDATE users SET email')
      );
      expect(emailUpdateCalls).toHaveLength(0);
    });

    it('should fire audit log after successful merge', async () => {
      const currentUser = makeUser(CURRENT_USER_ID);
      const targetUser = makeUser(TARGET_USER_ID);
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(targetUser)
        .mockResolvedValueOnce(currentUser);

      mockManager.find.mockResolvedValue([]);
      mockTokenService.decodeAccessToken.mockReturnValue({
        userId: TARGET_USER_ID, jti: 'jti', exp: Math.floor(Date.now() / 1000) + 300, tenantId: TENANT_ID,
      });

      await useCase.execute(input);

      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        userId: CURRENT_USER_ID,
        event: 'merge',
        metadata: { targetUserId: TARGET_USER_ID },
      });
    });
  });

  // ─── Security Gate [SG7] — Transaction rollback ───────────────

  describe('[SG7] Transaction — rollback on failure', () => {
    it('should rollback transaction if an error occurs during merge', async () => {
      const currentUser = makeUser(CURRENT_USER_ID);
      const targetUser = makeUser(TARGET_USER_ID);
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(targetUser);

      // Simulate error during linked accounts query
      mockManager.find.mockRejectedValue(new Error('DB_CONNECTION_LOST'));

      await expect(useCase.execute(input)).rejects.toThrow('DB_CONNECTION_LOST');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should always release queryRunner even on error', async () => {
      const currentUser = makeUser(CURRENT_USER_ID);
      const targetUser = makeUser(TARGET_USER_ID);
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(targetUser);

      mockManager.find.mockRejectedValue(new Error('CRASH'));

      await expect(useCase.execute(input)).rejects.toThrow();

      // release() must be called in finally block
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Security Gate [SG8] — Blacklist tokens BEFORE delete ─────

  describe('[SG8] Token blacklisting before target deletion', () => {
    it('should blacklist all target sessions before deleting user', async () => {
      const currentUser = makeUser(CURRENT_USER_ID);
      const targetUser = makeUser(TARGET_USER_ID);
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(targetUser)
        .mockResolvedValueOnce(currentUser);

      // Target has 2 active sessions
      const targetSessions = [
        { userId: TARGET_USER_ID, token: 'session-token-1' },
        { userId: TARGET_USER_ID, token: 'session-token-2' },
      ];
      mockManager.find
        .mockResolvedValueOnce([])            // linked accounts
        .mockResolvedValueOnce(targetSessions); // sessions

      mockTokenService.decodeAccessToken
        .mockReturnValueOnce({ userId: TARGET_USER_ID, jti: 'jti-1', exp: Math.floor(Date.now() / 1000) + 600, tenantId: TENANT_ID })
        .mockReturnValueOnce({ userId: TARGET_USER_ID, jti: 'jti-2', exp: Math.floor(Date.now() / 1000) + 600, tenantId: TENANT_ID })
        .mockReturnValueOnce({ userId: TARGET_USER_ID, jti: 'target-jti', exp: Math.floor(Date.now() / 1000) + 300, tenantId: TENANT_ID });

      await useCase.execute(input);

      // 2 sessions + 1 targetToken itself = 3 blacklist calls
      expect(mockTokenBlacklist.revoke).toHaveBeenCalledTimes(3);
      expect(mockTokenBlacklist.revoke).toHaveBeenCalledWith('jti-1', expect.any(Number));
      expect(mockTokenBlacklist.revoke).toHaveBeenCalledWith('jti-2', expect.any(Number));
      expect(mockTokenBlacklist.revoke).toHaveBeenCalledWith('target-jti', expect.any(Number));

      // Verify delete happens AFTER blacklist
      const deleteCall = mockManager.delete.mock.invocationCallOrder[0];
      const lastRevokeCall = mockTokenBlacklist.revoke.mock.invocationCallOrder[2];
      expect(deleteCall).toBeGreaterThan(lastRevokeCall);
    });

    it('should blacklist the targetToken itself even if not in sessions', async () => {
      const currentUser = makeUser(CURRENT_USER_ID);
      const targetUser = makeUser(TARGET_USER_ID);
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(currentUser)
        .mockResolvedValueOnce(targetUser)
        .mockResolvedValueOnce(currentUser);

      mockManager.find.mockResolvedValue([]); // no sessions, no linked accounts

      mockTokenService.decodeAccessToken.mockReturnValue({
        userId: TARGET_USER_ID, jti: 'target-jti-direct', exp: Math.floor(Date.now() / 1000) + 300, tenantId: TENANT_ID,
      });

      await useCase.execute(input);

      // Should still blacklist the targetToken
      expect(mockTokenBlacklist.revoke).toHaveBeenCalledWith('target-jti-direct', expect.any(Number));
    });
  });

  // ─── Security Gate [SG9] — Self-merge forbidden ───────────────

  describe('[SG9] Self-merge forbidden', () => {
    it('should throw SELF_MERGE_FORBIDDEN if currentUserId === targetUserId', async () => {
      const input = makeInput();

      // Target token resolves to the SAME user
      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: CURRENT_USER_ID, // same as current!
        jti: 'jti',
        tenantId: TENANT_ID,
      });

      await expect(useCase.execute(input)).rejects.toThrow('SELF_MERGE_FORBIDDEN');

      // Should not fetch users or start transaction
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });
  });

  // ─── Error Cases ──────────────────────────────────────────────

  describe('Error Cases', () => {
    it('should throw INVALID_TARGET_TOKEN if token verification fails', async () => {
      const input = makeInput();
      mockTenantTokenService.verifyAccessToken.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow('INVALID_TARGET_TOKEN');
    });

    it('should throw CURRENT_USER_NOT_FOUND if current user does not exist', async () => {
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(null)          // current not found
        .mockResolvedValueOnce(makeUser(TARGET_USER_ID));

      await expect(useCase.execute(input)).rejects.toThrow('CURRENT_USER_NOT_FOUND');
    });

    it('should throw CURRENT_USER_NOT_FOUND if current user is inactive', async () => {
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(makeUser(CURRENT_USER_ID, { isActive: false }))
        .mockResolvedValueOnce(makeUser(TARGET_USER_ID));

      await expect(useCase.execute(input)).rejects.toThrow('CURRENT_USER_NOT_FOUND');
    });

    it('should throw TARGET_USER_NOT_FOUND if target user does not exist', async () => {
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(makeUser(CURRENT_USER_ID))
        .mockResolvedValueOnce(null);

      await expect(useCase.execute(input)).rejects.toThrow('TARGET_USER_NOT_FOUND');
    });

    it('should throw TARGET_USER_NOT_FOUND if target user is inactive', async () => {
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(makeUser(CURRENT_USER_ID))
        .mockResolvedValueOnce(makeUser(TARGET_USER_ID, { isActive: false }));

      await expect(useCase.execute(input)).rejects.toThrow('TARGET_USER_NOT_FOUND');
    });

    it('should throw CROSS_TENANT_MERGE_FORBIDDEN if users are in different tenants', async () => {
      const input = makeInput();

      mockTenantTokenService.verifyAccessToken.mockResolvedValue({
        userId: TARGET_USER_ID, jti: 'jti', tenantId: TENANT_ID,
      });
      mockUserRepository.findById
        .mockResolvedValueOnce(makeUser(CURRENT_USER_ID, { tenantId: TENANT_ID }))
        .mockResolvedValueOnce(makeUser(TARGET_USER_ID, { tenantId: 'other-tenant' }));

      await expect(useCase.execute(input)).rejects.toThrow('CROSS_TENANT_MERGE_FORBIDDEN');
    });

    it('should not fire audit log on failure', async () => {
      const input = makeInput();
      mockTenantTokenService.verifyAccessToken.mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow();
      expect(mockAuditLogService.log).not.toHaveBeenCalled();
    });
  });
});
