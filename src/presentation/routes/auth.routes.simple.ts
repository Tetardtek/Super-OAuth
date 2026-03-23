import { Router, Request, Response } from 'express';
import { validateBody, validateParams, ValidatedRequest } from '../middleware/validation.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { authValidators } from '../validators/request.validators';
import { DIContainer } from '../../infrastructure/di/container';
import { logger } from '../../shared/utils/logger.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { authRateLimit, apiRateLimit } from '../middleware/rate-limit.middleware';
import { validateTenant } from '../../shared/middleware/tenant.middleware';
import Joi from 'joi';

interface AuthenticatedRequest extends ValidatedRequest {
  user?: { id: string; email?: string };
}

// Request body types
interface RegisterBody {
  email: string;
  password: string;
  nickname: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshTokenBody {
  refreshToken: string;
}

const router = Router();
const container = DIContainer.getInstance();

// Parameter validation schemas
const providerParamSchema = Joi.object({
  provider: Joi.string().valid('discord', 'twitch', 'google', 'github').required(),
});

/**
 * POST /auth/register
 * Register new user with email/password
 */
router.post('/register', (req, res, next) => void validateTenant(req, res, next), validateBody(authValidators.register), asyncHandler(async (req: ValidatedRequest, res: Response) => {
  try {
    const { email, password, nickname } = (req.validatedBody || req.body) as RegisterBody;

    logger.info('User registration attempt', { email, nickname, ip: req.ip });

    const registerUseCase = container.getRegisterClassicUseCase();
    const result = await registerUseCase.execute({ email, password, nickname, tenantId: (req as { tenantId?: string }).tenantId || 'origins' });

    logger.info('Registration initiated — verification email sent', {
      email: result.email,
      tenantId: result.tenantId,
    });

    res.status(202).json({
      success: true,
      message: result.message,
      data: {
        email: result.email,
        tenantId: result.tenantId,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Registration failed', error as Error, { ip: req.ip });

    if (errorMessage.includes('already exists')) {
      res.status(409).json({
        success: false,
        error: 'USER_EXISTS',
        message: 'User with this email already exists',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Registration failed',
    });
  }
}));

/**
 * POST /auth/login
 * Login user with email/password
 */
router.post('/login', (req, res, next) => void validateTenant(req, res, next), validateBody(authValidators.login), asyncHandler(async (req: ValidatedRequest, res: Response) => {
  try {
    const { email, password } = (req.validatedBody || req.body) as LoginBody;

    logger.info('User login attempt', { email, ip: req.ip });

    const loginUseCase = container.getLoginClassicUseCase();
    const result = await loginUseCase.execute({ email, password, tenantId: (req as { tenantId?: string }).tenantId || 'origins' });

    logger.info('User logged in successfully', {
      userId: result.user.id,
      email: result.user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          nickname: result.user.nickname,
          emailVerified: result.user.emailVerified,
          isActive: result.user.isActive,
          lastLoginAt: result.user.lastLogin,
        },
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Login failed', error as Error, { ip: req.ip });

    if (
      errorMessage.includes('Invalid credentials') ||
      errorMessage.includes('User not found') ||
      errorMessage.includes('Invalid password')
    ) {
      res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Login failed',
    });
  }
}));

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post(
  '/refresh',
  validateBody(authValidators.refreshToken),
  asyncHandler(async (req: ValidatedRequest, res: Response) => {
    try {
      const { refreshToken } = (req.validatedBody || req.body) as RefreshTokenBody;

      logger.info('Token refresh attempt', { ip: req.ip });

      const refreshUseCase = container.getRefreshTokenUseCase();
      const result = await refreshUseCase.execute({ refreshToken });

      logger.info('Token refreshed successfully', { userId: result.user.id });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Token refresh failed', error as Error, { ip: req.ip });

      if (
        errorMessage.includes('Invalid') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('not found')
      ) {
        res.status(401).json({
          success: false,
          error: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Token refresh failed',
      });
    }
  })
);

/**
 * POST /auth/logout
 * Logout user and invalidate tokens
 */
router.post('/logout', (req, res, next) => void authenticateToken(req, res, next), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    logger.info('User logout attempt', { userId, ip: req.ip });

    const logoutUseCase = container.getLogoutUseCase();
    const refreshToken = req.body?.refreshToken;

    if (refreshToken) {
      await logoutUseCase.execute(refreshToken);
    } else {
      await logoutUseCase.executeAllSessions(userId);
    }

    logger.info('User logged out successfully', { userId });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    logger.error('Logout failed', error as Error, { ip: req.ip });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Logout failed',
    });
  }
}));

/**
 * POST /auth/token/validate
 * Token introspection — for service-to-service authentication.
 * Allows external apps to verify a SuperOAuth-issued token without sharing the JWT secret.
 */
router.post('/token/validate', apiRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };

  if (!token) {
    res.status(400).json({
      success: false,
      error: 'MISSING_TOKEN',
      message: 'token is required',
    });
    return;
  }

  try {
    const validateTokenUseCase = container.getValidateTokenUseCase();
    const result = await validateTokenUseCase.execute({ token });

    res.status(200).json({
      success: true,
      data: { valid: true, user: result.user },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'INVALID_TOKEN';

    const statusMap: Record<string, number> = {
      INVALID_TOKEN: 401,
      TOKEN_REVOKED: 401,
      USER_NOT_FOUND: 401,
    };

    res.status(statusMap[errorMessage] ?? 401).json({
      success: false,
      data: { valid: false },
      error: errorMessage,
    });
  }
}));

/**
 * GET /auth/oauth/:provider
 * Start OAuth flow for provider
 */
router.get(
  '/oauth/:provider',
  validateParams(providerParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const redirectUri = req.query.redirect_uri as string;

      logger.info('OAuth flow start', { provider, redirectUri, ip: req.ip });

      const startOAuthUseCase = container.getStartOAuthUseCase();
      const result = await startOAuthUseCase.execute({
        provider: provider as 'discord' | 'twitch' | 'google' | 'github',
        tenantId: (req as { tenantId?: string }).tenantId || 'origins',
        redirectUri,
      });

      logger.info('OAuth URL generated', { provider, state: result.state });

      res.status(200).json({
        success: true,
        message: 'OAuth flow initiated',
        data: {
          authUrl: result.authUrl,
          state: result.state,
          provider,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('OAuth start failed', error as Error, { ip: req.ip });

      if (errorMessage.includes('Unsupported')) {
        res.status(400).json({
          success: false,
          error: 'UNSUPPORTED_PROVIDER',
          message: 'OAuth provider not supported',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'OAuth initialization failed',
      });
    }
  })
);

/**
 * GET /auth/callback/:provider
 * Handle OAuth callback from provider
 */
router.get(
  '/callback/:provider',
  validateParams(providerParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;
      const { code, state } = req.query;

      logger.info('OAuth callback received', { provider, state, ip: req.ip });

      const completeOAuthUseCase = container.getCompleteOAuthUseCase();
      const result = await completeOAuthUseCase.execute({
        provider: provider as 'discord' | 'twitch' | 'google' | 'github',
        code: code as string,
        state: state as string,
      });

      if (result.type === 'authenticated') {
        logger.info('OAuth authentication completed', { userId: result.data.user.id });
        res.status(200).json({
          success: true,
          message: 'OAuth authentication successful',
          data: {
            user: result.data.user,
            tokens: {
              accessToken: result.data.accessToken,
              refreshToken: result.data.refreshToken,
            },
          },
        });
      } else {
        res.status(202).json({
          success: true,
          message: result.data.message,
          data: result.data,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('OAuth callback failed', error as Error, { ip: req.ip });

      if (errorMessage.includes('Invalid state') || errorMessage.includes('CSRF')) {
        res.status(400).json({
          success: false,
          error: 'INVALID_STATE',
          message: 'Invalid OAuth state parameter',
        });
        return;
      }

      if (errorMessage.includes('Invalid code') || errorMessage.includes('authorization')) {
        res.status(400).json({
          success: false,
          error: 'INVALID_AUTHORIZATION_CODE',
          message: 'Invalid authorization code',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'OAuth authentication failed',
      });
    }
  })
);

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', (req, res, next) => void authenticateToken(req, res, next), (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

/**
 * @route POST /auth/verify-email
 * @desc Verify email with token — activates account and returns auth tokens
 * @access Public
 */
router.post(
  '/verify-email',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'Token is required' });
      return;
    }

    try {
      const verifyEmailUseCase = container.getVerifyEmailUseCase();
      const result = await verifyEmailUseCase.execute(token);
      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: result.user,
          tokens: { accessToken: result.accessToken, refreshToken: result.refreshToken },
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'INVALID_OR_EXPIRED_TOKEN') {
        res.status(400).json({ success: false, error: 'INVALID_TOKEN', message: 'Invalid or expired verification token' });
      } else {
        logger.error('Verify email failed', error instanceof Error ? error : undefined);
        res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Verification failed' });
      }
    }
  })
);

/**
 * @route POST /auth/confirm-merge
 * @desc Confirm merge via email token — links provider to existing account
 * @access Public
 */
router.post(
  '/confirm-merge',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'Token is required' });
      return;
    }

    try {
      const confirmMergeUseCase = container.getConfirmMergeUseCase();
      const result = await confirmMergeUseCase.execute(token);
      res.status(200).json({
        success: true,
        message: 'Account merged successfully',
        data: {
          user: result.user,
          tokens: { accessToken: result.accessToken, refreshToken: result.refreshToken },
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'INVALID_OR_EXPIRED_TOKEN' || msg === 'INVALID_MERGE_TOKEN') {
        res.status(400).json({ success: false, error: 'INVALID_TOKEN', message: 'Invalid or expired merge token' });
      } else {
        logger.error('Confirm merge failed', error instanceof Error ? error : undefined);
        res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Merge failed' });
      }
    }
  })
);

/**
 * @route POST /auth/resend-verification
 * @desc Resend verification email
 * @access Public
 */
router.post(
  '/resend-verification',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, tenantId } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'Email is required' });
      return;
    }

    const { EmailTokenService } = await import('../../infrastructure/services/email-token.service');
    const { EmailService } = await import('../../infrastructure/email/email.service');
    const userRepo = container.get<import('../../application/interfaces/repositories.interface').IUserRepository>('UserRepository');
    const emailTokenService = new EmailTokenService();
    const emailService = new EmailService();

    const tenant = tenantId || 'origins';
    const user = await userRepo.findByEmail(email, tenant);

    if (!user || user.emailVerified) {
      res.status(200).json({ success: true, message: 'If the email exists, a verification link has been sent' });
      return;
    }

    const { rawToken } = await emailTokenService.createVerificationToken({ userId: user.id, tenantId: tenant });
    await emailService.sendVerificationEmail(email, rawToken, tenant);

    res.status(200).json({ success: true, message: 'Verification email sent' });
  })
);

export { router as authRoutes };
