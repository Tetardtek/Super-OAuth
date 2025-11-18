import { Router } from 'express';
import { authValidators } from '../validators/request.validators';
import { validateBody, validateParams } from '../middleware/validation.middleware';
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
const registerHandler = (req: any, res: any) => authController.register(req, res);
const loginHandler = (req: any, res: any) => authController.login(req, res);
const refreshTokenHandler = (req: any, res: any) => authController.refreshToken(req, res);
const logoutHandler = (req: any, res: any) => authController.logout(req, res);

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
router.get('/me', authenticateToken, (req: any, res: any) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

export { router as authRoutes };
