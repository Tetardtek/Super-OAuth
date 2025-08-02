import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getSecurityConfig } from '../../shared/config/security.config';
import { logger } from '../../shared/utils/logger.util';
import { DIContainer } from '../../infrastructure/di/container';
import { IUserRepository } from '../../application/interfaces/repositories.interface';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  nickname: string;
  isActive: boolean;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const securityConfig = getSecurityConfig();

  if (!token) {
    logger.warn('Missing authorization token', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Access token is required'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, securityConfig.jwt.accessTokenSecret) as any;
    
    // Verify token type (should be access token)
    if (decoded.type !== 'access') {
      logger.warn('Invalid token type provided', {
        path: req.path,
        method: req.method,
        tokenType: decoded.type,
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid token type'
      });
      return;
    }

    // Get fresh user data from database
    const userRepository = DIContainer.getInstance().get('UserRepository') as IUserRepository;
    const user = await userRepository.findById(decoded.userId);

    if (!user || !user.isActive) {
      logger.warn('User not found or inactive', {
        path: req.path,
        method: req.method,
        userId: decoded.userId,
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid access token'
      });
      return;
    }

    // Attach user info to request
    (req as any).user = {
      id: user.id,
      email: user.email?.toString() || '',
      nickname: user.nickname.toString(),
      isActive: user.isActive
    };

    next();
  } catch (error) {
    logger.warn('Token verification failed', {
      path: req.path,
      method: req.method,
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip
    });

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Access token has expired'
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid access token'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  const securityConfig = getSecurityConfig();

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, securityConfig.jwt.accessTokenSecret) as any;
    
    if (decoded.type === 'access') {
      (req as any).user = {
        id: decoded.userId,
        email: decoded.email,
        nickname: decoded.nickname,
        isActive: decoded.isActive || true
      };
    }

    next();
  } catch (error) {
    // In optional auth, we just log the error and continue
    logger.debug('Optional auth token verification failed', {
      path: req.path,
      method: req.method,
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip
    });
    
    next();
  }
};
