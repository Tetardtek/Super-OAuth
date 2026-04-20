import { PlatformEmailTokenService } from '../../../src/infrastructure/services/platform-email-token.service';

jest.mock('../../../src/infrastructure/database/config/database.config', () => ({
  DatabaseConnection: {
    getDataSource: jest.fn(),
  },
}));

describe('PlatformEmailTokenService', () => {
  let service: PlatformEmailTokenService;
  let mockRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    mockRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseConnection } = jest.requireMock(
      '../../../src/infrastructure/database/config/database.config'
    );
    (DatabaseConnection.getDataSource as jest.Mock).mockReturnValue({
      getRepository: () => mockRepository,
    });

    service = new PlatformEmailTokenService();
  });

  describe('createVerificationToken()', () => {
    it('invalidates previous verification tokens for the same user', async () => {
      await service.createVerificationToken({ platformUserId: 'user-1' });

      expect(mockRepository.delete).toHaveBeenCalledWith({
        platformUserId: 'user-1',
        type: 'verification',
      });
    });

    it('returns a raw 64-hex token and future expiry (~24h)', async () => {
      const before = Date.now();
      const result = await service.createVerificationToken({ platformUserId: 'user-1' });
      const after = Date.now();

      expect(result.rawToken).toMatch(/^[0-9a-f]{64}$/);
      const ttl = result.expiresAt.getTime() - before;
      expect(ttl).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
      expect(ttl).toBeLessThanOrEqual(after + 25 * 60 * 60 * 1000 - before);
    });

    it('persists the hashed token (not the raw one)', async () => {
      const result = await service.createVerificationToken({ platformUserId: 'user-1' });

      const saved = mockRepository.save.mock.calls[0][0];
      expect(saved.token).not.toBe(result.rawToken);
      expect(saved.token).toMatch(/^[0-9a-f]{64}$/);
      expect(saved.type).toBe('verification');
      expect(saved.platformUserId).toBe('user-1');
    });
  });

  describe('createPasswordResetToken()', () => {
    it('invalidates previous password_reset tokens for the same user', async () => {
      await service.createPasswordResetToken({ platformUserId: 'user-2' });

      expect(mockRepository.delete).toHaveBeenCalledWith({
        platformUserId: 'user-2',
        type: 'password_reset',
      });
    });

    it('sets a shorter TTL (~60 min)', async () => {
      const before = Date.now();
      const result = await service.createPasswordResetToken({ platformUserId: 'user-2' });

      const ttl = result.expiresAt.getTime() - before;
      expect(ttl).toBeGreaterThanOrEqual(59 * 60 * 1000);
      expect(ttl).toBeLessThanOrEqual(61 * 60 * 1000);
    });

    it('persists type=password_reset', async () => {
      await service.createPasswordResetToken({ platformUserId: 'user-2' });
      const saved = mockRepository.save.mock.calls[0][0];
      expect(saved.type).toBe('password_reset');
    });
  });

  describe('verifyToken()', () => {
    it('returns null when the token is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyToken('any-raw', 'verification');
      expect(result).toBeNull();
    });

    it('returns null when the type mismatches', async () => {
      mockRepository.findOne.mockResolvedValue({
        type: 'verification',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });

      const result = await service.verifyToken('any-raw', 'password_reset');
      expect(result).toBeNull();
    });

    it('returns null and deletes the token when expired', async () => {
      mockRepository.findOne.mockResolvedValue({
        token: 'hash-1',
        type: 'verification',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      });

      const result = await service.verifyToken('raw', 'verification');
      expect(result).toBeNull();
      expect(mockRepository.delete).toHaveBeenCalledWith(
        expect.objectContaining({ token: expect.stringMatching(/^[0-9a-f]{64}$/) })
      );
    });

    it('returns null when the token was already used', async () => {
      mockRepository.findOne.mockResolvedValue({
        token: 'hash-2',
        type: 'verification',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(Date.now() - 10_000),
      });

      const result = await service.verifyToken('raw', 'verification');
      expect(result).toBeNull();
    });

    it('marks the token as used and returns the entity on success', async () => {
      const entity = {
        token: 'hash-3',
        platformUserId: 'user-3',
        type: 'verification',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      };
      mockRepository.findOne.mockResolvedValue(entity);

      const result = await service.verifyToken('raw', 'verification');

      expect(result).toBe(entity);
      expect(entity.usedAt).toBeInstanceOf(Date);
      expect(mockRepository.save).toHaveBeenCalledWith(entity);
    });
  });
});
