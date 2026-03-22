/**
 * Tenant validation middleware
 *
 * Resolves tenantId from query param (or defaults to 'origins'),
 * validates it exists in DB via TenantValidationService,
 * and attaches it to req.tenantId.
 *
 * Replaces hardcoded VALID_TENANTS whitelist (ADR-008 [SG1]).
 */

import { Response, NextFunction } from 'express';
import { TenantValidationService } from '../../infrastructure/services/tenant-validation.service';
import { ApiResponse } from '../utils/response.util';
import { AuthenticatedRequest } from './auth.middleware';

const DEFAULT_TENANT = 'origins';

/**
 * Middleware for public routes (register, login, OAuth start).
 * Reads tenantId from query param, defaults to 'origins'.
 */
export const validateTenant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const tenantId = (req.query.tenantId as string | undefined) || DEFAULT_TENANT;

  const tenantService = TenantValidationService.getInstance();
  const exists = await tenantService.exists(tenantId);

  if (!exists) {
    res.status(400).json(ApiResponse.error('Unknown tenant', 'INVALID_TENANT'));
    return;
  }

  req.tenantId = tenantId;
  next();
};

/**
 * Middleware for authenticated routes where tenantId comes from JWT.
 * Validates the tenantId already set by authMiddleware.
 */
export const validateAuthenticatedTenant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const tenantId = req.tenantId;

  if (!tenantId) {
    res.status(400).json(ApiResponse.error('Tenant context missing', 'MISSING_TENANT'));
    return;
  }

  const tenantService = TenantValidationService.getInstance();
  const exists = await tenantService.exists(tenantId);

  if (!exists) {
    res.status(400).json(ApiResponse.error('Unknown tenant', 'INVALID_TENANT'));
    return;
  }

  next();
};
