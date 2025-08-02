import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/utils/logger.util';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// Simple in-memory rate limit store
// In production, use Redis or similar
const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware
 */
export const rateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    // Initialize or get existing entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + options.windowMs
      };
    }

    // Check if request is within the current window
    if (store[key].resetTime > now) {
      store[key].count++;

      if (store[key].count > options.maxRequests) {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          count: store[key].count,
          limit: options.maxRequests
        });

        res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests, please try again later',
          retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
        });
        return;
      }
    }

    next();
  };
};

/**
 * Auth-specific rate limiting
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later'
});

/**
 * General API rate limiting
 */
export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'Too many requests, please try again later'
});
