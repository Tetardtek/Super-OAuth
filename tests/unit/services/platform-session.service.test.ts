import { PlatformSessionService } from '../../../src/infrastructure/services/platform-session.service';

jest.mock('../../../src/infrastructure/database/config/database.config', () => ({
  DatabaseConnection: {
    getDataSource: jest.fn(),
  },
}));

describe('PlatformSessionService', () => {
  let service: PlatformSessionService;
  let mockRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let qbChain: {
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };

  beforeEach(() => {
    qbChain = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
      createQueryBuilder: jest.fn(() => qbChain),
    };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseConnection } = jest.requireMock(
      '../../../src/infrastructure/database/config/database.config'
    );
    (DatabaseConnection.getDataSource as jest.Mock).mockReturnValue({
      getRepository: () => mockRepository,
    });

    service = new PlatformSessionService();
  });

  describe('create()', () => {
    it('hashes the refresh token before persisting', async () => {
      const rawToken = 'raw-refresh-token-abc';
      await service.create('user-1', rawToken, new Date(Date.now() + 60_000), {
        ipAddress: '1.2.3.4',
        userAgent: 'ua',
      });

      const saved = mockRepository.save.mock.calls[0][0];
      expect(saved.refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(saved.refreshTokenHash).not.toBe(rawToken);
      expect(saved.platformUserId).toBe('user-1');
      expect(saved.ipAddress).toBe('1.2.3.4');
      expect(saved.userAgent).toBe('ua');
    });

    it('assigns a UUID-looking id', async () => {
      await service.create('user-1', 'raw', new Date(Date.now() + 60_000));
      const saved = mockRepository.save.mock.calls[0][0];
      expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('returns a session record with deviceFingerprint when provided', async () => {
      const result = await service.create('user-1', 'raw', new Date(Date.now() + 60_000), {
        deviceFingerprint: 'fp-1',
      });
      expect(result.deviceFingerprint).toBe('fp-1');
      expect(result.platformUserId).toBe('user-1');
    });
  });

  describe('findByRefreshToken()', () => {
    it('returns null when session is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      expect(await service.findByRefreshToken('raw')).toBeNull();
    });

    it('returns null when session is revoked', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 's1',
        platformUserId: 'u1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      expect(await service.findByRefreshToken('raw')).toBeNull();
    });

    it('returns null when session is expired', async () => {
      mockRepository.findOne.mockResolvedValue({
        id: 's1',
        platformUserId: 'u1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      expect(await service.findByRefreshToken('raw')).toBeNull();
    });

    it('updates lastUsedAt and returns the record on hit', async () => {
      const session = {
        id: 's1',
        platformUserId: 'u1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        lastUsedAt: null,
        deviceFingerprint: 'fp',
      };
      mockRepository.findOne.mockResolvedValue(session);

      const result = await service.findByRefreshToken('raw');

      expect(result).toEqual({
        id: 's1',
        platformUserId: 'u1',
        expiresAt: session.expiresAt,
        deviceFingerprint: 'fp',
      });
      expect(session.lastUsedAt).toBeInstanceOf(Date);
      expect(mockRepository.save).toHaveBeenCalledWith(session);
    });
  });

  describe('revokeByRefreshToken()', () => {
    it('updates only non-revoked sessions matching the hash', async () => {
      await service.revokeByRefreshToken('raw');

      expect(qbChain.set).toHaveBeenCalledWith({ revokedAt: expect.any(Date) });
      expect(qbChain.where).toHaveBeenCalledWith(
        'refresh_token_hash = :hash AND revoked_at IS NULL',
        { hash: expect.stringMatching(/^[0-9a-f]{64}$/) }
      );
      expect(qbChain.execute).toHaveBeenCalled();
    });
  });

  describe('revokeAllForUser()', () => {
    it('revokes every active session for the user', async () => {
      await service.revokeAllForUser('user-1');

      expect(qbChain.where).toHaveBeenCalledWith(
        'platform_user_id = :platformUserId AND revoked_at IS NULL',
        { platformUserId: 'user-1' }
      );
      expect(qbChain.execute).toHaveBeenCalled();
    });
  });
});
