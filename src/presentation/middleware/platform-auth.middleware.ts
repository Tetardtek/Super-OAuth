import { Request, Response, NextFunction } from 'express';
import { DIContainer } from '../../infrastructure/di/container';
import { PlatformTokenService } from '../../infrastructure/services/platform-token.service';

export interface PlatformAuthenticatedRequest extends Request {
  platformUser?: { id: string; role: 'suadmin' | 'client'; jti: string };
}

/**
 * Requires a valid platform-audience access token on the request.
 * Enforces invariant #10 (SOA-002) : tenant tokens are rejected here by
 * audience mismatch at JWT verification.
 */
export function requireAuthPlatform(
  req: PlatformAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Missing or malformed Authorization header',
    });
    return;
  }

  const token = header.substring('Bearer '.length).trim();
  const tokenService = DIContainer.getInstance().get<PlatformTokenService>('PlatformTokenService');
  const claims = tokenService.verifyAccessToken(token);

  if (!claims) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired platform token',
    });
    return;
  }

  req.platformUser = { id: claims.platformUserId, role: claims.role, jti: claims.jti };
  next();
}

export function requireSuAdmin(
  req: PlatformAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.platformUser || req.platformUser.role !== 'suadmin') {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Requires SUAdmin role',
    });
    return;
  }
  next();
}
