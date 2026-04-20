import { Router, Response } from 'express';
import { validateBody, ValidatedRequest } from '../middleware/validation.middleware';
import {
  requireAuthPlatform,
  PlatformAuthenticatedRequest,
} from '../middleware/platform-auth.middleware';
import { platformTenantsValidators } from '../validators/platform-tenants.validators';
import { DIContainer } from '../../infrastructure/di/container';
import { logger } from '../../shared/utils/logger.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { apiRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();
const container = DIContainer.getInstance();

// Every tenant route requires an authenticated platform user
router.use(requireAuthPlatform);

/**
 * POST /platform/tenants
 * Creates a new tenant owned by the authenticated platform user.
 * Requires emailVerified=true (enforced in the use case).
 */
router.post(
  '/',
  apiRateLimit,
  validateBody(platformTenantsValidators.create),
  asyncHandler(async (req: PlatformAuthenticatedRequest & ValidatedRequest, res: Response) => {
    const body = (req.validatedBody ?? req.body) as {
      name: string;
      webhookUrl?: string;
      allowedOrigins?: string[];
      redirectUris?: string[];
      retentionDays?: number;
    };

    const useCase = container.getCreateTenantUseCase();
    const result = await useCase.execute({
      platformUserId: req.platformUser!.id,
      name: body.name,
      ...(body.webhookUrl !== undefined && { webhookUrl: body.webhookUrl }),
      ...(body.allowedOrigins !== undefined && { allowedOrigins: body.allowedOrigins }),
      ...(body.redirectUris !== undefined && { redirectUris: body.redirectUris }),
      ...(body.retentionDays !== undefined && { retentionDays: body.retentionDays }),
    });

    if (result.status === 'created') {
      logger.info('Tenant created', {
        clientId: result.tenant.clientId,
        ownerId: req.platformUser!.id,
      });
      res.status(201).json({
        success: true,
        data: {
          tenant: result.tenant,
          clientSecret: result.clientSecret,
        },
      });
      return;
    }

    const codeMap: Record<string, { status: number; message: string }> = {
      email_not_verified: { status: 403, message: 'Email must be verified to create a tenant' },
      user_not_found: { status: 404, message: 'Platform user not found' },
      name_taken: { status: 409, message: 'Tenant name already in use' },
    };
    const mapped = codeMap[result.status];
    res.status(mapped.status).json({
      success: false,
      error: result.status.toUpperCase(),
      message: mapped.message,
    });
  })
);

/**
 * GET /platform/tenants
 * Lists tenants owned by the authenticated platform user.
 */
router.get(
  '/',
  asyncHandler(async (req: PlatformAuthenticatedRequest, res: Response) => {
    const useCase = container.getListOwnedTenantsUseCase();
    const tenants = await useCase.execute(req.platformUser!.id);
    res.status(200).json({ success: true, data: { tenants } });
  })
);

/**
 * PATCH /platform/tenants/:clientId
 * Updates mutable tenant fields (owner-only).
 */
router.patch(
  '/:clientId',
  apiRateLimit,
  validateBody(platformTenantsValidators.update),
  asyncHandler(async (req: PlatformAuthenticatedRequest & ValidatedRequest, res: Response) => {
    const clientId = req.params.clientId;
    const patch = (req.validatedBody ?? req.body) as {
      webhookUrl?: string | null;
      allowedOrigins?: string[] | null;
      redirectUris?: string[] | null;
      retentionDays?: number;
    };

    const result = await container.getUpdateTenantUseCase().execute({
      clientId,
      platformUserId: req.platformUser!.id,
      patch,
    });

    if (result.status === 'updated') {
      res.status(204).send();
      return;
    }

    const codeMap: Record<string, { status: number; message: string }> = {
      not_found: { status: 404, message: 'Tenant not found' },
      forbidden: { status: 403, message: 'Only the owner can update this tenant' },
    };
    const mapped = codeMap[result.status];
    res.status(mapped.status).json({
      success: false,
      error: result.status.toUpperCase(),
      message: mapped.message,
    });
  })
);

/**
 * DELETE /platform/tenants/:clientId
 * Soft-deletes (deactivates) a tenant owned by the caller.
 */
router.delete(
  '/:clientId',
  apiRateLimit,
  asyncHandler(async (req: PlatformAuthenticatedRequest, res: Response) => {
    const clientId = req.params.clientId;
    const result = await container.getDeleteTenantUseCase().execute({
      clientId,
      platformUserId: req.platformUser!.id,
    });

    if (result.status === 'deactivated') {
      res.status(204).send();
      return;
    }

    const codeMap: Record<string, { status: number; message: string }> = {
      not_found: { status: 404, message: 'Tenant not found' },
      forbidden: { status: 403, message: 'Only the owner can delete this tenant' },
    };
    const mapped = codeMap[result.status];
    res.status(mapped.status).json({
      success: false,
      error: result.status.toUpperCase(),
      message: mapped.message,
    });
  })
);

export { router as platformTenantsRoutes };
