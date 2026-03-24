/**
 * User Profile Routes — Consumer-facing API
 *
 * These endpoints are designed for tenant frontends (Clickerz, TetaRdPG, Origins...)
 * to display user profile pages without implementing identity logic.
 *
 * Auth: Bearer token (PKCE access_token from tenant)
 * CORS: dynamic per-tenant (allowed_origins from DB)
 *
 * @version 1.0.0
 */

import { Router, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { authMiddleware, AuthenticatedRequest } from '../../shared/middleware/auth.middleware';
import { userService } from '../../application/services/user.service';
import { userRepository } from '../../infrastructure/services/user.repository';
import { ApiResponse } from '../../shared/utils/response.util';
import { logger } from '../../shared/utils/logger.util';

const router = Router();

// All routes require authentication
router.use((req, res, next) => void authMiddleware(req, res, next));

/**
 * @route   GET /api/v1/user/profile
 * @desc    Get current user profile + linked providers
 * @access  Private (Bearer token)
 * @returns { user: { id, email, nickname, emailVerified, createdAt }, linkedProviders: [...] }
 */
router.get(
  '/profile',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;

    const linkedAccounts = await userService.getLinkedOAuthAccounts(user.id);

    res.json(
      ApiResponse.success({
        user: {
          id: user.id,
          email: user.email?.toString() ?? null,
          nickname: user.nickname,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
        linkedProviders: linkedAccounts.map((a) => ({
          provider: a.provider,
          nickname: a.nickname ?? null,
          avatar: a.avatar ?? null,
          linkedAt: a.linkedAt,
        })),
      })
    );
  })
);

/**
 * @route   PUT /api/v1/user/profile
 * @desc    Update user profile (nickname)
 * @access  Private (Bearer token)
 * @body    { nickname: string }
 */
router.put(
  '/profile',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { nickname } = req.body;

    if (!nickname || typeof nickname !== 'string') {
      res.status(400).json(ApiResponse.error('nickname is required', 'VALIDATION_ERROR'));
      return;
    }

    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 32) {
      res.status(400).json(ApiResponse.error('nickname must be 2-32 characters', 'VALIDATION_ERROR'));
      return;
    }

    await userRepository.updateFields(user.id, { nickname: trimmed });

    logger.info('User profile updated', { userId: user.id, field: 'nickname' });

    res.json(
      ApiResponse.success({
        user: {
          id: user.id,
          email: user.email?.toString() ?? null,
          nickname: trimmed,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      })
    );
  })
);

export default router;
