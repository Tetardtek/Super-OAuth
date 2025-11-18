/**
 * Authentication Middleware
 * Validates JWT tokens and populates req.user
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../../application/services/auth.service';
import { userService } from '../../application/services/user.service';
import { ApiResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';

interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json(ApiResponse.unauthorized('Authentication token required'));
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the token
    const payload = await authService.verifyAccessToken(token);

    if (!payload) {
      res.status(401).json(ApiResponse.unauthorized('Invalid or expired token'));
      return;
    }

    // Get user details
    const user = await userService.findById(payload.userId);

    if (!user) {
      res.status(401).json(ApiResponse.unauthorized('User not found'));
      return;
    }

    if (!user.isActive) {
      res.status(401).json(ApiResponse.unauthorized('Account is inactive'));
      return;
    }

    // Add user to request object
    req.user = user;

    next();
  } catch (error) {
    logger.error('🔐 Authentication middleware error', error instanceof Error ? error : undefined);
    res.status(401).json(ApiResponse.unauthorized('Authentication failed'));
  }
};

/**
 * Optional authentication middleware
 * Populates req.user if token is valid, but doesn't block if invalid
 */
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await authService.verifyAccessToken(token);

      if (payload) {
        const user = await userService.findById(payload.userId);
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // Log error but continue without authentication
    logger.warn('🔐 Optional auth middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next();
  }
};

export default authMiddleware;
