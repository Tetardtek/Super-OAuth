import { createClient, RedisClientType } from 'redis';
import { logger } from '@shared/utils/logger.util';

/**
 * Redis Client Singleton
 * Gère la connexion unique à Redis pour toute l'application
 */
class RedisClientSingleton {
  private static instance: RedisClientSingleton;
  private client: RedisClientType | null = null;
  private isConnecting = false;
  private isConnected = false;

  private constructor() {}

  static getInstance(): RedisClientSingleton {
    if (!RedisClientSingleton.instance) {
      RedisClientSingleton.instance = new RedisClientSingleton();
    }
    return RedisClientSingleton.instance;
  }

  async getClient(): Promise<RedisClientType> {
    if (this.isConnected && this.client) {
      return this.client;
    }

    if (this.isConnecting) {
      // Attendre que la connexion en cours se termine
      await this.waitForConnection();
      if (this.client) return this.client;
    }

    this.isConnecting = true;

    try {
      const redisUrl = process.env.REDIS_URI || 'redis://localhost:6379';

      const options: {
        url: string;
        password?: string;
        database: number;
        socket: {
          reconnectStrategy: (retries: number) => number | Error;
        };
      } = {
        url: redisUrl,
        database: parseInt(process.env.REDIS_DB || '0', 10),
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis: Max reconnection attempts reached');
              return new Error('Redis: Too many reconnection attempts');
            }
            const delay = Math.min(retries * 100, 3000);
            logger.info(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
          },
        },
      };

      if (process.env.REDIS_PASSWORD) {
        options.password = process.env.REDIS_PASSWORD;
      }

      this.client = createClient(options);

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        logger.info('Redis: Connection established');
      });

      this.client.on('ready', () => {
        logger.info('Redis: Ready to accept commands');
        this.isConnected = true;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis: Reconnecting...');
      });

      await this.client.connect();

      this.isConnecting = false;
      this.isConnected = true;

      logger.info('Redis client initialized successfully');
      return this.client;
    } catch (error) {
      this.isConnecting = false;
      this.isConnected = false;
      logger.error('Failed to initialize Redis client:', error instanceof Error ? error : undefined);
      throw error instanceof Error ? error : new Error('Failed to initialize Redis client');
    }
  }

  private async waitForConnection(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max

    while (this.isConnecting && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Redis connection timeout');
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis client disconnected');
    }
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }
}

export const redisClientSingleton = RedisClientSingleton.getInstance();
