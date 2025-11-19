import { Router, Request, Response } from 'express';
import { authValidators } from '../validators/request.validators';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthController } from '../controllers/auth.controller';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import Joi from 'joi';

const router = Router();
const authController = new AuthController();

// Parameter validation schemas
const providerParamSchema = Joi.object({
  provider: Joi.string().valid('discord', 'twitch', 'google', 'github').required(),
});

// Note: callbackQuerySchema will be used in future OAuth implementation

/**
 * @route POST /auth/register
 * @desc Register new user with email/password
 * @access Public
 */
router.post('/register', validateBody(authValidators.register), asyncHandler(authController.register.bind(authController)));

/**
 * @route POST /auth/login
 * @desc Login user with email/password
 * @access Public
 */
router.post('/login', validateBody(authValidators.login), asyncHandler(authController.login.bind(authController)));

/**
 * @route POST /auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', validateBody(authValidators.refreshToken), asyncHandler(authController.refreshToken.bind(authController)));

/**
 * @route POST /auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', (req, res, next) => void authenticateToken(req, res, next), asyncHandler(authController.logout.bind(authController)));

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

export { router as authRoutes };
