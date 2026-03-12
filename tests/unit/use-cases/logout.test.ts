import { LogoutUseCase } from '../../../src/application/use-cases/logout.use-case';
import {
  ISessionRepository,
  ITokenBlacklist,
} from '../../../src/application/interfaces/repositories.interface';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let mockSessionRepository: jest.Mocked<ISessionRepository>;
  let mockTokenBlacklist: jest.Mocked<ITokenBlacklist>;

  beforeEach(() => {
    mockSessionRepository = {
      create: jest.fn(),
      findByRefreshToken: jest.fn(),
      deleteByRefreshToken: jest.fn(),
      deleteByUserId: jest.fn(),
      deleteExpired: jest.fn(),
    };

    mockTokenBlacklist = {
      revoke: jest.fn(),
      isRevoked: jest.fn(),
    };

    useCase = new LogoutUseCase(mockSessionRepository, mockTokenBlacklist);
  });

  describe('execute — single session logout', () => {
    it('should delete session by refresh token', async () => {
      mockSessionRepository.deleteByRefreshToken.mockResolvedValue(undefined);

      await useCase.execute('some-refresh-token');

      expect(mockSessionRepository.deleteByRefreshToken).toHaveBeenCalledWith('some-refresh-token');
    });

    it('should revoke access token in blacklist when tokenInfo provided', async () => {
      // Pourquoi ? Le JWT access token est stateless — sans blacklist, il reste valide
      // jusqu'à expiration même après logout. La révocation le rend inutilisable immédiatement.
      mockSessionRepository.deleteByRefreshToken.mockResolvedValue(undefined);
      mockTokenBlacklist.revoke.mockResolvedValue(undefined);

      const futureExp = Math.floor(Date.now() / 1000) + 900; // expire dans 15 min
      await useCase.execute('refresh-token', { jti: 'jti-abc123', exp: futureExp });

      expect(mockTokenBlacklist.revoke).toHaveBeenCalledWith('jti-abc123', expect.any(Number));
      // TTL doit être positif et proche de 900 secondes
      const ttl = (mockTokenBlacklist.revoke as jest.Mock).mock.calls[0][1] as number;
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(900);
    });

    it('should not call blacklist when tokenInfo is absent', async () => {
      // Si le controller ne dispose pas du token décodé (logout sans access token),
      // on ne peut pas révoquer — on supprime juste la session. Comportement attendu.
      mockSessionRepository.deleteByRefreshToken.mockResolvedValue(undefined);

      await useCase.execute('refresh-token');

      expect(mockTokenBlacklist.revoke).not.toHaveBeenCalled();
    });

    it('should revoke with ttl=0 when access token is already expired', async () => {
      // Math.max(0, ...) garantit qu'un TTL négatif est ramené à 0 sans crash.
      // La blacklist elle-même ignore les révocations avec TTL=0 (rien à stocker).
      mockSessionRepository.deleteByRefreshToken.mockResolvedValue(undefined);
      mockTokenBlacklist.revoke.mockResolvedValue(undefined);

      const pastExp = Math.floor(Date.now() / 1000) - 60; // expiré il y a 60s
      await useCase.execute('refresh-token', { jti: 'jti-expired', exp: pastExp });

      expect(mockTokenBlacklist.revoke).toHaveBeenCalledWith('jti-expired', 0);
    });
  });

  describe('executeAllSessions — global logout', () => {
    it('should delete all sessions for the user', async () => {
      // Déconnexion globale : tous les appareils de l'utilisateur sont invalidés.
      mockSessionRepository.deleteByUserId.mockResolvedValue(undefined);

      await useCase.executeAllSessions('user-id-123');

      expect(mockSessionRepository.deleteByUserId).toHaveBeenCalledWith('user-id-123');
      expect(mockSessionRepository.deleteByRefreshToken).not.toHaveBeenCalled();
    });

    it('should revoke current access token when tokenInfo provided', async () => {
      mockSessionRepository.deleteByUserId.mockResolvedValue(undefined);
      mockTokenBlacklist.revoke.mockResolvedValue(undefined);

      const futureExp = Math.floor(Date.now() / 1000) + 300;
      await useCase.executeAllSessions('user-id-123', { jti: 'jti-current', exp: futureExp });

      expect(mockTokenBlacklist.revoke).toHaveBeenCalledWith('jti-current', expect.any(Number));
      const ttl = (mockTokenBlacklist.revoke as jest.Mock).mock.calls[0][1] as number;
      expect(ttl).toBeGreaterThan(0);
    });

    it('should not call blacklist when tokenInfo is absent', async () => {
      mockSessionRepository.deleteByUserId.mockResolvedValue(undefined);

      await useCase.executeAllSessions('user-id-456');

      expect(mockTokenBlacklist.revoke).not.toHaveBeenCalled();
    });
  });
});
