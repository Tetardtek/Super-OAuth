/**
 * Authentication Middleware
 * Validates JWT tokens and populates req.user
 * Supports both global tokens (dashboard) and tenant-scoped tokens (PKCE clients)
 * @version 2.0.0
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from '../../application/services/auth.service';
import { userService } from '../../application/services/user.service';
import { DIContainer } from '../../infrastructure/di/container';
import { TenantTokenService } from '../../infrastructure/services/tenant-token.service';
import { ApiResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { User } from '../../domain/entities/user.entity';

export interface AuthenticatedRequest extends Request {
  user?: User;
  tenantId?: string;
}

/**
 * Extract tenantId from JWT without verification (decode only).
 * Used to resolve the correct signing secret before full verification.
 */
function extractTenantId(token: string): string | null {
  try {
    const decoded = jwt.decode(token) as { tenantId?: string } | null;
    return decoded?.tenantId ?? null;
  } catch {
    return null;
  }
}

/**
 * Middleware to authenticate JWT tokens.
 * Strategy: try global secret first (fast path for dashboard),
 * then resolve tenant secret for PKCE client tokens.
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

    const token = authHeader.substring(7);

    // Fast path: try global secret (works for dashboard + origins tenant)
    let payload = await authService.verifyAccessToken(token);

    // Slow path: resolve tenant-specific secret
    if (!payload) {
      const tenantId = extractTenantId(token);
      if (tenantId) {
        const tenantTokenService = DIContainer.getInstance().get<TenantTokenService>('TenantTokenService');
        payload = await tenantTokenService.verifyAccessToken(token, tenantId);
      }
    }

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

    // Add user and tenantId to request object
    req.user = user;
    req.tenantId = payload.tenantId;

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

      // Fast path: global secret
      let payload = await authService.verifyAccessToken(token);

      // Slow path: tenant secret
      if (!payload) {
        const tenantId = extractTenantId(token);
        if (tenantId) {
          const tenantTokenService = DIContainer.getInstance().get<TenantTokenService>('TenantTokenService');
          payload = await tenantTokenService.verifyAccessToken(token, tenantId);
        }
      }

      if (payload) {
        const user = await userService.findById(payload.userId);
        if (user && user.isActive) {
          req.user = user;
          req.tenantId = payload.tenantId;
        }
      }
    }

    next();
  } catch (error) {
    logger.warn('🔐 Optional auth middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next();
  }
};

export default authMiddleware;
