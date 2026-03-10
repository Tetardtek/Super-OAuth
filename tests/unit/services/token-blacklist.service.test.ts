import { TokenBlacklistService } from '../../../src/infrastructure/services/token-blacklist.service';

// jest.mock() est hoisted (remonté) avant TOUTES les déclarations, même les const.
// Solution : factory autonome qui crée ses propres jest.fn(), puis on récupère
// les références via jest.requireMock() après l'import.
jest.mock('../../../src/infrastructure/redis/redis-client', () => ({
  redisClientSingleton: {
    getClient: jest.fn(),
  },
}));

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let mockSetEx: jest.Mock;
  let mockGet: jest.Mock;

  beforeEach(() => {
    // On crée des nouveaux mocks propres à chaque test
    mockSetEx = jest.fn().mockResolvedValue('OK');
    mockGet = jest.fn();

    // On récupère le module mocké et on configure getClient
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { redisClientSingleton } = jest.requireMock('../../../src/infrastructure/redis/redis-client');
    (redisClientSingleton.getClient as jest.Mock).mockResolvedValue({
      setEx: mockSetEx,
      get: mockGet,
    });

    service = new TokenBlacklistService();
  });

  // ─── revoke() ────────────────────────────────────────────────────────────────

  describe('revoke()', () => {
    it('stocke le JTI dans Redis avec le bon TTL', async () => {
      await service.revoke('test-jti-123', 900);

      expect(mockSetEx).toHaveBeenCalledWith('blacklist:jti:test-jti-123', 900, '1');
    });

    it('ne fait rien si ttlSeconds <= 0 (token deja expire)', async () => {
      await service.revoke('test-jti-123', 0);
      expect(mockSetEx).not.toHaveBeenCalled();

      await service.revoke('test-jti-123', -10);
      expect(mockSetEx).not.toHaveBeenCalled();
    });

    it('utilise le prefixe de cle correct', async () => {
      await service.revoke('abc-def', 60);

      expect(mockSetEx.mock.calls[0][0]).toBe('blacklist:jti:abc-def');
    });

    it('stocke la valeur marqueur "1"', async () => {
      await service.revoke('jti-xyz', 300);

      expect(mockSetEx.mock.calls[0][2]).toBe('1');
    });
  });

  // ─── isRevoked() ─────────────────────────────────────────────────────────────

  describe('isRevoked()', () => {
    it('retourne true si le JTI est dans Redis', async () => {
      mockGet.mockResolvedValue('1');

      const result = await service.isRevoked('revoked-jti');

      expect(result).toBe(true);
      expect(mockGet).toHaveBeenCalledWith('blacklist:jti:revoked-jti');
    });

    it('retourne false si le JTI nest pas dans Redis', async () => {
      mockGet.mockResolvedValue(null);

      const result = await service.isRevoked('valid-jti');

      expect(result).toBe(false);
    });

    it('utilise le meme prefixe que revoke()', async () => {
      mockGet.mockResolvedValue(null);

      await service.isRevoked('my-jti');

      expect(mockGet).toHaveBeenCalledWith('blacklist:jti:my-jti');
    });
  });

  // ─── Cycle revocation ────────────────────────────────────────────────────────

  describe('cycle revocation', () => {
    it('un token revoque est detecte comme revoque', async () => {
      mockGet.mockResolvedValue('1');

      await service.revoke('cycle-jti', 900);
      const revoked = await service.isRevoked('cycle-jti');

      expect(revoked).toBe(true);
    });

    it('un token non revoque nest pas detecte comme revoque', async () => {
      mockGet.mockResolvedValue(null);

      const revoked = await service.isRevoked('never-revoked-jti');

      expect(revoked).toBe(false);
    });
  });
});
