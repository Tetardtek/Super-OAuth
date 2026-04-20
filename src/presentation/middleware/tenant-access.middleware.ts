import { Response, NextFunction } from 'express';
import { DIContainer } from '../../infrastructure/di/container';
import { TenantAdminRepository } from '../../infrastructure/database/repositories/tenant-admin.repository';
import { PlatformAuthenticatedRequest } from './platform-auth.middleware';

export interface TenantAuthenticatedRequest extends PlatformAuthenticatedRequest {
  tenantMembership?: { tenantId: string; role: 'owner' | 'admin' };
}

/**
 * Resolves the caller's membership on the tenant referenced by `:clientId`.
 *
 * Invariant #9 (data isolation inter-tenant) : non-members see 404, not 403 —
 * this prevents tenant existence enumeration by outsiders. An outsider and a
 * non-existent tenant are indistinguishable from the API surface.
 *
 * Must run AFTER requireAuthPlatform (which injects req.platformUser).
 */
export async function requireTenantAccess(
  req: TenantAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.platformUser) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Missing platform authentication',
    });
    return;
  }

  const clientId = req.params.clientId;
  if (!clientId) {
    res.status(400).json({
      success: false,
      error: 'BAD_REQUEST',
      message: 'Missing tenant client_id in path',
    });
    return;
  }

  const tenantAdminRepo = DIContainer.getInstance().get<TenantAdminRepository>(
    'TenantAdminRepository'
  );
  const membership = await tenantAdminRepo.findMembership(req.platformUser.id, clientId);

  if (!membership) {
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Tenant not found',
    });
    return;
  }

  req.tenantMembership = { tenantId: clientId, role: membership.role };
  next();
}

/**
 * Owner-only gate. Use after requireTenantAccess — or as a standalone check
 * that performs both lookups in sequence.
 *
 * Invariant #2 : non-owner (admin) receives 403, not 404, because their
 * membership is already established — they just lack the privilege.
 */
export async function requireTenantOwner(
  req: TenantAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.tenantMembership) {
    await new Promise<void>((resolve) => {
      requireTenantAccess(req, res, () => resolve());
    });
    if (res.headersSent) return;
  }

  if (req.tenantMembership?.role !== 'owner') {
    res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'Only the tenant owner can perform this action',
    });
    return;
  }

  next();
}
