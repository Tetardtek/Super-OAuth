import { Router, Request, Response } from 'express';
import { authValidators } from '../validators/request.validators';
import { validateBody, validateParams, ValidatedRequest } from '../middleware/validation.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import { AuthController } from '../controllers/auth.controller';
import Joi from 'joi';

const router = Router();
const authController = new AuthController();

// Parameter validation schemas
const providerParamSchema = Joi.object({
  provider: Joi.string().valid('discord', 'twitch', 'google', 'github').required(),
});

// Note: callbackQuerySchema will be used in future OAuth implementation

// Wrapper functions to handle type compatibility
const registerHandler = (req: ValidatedRequest, res: Response) => authController.register(req, res);
const loginHandler = (req: ValidatedRequest, res: Response) => authController.login(req, res);
const refreshTokenHandler = (req: ValidatedRequest, res: Response) => authController.refreshToken(req, res);
const logoutHandler = (req: ValidatedRequest & { user: { id: string } }, res: Response) => authController.logout(req, res);

/**
 * @route POST /auth/register
 * @desc Register new user with email/password
 * @access Public
 */
router.post('/register', validateBody(authValidators.register), registerHandler);

/**
 * @route POST /auth/login
 * @desc Login user with email/password
 * @access Public
 */
router.post('/login', validateBody(authValidators.login), loginHandler);

/**
 * @route POST /auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', validateBody(authValidators.refreshToken), refreshTokenHandler);

/**
 * @route POST /auth/logout
 * @desc Logout user
 * @access Private
 */
// @ts-expect-error - Type mismatch with exactOptionalPropertyTypes but functionally correct
router.post('/logout', authenticateToken, logoutHandler);

/**
 * @route GET /auth/oauth/:provider
 * @desc Start OAuth flow for provider
 * @access Public
 */
router.get(
  '/oauth/:provider',
  validateParams(providerParamSchema),
  authController.startOAuth.bind(authController)
);

/**
 * @route GET /auth/callback/:provider
 * @desc Handle OAuth callback from provider
 * @access Public
 */
router.get(
  '/callback/:provider',
  validateParams(providerParamSchema),
  authController.oauthCallback.bind(authController)
);

/**
 * @route GET /auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', authenticateToken, (req: Request & { user?: { id: string } }, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

export { router as authRoutes };
