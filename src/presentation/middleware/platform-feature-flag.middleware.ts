import { Request, Response, NextFunction } from 'express';

/**
 * Kill switch for the entire /api/v1/platform/* surface (SOA-002 P6).
 *
 * Set PLATFORM_USERS_ENABLED=false in the env to return 503 on every platform
 * endpoint (signup, login, tenants, admins, invitations, transfers, providers).
 * Existing JWT sessions in clients remain valid until they hit an endpoint —
 * the frontend layout surfaces a maintenance banner.
 *
 * Rollback 1-min : flip the env var + pm2 reload. Backend and frontend stay
 * consistent because the frontend polls the status endpoint on mount.
 *
 * The /status endpoint itself is exempt so the frontend can always probe.
 */
export function platformFeatureFlag(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith('/status')) {
    next();
    return;
  }

  const enabled = process.env.PLATFORM_USERS_ENABLED !== 'false';
  if (!enabled) {
    res.status(503).json({
      success: false,
      error: 'PLATFORM_DISABLED',
      message: 'Platform users feature is temporarily disabled for maintenance.',
    });
    return;
  }

  next();
}
