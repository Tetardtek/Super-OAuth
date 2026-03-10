import { redisClientSingleton } from '../redis/redis-client';
import { ITokenBlacklist } from '../../application/interfaces/repositories.interface';
import { logger } from '../../shared/utils/logger.util';

const KEY_PREFIX = 'blacklist:jti:';

/**
 * TokenBlacklistService
 *
 * Stocke les JTI (JWT ID) révoqués dans Redis avec un TTL automatique.
 * Pourquoi les JTI et pas les tokens complets ?
 *  - Les JTI sont courts (< 50 chars) vs tokens (> 200 chars) → économie mémoire
 *  - Le TTL Redis est aligné sur l'expiration du token → nettoyage automatique
 *  - Pas besoin de cron ou de nettoyage manuel
 */
export class TokenBlacklistService implements ITokenBlacklist {
  /**
   * Révoque un token en blacklistant son JTI dans Redis
   * @param jti - Identifiant unique du token (claim "jti")
   * @param ttlSeconds - Durée de vie restante du token en secondes
   */
  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) return; // Token déjà expiré, rien à faire

    const client = await redisClientSingleton.getClient();
    await client.setEx(`${KEY_PREFIX}${jti}`, ttlSeconds, '1');

    logger.info('Token blacklisted', { jti, ttlSeconds });
  }

  /**
   * Vérifie si un token est révoqué
   * @param jti - Identifiant unique du token
   * @returns true si révoqué, false sinon
   */
  async isRevoked(jti: string): Promise<boolean> {
    const client = await redisClientSingleton.getClient();
    const value = await client.get(`${KEY_PREFIX}${jti}`);
    return value !== null;
  }
}
