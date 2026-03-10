import { ISessionRepository, ITokenBlacklist } from '../interfaces/repositories.interface';

interface TokenRevocationInfo {
  jti: string;
  exp: number; // timestamp Unix (secondes)
}

export class LogoutUseCase {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly tokenBlacklist: ITokenBlacklist
  ) {}

  /**
   * Déconnexion simple — invalide une session et révoque l'access token.
   * Pourquoi révoquer l'access token ? Il est stateless (JWT) et reste valide
   * jusqu'à expiration même sans session. La blacklist le rend immédiatement inutilisable.
   */
  async execute(refreshToken: string, tokenInfo?: TokenRevocationInfo): Promise<void> {
    // 1. Supprimer la session (refresh token) de la DB
    await this.sessionRepository.deleteByRefreshToken(refreshToken);

    // 2. Blacklister l'access token dans Redis si fourni
    if (tokenInfo) {
      const ttlSeconds = Math.max(0, tokenInfo.exp - Math.floor(Date.now() / 1000));
      await this.tokenBlacklist.revoke(tokenInfo.jti, ttlSeconds);
    }
  }

  /**
   * Déconnexion globale — supprime toutes les sessions d'un utilisateur.
   * L'access token courant est également révoqué.
   */
  async executeAllSessions(userId: string, tokenInfo?: TokenRevocationInfo): Promise<void> {
    // 1. Supprimer toutes les sessions de la DB
    await this.sessionRepository.deleteByUserId(userId);

    // 2. Blacklister l'access token courant si fourni
    if (tokenInfo) {
      const ttlSeconds = Math.max(0, tokenInfo.exp - Math.floor(Date.now() / 1000));
      await this.tokenBlacklist.revoke(tokenInfo.jti, ttlSeconds);
    }
  }
}
