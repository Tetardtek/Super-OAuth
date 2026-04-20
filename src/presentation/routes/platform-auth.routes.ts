import { Router, Response } from 'express';
import { validateBody, ValidatedRequest } from '../middleware/validation.middleware';
import { platformAuthValidators } from '../validators/platform-auth.validators';
import { DIContainer } from '../../infrastructure/di/container';
import { logger } from '../../shared/utils/logger.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { apiRateLimit } from '../middleware/rate-limit.middleware';
import { PlatformPasswordResetService } from '../../infrastructure/services/platform-password-reset.service';
import { EmailService } from '../../infrastructure/email/email.service';

const router = Router();
const container = DIContainer.getInstance();

interface SignupBody {
  email: string;
  password: string;
}

/**
 * POST /platform/auth/signup
 * Register a new platform user (SaaS client owner).
 *
 * Flow (SOA-002 — Flow A, separated from tenant creation) :
 * - Creates platform_users row with emailVerified=false
 * - Issues a verification token (24h TTL)
 * - Returns 202 Accepted with generic message (no token in response body)
 *
 * The raw token is logged in non-production and dispatched via email in
 * production (email integration wired in a follow-up step).
 */
router.post(
  '/signup',
  apiRateLimit,
  validateBody(platformAuthValidators.signup),
  asyncHandler(async (req: ValidatedRequest, res: Response) => {
    const { email, password } = (req.validatedBody ?? req.body) as SignupBody;

    try {
      const useCase = container.getRegisterPlatformUserUseCase();
      const result = await useCase.execute({ email, password });

      if (result.status === 'already_verified') {
        // Same generic response as success — avoid email enumeration
        res.status(202).json({
          success: true,
          message: 'VERIFICATION_EMAIL_SENT',
          data: { email },
        });
        return;
      }

      logger.info('Platform user signup', {
        platformUserId: result.platformUserId,
        email: result.email,
        status: result.status,
      });

      if (process.env.NODE_ENV !== 'production') {
        logger.debug('Platform verification token (dev only)', {
          token: result.verificationToken,
        });
      }

      const emailService = container.get<EmailService>('EmailService');
      try {
        await emailService.sendPlatformVerificationEmail(result.email, result.verificationToken);
      } catch (err) {
        logger.error(
          'Failed to dispatch platform verification email',
          err instanceof Error ? err : undefined,
          { email: result.email, status: result.status }
        );
      }

      res.status(202).json({
        success: true,
        message: 'VERIFICATION_EMAIL_SENT',
        data: {
          email: result.email,
          expiresAt: result.verificationTokenExpiresAt.toISOString(),
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Platform signup validation failed', { error: errorMessage, ip: req.ip });

      // Value Object validation errors (Email / Password) surface as 400
      res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: errorMessage,
      });
    }
  })
);

/**
 * POST /platform/auth/login
 * Authenticates a platform user and returns access + refresh tokens.
 */
router.post(
  '/login',
  apiRateLimit,
  validateBody(platformAuthValidators.login),
  asyncHandler(async (req: ValidatedRequest, res: Response) => {
    const { email, password } = (req.validatedBody ?? req.body) as {
      email: string;
      password: string;
    };

    const useCase = container.getLoginPlatformUserUseCase();
    const result = await useCase.execute({
      email,
      password,
      metadata: {
        ...(req.ip && { ipAddress: req.ip }),
        ...(req.header('user-agent') && { userAgent: req.header('user-agent') as string }),
      },
    });

    if (result.status === 'ok') {
      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          platformUser: result.platformUser,
        },
      });
      return;
    }

    const codeMap: Record<string, { status: number; message: string }> = {
      invalid_credentials: { status: 401, message: 'Invalid email or password' },
      email_not_verified: { status: 403, message: 'Email not verified' },
      requires_password_reset: { status: 403, message: 'Password reset required' },
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
 * POST /platform/auth/refresh
 * Rotates the refresh token (revokes old, issues new pair).
 */
router.post(
  '/refresh',
  apiRateLimit,
  validateBody(platformAuthValidators.refresh),
  asyncHandler(async (req: ValidatedRequest, res: Response) => {
    const { refreshToken } = (req.validatedBody ?? req.body) as { refreshToken: string };

    const useCase = container.getRefreshPlatformSessionUseCase();
    const result = await useCase.execute({
      refreshToken,
      metadata: {
        ...(req.ip && { ipAddress: req.ip }),
        ...(req.header('user-agent') && { userAgent: req.header('user-agent') as string }),
      },
    });

    if (result.status === 'ok') {
      res.status(200).json({
        success: true,
        data: { accessToken: result.accessToken, refreshToken: result.refreshToken },
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'INVALID_REFRESH_TOKEN',
      message: 'Refresh token is invalid or expired',
    });
  })
);

/**
 * POST /platform/auth/logout
 * Revokes a platform session by refresh token. Idempotent.
 */
router.post(
  '/logout',
  apiRateLimit,
  validateBody(platformAuthValidators.logout),
  asyncHandler(async (req: ValidatedRequest, res: Response) => {
    const { refreshToken } = (req.validatedBody ?? req.body) as { refreshToken: string };
    await container.getLogoutPlatformUserUseCase().execute({ refreshToken });
    res.status(204).send();
  })
);

/**
 * GET /platform/auth/verify-email/:token
 * Verifies a platform user's email using a single-use token.
 */
router.get(
  '/verify-email/:token',
  apiRateLimit,
  asyncHandler(async (req, res: Response) => {
    const rawToken = req.params.token;
    if (!rawToken || rawToken.length < 32) {
      res.status(400).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Verification token missing or malformed',
      });
      return;
    }

    const useCase = container.getVerifyPlatformEmailUseCase();
    const result = await useCase.execute({ rawToken });

    if (result.status === 'verified') {
      logger.info('Platform email verified', {
        platformUserId: result.platformUserId,
        email: result.email,
      });
      res.status(200).json({
        success: true,
        message: 'EMAIL_VERIFIED',
        data: { email: result.email },
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Verification token is invalid, expired, or already used',
    });
  })
);

/**
 * POST /platform/auth/password-reset/request
 * Issues a reset token for the given email. Always returns 202 to prevent
 * email enumeration — caller cannot distinguish "email known" from "email unknown".
 */
router.post(
  '/password-reset/request',
  apiRateLimit,
  validateBody(platformAuthValidators.passwordResetRequest),
  asyncHandler(async (req: ValidatedRequest, res: Response) => {
    const { email } = (req.validatedBody ?? req.body) as { email: string };

    const service = container.get<PlatformPasswordResetService>('PlatformPasswordResetService');
    const result = await service.requestReset(email);

    if (result.issued && process.env.NODE_ENV !== 'production') {
      logger.debug('Platform password reset token (dev only)', {
        token: result.rawToken,
      });
    }

    if (result.issued && result.rawToken) {
      const emailService = container.get<EmailService>('EmailService');
      try {
        await emailService.sendPlatformPasswordResetEmail(email, result.rawToken);
      } catch (err) {
        logger.error(
          'Failed to dispatch platform password reset email',
          err instanceof Error ? err : undefined,
          { email }
        );
      }
    }

    res.status(202).json({
      success: true,
      message: 'PASSWORD_RESET_EMAIL_SENT',
      data: { email },
    });
  })
);

/**
 * POST /platform/auth/password-reset/confirm
 * Consumes a reset token, sets the new password, and revokes all active sessions.
 */
router.post(
  '/password-reset/confirm',
  apiRateLimit,
  validateBody(platformAuthValidators.passwordResetConfirm),
  asyncHandler(async (req: ValidatedRequest, res: Response) => {
    const { token, newPassword } = (req.validatedBody ?? req.body) as {
      token: string;
      newPassword: string;
    };

    const service = container.get<PlatformPasswordResetService>('PlatformPasswordResetService');
    const result = await service.confirmReset(token, newPassword);

    if (result.success) {
      logger.info('Platform password reset confirmed', {
        platformUserId: result.platformUserId,
      });
      res.status(200).json({
        success: true,
        message: 'PASSWORD_RESET_SUCCESS',
      });
      return;
    }

    const codeMap: Record<string, { status: number; message: string }> = {
      weak_password: { status: 400, message: 'Password does not meet requirements' },
      invalid_token: {
        status: 400,
        message: 'Reset token is invalid, expired, or already used',
      },
    };
    const mapped = codeMap[result.reason ?? 'invalid_token'];
    res.status(mapped.status).json({
      success: false,
      error: (result.reason ?? 'invalid_token').toUpperCase(),
      message: mapped.message,
    });
  })
);

export { router as platformAuthRoutes };
