import { Request, Response, NextFunction } from 'express';
import rateLimit, { Options, RateLimitRequestHandler } from 'express-rate-limit';
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
 * Crée un rate limiter avec store Redis (initialisation lazy)
 */
const createRedisRateLimiter = async (options: Partial<Options>): Promise<RateLimitRequestHandler> => {
  // Récupérer le client Redis de manière asynchrone
  const client = await redisClientSingleton.getClient();

  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes par défaut
    max: options.max || 100,
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    store: new RedisStore({
      // @ts-expect-error - rate-limit-redis types incompatibles avec redis 4.x client
      sendCommand: (...args: string[]) => client.sendCommand(args),
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

// Limiters initialisés de manière lazy
let apiRateLimitInstance: RateLimitRequestHandler | null = null;
let authRateLimitInstance: RateLimitRequestHandler | null = null;
let registerRateLimitInstance: RateLimitRequestHandler | null = null;
let oauthRateLimitInstance: RateLimitRequestHandler | null = null;

/**
 * General API rate limiting
 * 60 requêtes par minute par IP
 */
export const apiRateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!apiRateLimitInstance) {
    apiRateLimitInstance = await createRedisRateLimiter({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 60,
      message: 'Too many API requests, please slow down',
    });
  }
  return apiRateLimitInstance(req, res, next);
};

/**
 * Auth endpoints rate limiting (login, refresh)
 * 5 tentatives par 15 minutes pour prévenir brute force
 */
export const authRateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!authRateLimitInstance) {
    authRateLimitInstance = await createRedisRateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      message: 'Too many authentication attempts, please try again later',
      skipSuccessfulRequests: true, // Ne compter que les échecs
    });
  }
  return authRateLimitInstance(req, res, next);
};

/**
 * Registration rate limiting
 * 3 enregistrements par heure par IP pour prévenir spam
 */
export const registerRateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!registerRateLimitInstance) {
    registerRateLimitInstance = await createRedisRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 heure
      max: 3,
      message: 'Too many registration attempts, please try again later',
    });
  }
  return registerRateLimitInstance(req, res, next);
};

/**
 * OAuth flow rate limiting
 * 10 OAuth initiations par minute
 */
export const oauthRateLimit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!oauthRateLimitInstance) {
    oauthRateLimitInstance = await createRedisRateLimiter({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 10,
      message: 'Too many OAuth requests, please slow down',
    });
  }
  return oauthRateLimitInstance(req, res, next);
};

/**
 * Middleware pour injecter les headers de rate limit
 * dans toutes les réponses
 */
export const rateLimitHeaders = (_req: Request, _res: Response, next: NextFunction): void => {
  // Les headers sont automatiquement ajoutés par express-rate-limit
  // Ce middleware est un placeholder pour d'éventuelles customisations futures
  next();
};
