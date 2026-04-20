import { Router, Response } from 'express';
import { validateBody, ValidatedRequest } from '../middleware/validation.middleware';
import { requireAuthPlatform } from '../middleware/platform-auth.middleware';
import {
  requireTenantAccess,
  requireTenantOwner,
  TenantAuthenticatedRequest,
} from '../middleware/tenant-access.middleware';
import { platformRbacValidators } from '../validators/platform-rbac.validators';
import { DIContainer } from '../../infrastructure/di/container';
import { logger } from '../../shared/utils/logger.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { apiRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();
const container = DIContainer.getInstance();

/**
 * POST /platform/invitations/accept  (public — token-based)
 * Accepts a tenant admin invitation. The raw token from the email link is
 * hashed server-side to find the invitation.
 */
router.post(
  '/invitations/accept',
  apiRateLimit,
  validateBody(platformRbacValidators.accept),
  asyncHandler(async (req: ValidatedRequest, res: Response) => {
    const body = (req.validatedBody ?? req.body) as { token: string; password: string };

    const metadata: { ipAddress?: string; userAgent?: string } = {};
    if (req.ip) metadata.ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    if (userAgent) metadata.userAgent = userAgent;

    const result = await container.getAcceptTenantInvitationUseCase().execute({
      rawToken: body.token,
      password: body.password,
      metadata,
    });

    if (result.status === 'accepted') {
      logger.info('Tenant invitation accepted', {
        platformUserId: result.platformUser.id,
        tenantId: result.tenant.clientId,
      });
      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          platformUser: result.platformUser,
          tenant: result.tenant,
        },
      });
      return;
    }

    const codeMap: Record<string, { status: number; message: string }> = {
      invalid_token: { status: 404, message: 'Invitation not found or invalid' },
      expired: { status: 410, message: 'Invitation has expired' },
      already_used: { status: 409, message: 'Invitation has already been used' },
      invalid_credentials: { status: 401, message: 'Invalid credentials' },
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
 * POST /platform/tenants/:clientId/invitations  (owner only)
 * Invites a new admin by email. Idempotent on (email, tenant).
 */
router.post(
  '/tenants/:clientId/invitations',
  requireAuthPlatform,
  requireTenantOwner,
  apiRateLimit,
  validateBody(platformRbacValidators.invite),
  asyncHandler(async (req: TenantAuthenticatedRequest & ValidatedRequest, res: Response) => {
    const body = (req.validatedBody ?? req.body) as { email: string };

    const platformUserRepo = container.get<
      import('../../domain/repositories/platform-user.repository.interface').IPlatformUserRepository
    >('PlatformUserRepository');
    const inviterUser = await platformUserRepo.findById(req.platformUser!.id);
    if (!inviterUser) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Inviter user not found',
      });
      return;
    }

    const result = await container.getInviteTenantAdminUseCase().execute({
      tenantId: req.tenantMembership!.tenantId,
      inviterPlatformUserId: req.platformUser!.id,
      inviterEmail: inviterUser.email.toString(),
      email: body.email,
    });

    if (result.status === 'invited' || result.status === 'resent') {
      logger.info('Tenant invitation sent', {
        tenantId: req.tenantMembership!.tenantId,
        outcome: result.status,
      });
      res.status(result.status === 'invited' ? 201 : 200).json({
        success: true,
        data: { status: result.status, expiresAt: result.expiresAt.toISOString() },
      });
      return;
    }

    const codeMap: Record<string, { status: number; message: string }> = {
      already_member: { status: 409, message: 'This email is already a member of the tenant' },
      tenant_not_found: { status: 404, message: 'Tenant not found' },
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
 * GET /platform/tenants/:clientId/invitations  (owner only)
 * Lists pending invitations for the tenant.
 */
router.get(
  '/tenants/:clientId/invitations',
  requireAuthPlatform,
  requireTenantOwner,
  asyncHandler(async (req: TenantAuthenticatedRequest, res: Response) => {
    const repo = container.get<
      import('../../infrastructure/database/repositories/tenant-invitation.repository').TenantInvitationRepository
    >('TenantInvitationRepository');
    const rows = await repo.listPendingByTenant(req.tenantMembership!.tenantId);
    res.status(200).json({
      success: true,
      data: {
        invitations: rows.map((row) => ({
          id: row.id,
          email: row.email,
          role: row.role,
          invitedBy: row.invitedBy,
          expiresAt: row.expiresAt.toISOString(),
          createdAt: row.createdAt.toISOString(),
        })),
      },
    });
  })
);

/**
 * DELETE /platform/tenants/:clientId/invitations/:invitationId  (owner only)
 * Soft-cancels a pending invitation.
 */
router.delete(
  '/tenants/:clientId/invitations/:invitationId',
  requireAuthPlatform,
  requireTenantOwner,
  apiRateLimit,
  asyncHandler(async (req: TenantAuthenticatedRequest, res: Response) => {
    const invitationId = req.params.invitationId;
    const result = await container.getCancelTenantInvitationUseCase().execute({
      tenantId: req.tenantMembership!.tenantId,
      invitationId,
      cancelledBy: req.platformUser!.id,
    });

    if (result.status === 'cancelled') {
      res.status(204).send();
      return;
    }

    const codeMap: Record<string, { status: number; message: string }> = {
      not_found: { status: 404, message: 'Invitation not found' },
      already_used: { status: 409, message: 'Invitation has already been used' },
      already_cancelled: { status: 409, message: 'Invitation already cancelled' },
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
 * GET /platform/tenants/:clientId/admins  (any tenant member)
 * Lists all admins (owner + admins) of the tenant.
 */
router.get(
  '/tenants/:clientId/admins',
  requireAuthPlatform,
  requireTenantAccess,
  asyncHandler(async (req: TenantAuthenticatedRequest, res: Response) => {
    const repo = container.get<
      import('../../infrastructure/database/repositories/tenant-admin.repository').TenantAdminRepository
    >('TenantAdminRepository');
    const rows = await repo.listByTenant(req.tenantMembership!.tenantId);
    res.status(200).json({
      success: true,
      data: {
        admins: rows.map((row) => ({
          platformUserId: row.platformUserId,
          role: row.role,
          invitedBy: row.invitedBy,
          joinedAt: row.joinedAt.toISOString(),
        })),
      },
    });
  })
);

/**
 * DELETE /platform/tenants/:clientId/admins/:platformUserId  (owner only)
 * Revokes a tenant admin (not the owner — use transfer for that in P4).
 */
router.delete(
  '/tenants/:clientId/admins/:platformUserId',
  requireAuthPlatform,
  requireTenantOwner,
  apiRateLimit,
  asyncHandler(async (req: TenantAuthenticatedRequest, res: Response) => {
    const targetPlatformUserId = req.params.platformUserId;
    const result = await container.getRevokeTenantAdminUseCase().execute({
      tenantId: req.tenantMembership!.tenantId,
      targetPlatformUserId,
    });

    if (result.status === 'revoked') {
      logger.info('Tenant admin revoked', {
        tenantId: req.tenantMembership!.tenantId,
        targetPlatformUserId,
      });
      res.status(204).send();
      return;
    }

    const codeMap: Record<string, { status: number; message: string }> = {
      not_found: { status: 404, message: 'Admin not found for this tenant' },
      cannot_revoke_owner: {
        status: 409,
        message: 'Cannot revoke the tenant owner — use ownership transfer instead',
      },
    };
    const mapped = codeMap[result.status];
    res.status(mapped.status).json({
      success: false,
      error: result.status.toUpperCase(),
      message: mapped.message,
    });
  })
);

export { router as platformRbacRoutes };
