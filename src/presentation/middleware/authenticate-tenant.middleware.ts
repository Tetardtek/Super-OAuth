import { Request, Response, NextFunction } from 'express';
import { TenantRepository } from '../../infrastructure/services/tenant.repository';

/**
 * Middleware authenticateTenant — Tier 3
 *
 * Valide client_id + client_secret via HMAC-SHA256.
 * Injecte req.tenantId si valide.
 * tenantId URL param seul → 401 (impossible de forger).
 */
export function createAuthenticateTenant(tenantRepository: TenantRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientId = req.headers['x-client-id'] as string | undefined;
    const clientSecret = req.headers['x-client-secret'] as string | undefined;

    if (!clientId || !clientSecret) {
      res.status(401).json({
        success: false,
        error: 'Tenant authentication required: x-client-id and x-client-secret headers missing',
      });
      return;
    }

    const tenantId = await tenantRepository.verifyCredentials(clientId, clientSecret);

    if (!tenantId) {
      res.status(401).json({
        success: false,
        error: 'Invalid tenant credentials',
      });
      return;
    }

    // Inject authenticated tenantId — URL param alone is insufficient
    (req as Request & { tenantId: string }).tenantId = tenantId;
    next();
  };
}

// Extend Express Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}
