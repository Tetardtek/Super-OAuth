import { redisClientSingleton } from './redis-client';
import { logger } from '@shared/utils/logger.util';

export interface OAuthState {
  provider: string;
  timestamp: number;
  nonce: string;
  redirectUrl?: string;
}

/**
 * Interface pour le stockage de states OAuth
 */
export interface IStateStorage {
  save(state: string, data: OAuthState, ttlSeconds: number): Promise<void>;
  get(state: string): Promise<OAuthState | null>;
  delete(state: string): Promise<void>;
  cleanupExpired(): Promise<number>;
}

/**
 * Implémentation Redis du stockage de states OAuth
 *
 * Remplace le stockage en mémoire (Map) pour :
 * - Persistence entre restarts
 * - Support du load balancing (état partagé)
 * - TTL automatique via Redis
 * - Monitoring et observabilité
 */
export class RedisStateStorage implements IStateStorage {
  private readonly keyPrefix = 'oauth:state:';

  /**
   * Sauvegarde un state OAuth avec TTL
   *
   * @param state State unique généré
   * @param data Données du state
   * @param ttlSeconds Durée de vie en secondes (défaut: 600 = 10min)
   */
  async save(state: string, data: OAuthState, ttlSeconds: number = 600): Promise<void> {
    try {
      const client = await redisClientSingleton.getClient();
      const key = this.keyPrefix + state;
      const value = JSON.stringify(data);

      await client.setEx(key, ttlSeconds, value);

      logger.info('OAuth state saved', {
        state: state.substring(0, 8) + '...',
        provider: data.provider,
        ttl: ttlSeconds,
      });
    } catch (error) {
      logger.error('Failed to save OAuth state to Redis', error instanceof Error ? error : undefined);
      throw new Error('Failed to save OAuth state');
    }
  }

  /**
   * Récupère un state OAuth
   * Supprime le state après lecture (use-once pattern)
   *
   * @param state State à récupérer
   * @returns Données du state ou null si inexistant/expiré
   */
  async get(state: string): Promise<OAuthState | null> {
    try {
      const client = await redisClientSingleton.getClient();
      const key = this.keyPrefix + state;

      // Récupérer la valeur
      const value = await client.get(key);

      if (!value) {
        logger.warn('OAuth state not found or expired', {
          state: state.substring(0, 8) + '...',
        });
        return null;
      }

      // Supprimer immédiatement (use-once)
      await client.del(key);

      const data = JSON.parse(value) as OAuthState;

      logger.info('OAuth state retrieved and consumed', {
        state: state.substring(0, 8) + '...',
        provider: data.provider,
      });

      return data;
    } catch (error) {
      logger.error('Failed to get OAuth state from Redis', error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Supprime un state OAuth manuellement
   *
   * @param state State à supprimer
   */
  async delete(state: string): Promise<void> {
    try {
      const client = await redisClientSingleton.getClient();
      const key = this.keyPrefix + state;

      await client.del(key);

      logger.info('OAuth state deleted', {
        state: state.substring(0, 8) + '...',
      });
    } catch (error) {
      logger.error('Failed to delete OAuth state from Redis', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Nettoie les states expirés
   *
   * Note: Redis gère automatiquement l'expiration via TTL,
   * mais cette méthode peut être utilisée pour monitoring/stats
   *
   * @returns Nombre de states supprimés
   */
  async cleanupExpired(): Promise<number> {
    try {
      const client = await redisClientSingleton.getClient();

      // Scanner les clés avec le préfixe
      const keys: string[] = [];
      for await (const key of client.scanIterator({
        MATCH: this.keyPrefix + '*',
        COUNT: 100,
      })) {
        keys.push(key);
      }

      if (keys.length === 0) {
        return 0;
      }

      // Vérifier TTL et supprimer les expirés
      let deletedCount = 0;
      for (const key of keys) {
        const ttl = await client.ttl(key);
        // TTL -2 = clé n'existe pas, -1 = pas d'expiration
        if (ttl === -2) {
          deletedCount++;
        }
      }

      logger.info('OAuth states cleanup completed', {
        totalKeys: keys.length,
        expiredKeys: deletedCount,
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup OAuth states', error instanceof Error ? error : undefined);
      return 0;
    }
  }

  /**
   * Compte le nombre de states actifs
   * Utile pour monitoring
   */
  async count(): Promise<number> {
    try {
      const client = await redisClientSingleton.getClient();
      let count = 0;

      for await (const _key of client.scanIterator({
        MATCH: this.keyPrefix + '*',
        COUNT: 100,
      })) {
        count++;
      }

      return count;
    } catch (error) {
      logger.error('Failed to count OAuth states', error instanceof Error ? error : undefined);
      return 0;
    }
  }
}
