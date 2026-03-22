import { Router, Request, Response } from 'express';
import { authValidators } from '../validators/request.validators';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { csrfProtection, generateCsrfToken, csrfErrorHandler } from '../middleware/csrf.middleware';
import { authRateLimit, registerRateLimit } from '../middleware/rate-limit.middleware';
import { AuthController } from '../controllers/auth.controller';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { validateTenant } from '../../shared/middleware/tenant.middleware';
import Joi from 'joi';

const router = Router();
const authController = new AuthController();

// Parameter validation schemas
const providerParamSchema = Joi.object({
  provider: Joi.string().valid('discord', 'twitch', 'google', 'github').required(),
});

// Note: callbackQuerySchema will be used in future OAuth implementation

/**
 * @route GET /auth/csrf-token
 * @desc Get CSRF token for client
 * @access Public
 */
router.get('/csrf-token', (req: Request, res: Response) => {
  const token = generateCsrfToken(req, res);
  res.json({
    success: true,
    data: {
      csrfToken: token,
    },
  });
});

/**
 * @route POST /auth/register
 * @desc Register new user with email/password
 * @access Public
 * @csrf Protected
 * @ratelimit 3 requests per hour
 */
router.post('/register', registerRateLimit, csrfProtection, (req, res, next) => void validateTenant(req, res, next), validateBody(authValidators.register), asyncHandler(authController.register.bind(authController)));

/**
 * @route POST /auth/login
 * @desc Login user with email/password
 * @access Public
 * @csrf Protected
 * @ratelimit 5 requests per 15 minutes
 */
router.post('/login', authRateLimit, csrfProtection, (req, res, next) => void validateTenant(req, res, next), validateBody(authValidators.login), asyncHandler(authController.login.bind(authController)));

/**
 * @route POST /auth/refresh
 * @desc Refresh access token
 * @access Public
 * @ratelimit 5 requests per 15 minutes
 */
router.post('/refresh', authRateLimit, validateBody(authValidators.refreshToken), asyncHandler(authController.refreshToken.bind(authController)));

/**
 * @route POST /auth/logout
 * @desc Logout user
 * @access Private
 * @csrf Protected
 */
router.post('/logout', csrfProtection, (req, res, next) => void authenticateToken(req, res, next), asyncHandler(authController.logout.bind(authController)));

/**
 * @route GET /auth/oauth/:provider
 * @desc Start OAuth flow for provider
 * @access Public
 */
router.get(
  '/oauth/:provider',
  validateParams(providerParamSchema),
  asyncHandler(authController.startOAuth.bind(authController))
);

/**
 * @route GET /auth/callback/:provider
 * @desc Handle OAuth callback from provider
 * @access Public
 */
router.get(
  '/callback/:provider',
  validateParams(providerParamSchema),
  asyncHandler(authController.oauthCallback.bind(authController))
);

/**
 * @route GET /auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', (req, res, next) => void authenticateToken(req, res, next), (req: Request & { user?: { id: string } }, res: Response) => {
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
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Token is required',
      });
      return;
    }

    const { DIContainer } = await import('../../infrastructure/di/container');
    const verifyEmailUseCase = DIContainer.getInstance().getVerifyEmailUseCase();

    try {
      const result = await verifyEmailUseCase.execute(token);
      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: {
          user: result.user,
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          },
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'INVALID_OR_EXPIRED_TOKEN') {
        res.status(400).json({ success: false, error: 'INVALID_TOKEN', message: 'Invalid or expired verification token' });
      } else {
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
  authRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Token is required',
      });
      return;
    }

    const { DIContainer } = await import('../../infrastructure/di/container');
    const confirmMergeUseCase = DIContainer.getInstance().getConfirmMergeUseCase();

    try {
      const result = await confirmMergeUseCase.execute(token);
      res.status(200).json({
        success: true,
        message: 'Account merged successfully',
        data: {
          user: result.user,
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          },
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'INVALID_OR_EXPIRED_TOKEN' || msg === 'INVALID_MERGE_TOKEN') {
        res.status(400).json({ success: false, error: 'INVALID_TOKEN', message: 'Invalid or expired merge token' });
      } else {
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
  registerRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, tenantId } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: 'INVALID_REQUEST', message: 'Email is required' });
      return;
    }

    const { DIContainer } = await import('../../infrastructure/di/container');
    const userRepo = DIContainer.getInstance().get<import('../../application/interfaces/repositories.interface').IUserRepository>('UserRepository');
    const emailTokenService = DIContainer.getInstance().get<import('../../infrastructure/services/email-token.service').EmailTokenService>('EmailTokenService');
    const emailService = DIContainer.getInstance().get<import('../../infrastructure/email/email.service').EmailService>('EmailService');

    const tenant = tenantId || 'origins';
    const user = await userRepo.findByEmail(email, tenant);

    if (!user || user.emailVerified) {
      // Don't reveal whether user exists
      res.status(200).json({ success: true, message: 'If the email exists, a verification link has been sent' });
      return;
    }

    const { rawToken } = await emailTokenService.createVerificationToken({ userId: user.id, tenantId: tenant });
    await emailService.sendVerificationEmail(email, rawToken, tenant);

    res.status(200).json({ success: true, message: 'Verification email sent' });
  })
);

// CSRF error handler (doit être après les routes)
router.use(csrfErrorHandler);

export { router as authRoutes };
