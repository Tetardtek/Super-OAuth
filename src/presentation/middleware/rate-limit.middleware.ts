import { Request, Response, NextFunction } from 'express';
import rateLimit, { Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClientSingleton } from '../../infrastructure/redis/redis-client';
import { logger } from '../../shared/utils/logger.util';

/**
 * Rate Limiting Middleware avec Redis
 *
 * Utilise Redis pour le stockage distribué des compteurs de rate limiting,
 * permettant le scaling horizontal de l'application.
 *
 * Limiters disponibles :
 * - apiRateLimit: Général (60 req/min)
 * - authRateLimit: Auth endpoints (5 req/15min)
 * - registerRateLimit: Registration (3 req/hour)
 * - oauthRateLimit: OAuth flow (10 req/min)
 */

/**
 * Crée un rate limiter avec store Redis
 */
const createRedisRateLimiter = (options: Partial<Options>) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes par défaut
    max: options.max || 100,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    store: new RedisStore({
      // @ts-expect-error - rate-limit-redis types incompatibles avec redis 4.x client
      client: redisClientSingleton.getClient(),
      prefix: 'rl:', // Rate limit key prefix
    }),
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        limit: options.max,
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests, please try again later',
        },
      });
    },
    ...options,
  });
};

/**
 * General API rate limiting
 * 60 requêtes par minute par IP
 */
export const apiRateLimit = createRedisRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many API requests, please slow down',
});

/**
 * Auth endpoints rate limiting (login, refresh)
 * 5 tentatives par 15 minutes pour prévenir brute force
 */
export const authRateLimit = createRedisRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true, // Ne compter que les échecs
});

/**
 * Registration rate limiting
 * 3 enregistrements par heure par IP pour prévenir spam
 */
export const registerRateLimit = createRedisRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 3,
  message: 'Too many registration attempts, please try again later',
});

/**
 * OAuth flow rate limiting
 * 10 OAuth initiations par minute
 */
export const oauthRateLimit = createRedisRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many OAuth requests, please slow down',
});

/**
 * Middleware pour injecter les headers de rate limit
 * dans toutes les réponses
 */
export const rateLimitHeaders = (_req: Request, _res: Response, next: NextFunction): void => {
  // Les headers sont automatiquement ajoutés par express-rate-limit
  // Ce middleware est un placeholder pour d'éventuelles customisations futures
  next();
};
