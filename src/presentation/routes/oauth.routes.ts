/**
 * OAuth Routes - Express routes for OAuth authentication
 * Supports Discord, Twitch, Google, and GitHub
 * @version 1.0.0
 */

import { Router } from 'express';
import { oauthController } from '../controllers/oauth.controller';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { oauthRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * @route   GET /auth/oauth/providers
 * @desc    Get list of available OAuth providers
 * @access  Public
 */
router.get('/providers', asyncHandler(oauthController.getProviders.bind(oauthController)));

/**
 * @route   GET /auth/oauth/linked
 * @desc    Get user's linked OAuth accounts
 * @access  Private
 */
router.get(
  '/linked',
  (req, res, next) => void authMiddleware(req, res, next),
  asyncHandler(oauthController.getLinkedAccounts.bind(oauthController))
);

/**
 * @route   GET /auth/oauth/:provider
 * @desc    Start OAuth authentication flow
 * @access  Public
 * @ratelimit 10 requests per minute
 */
router.get('/:provider', oauthRateLimit, asyncHandler(oauthController.startOAuth.bind(oauthController)));

/**
 * @route   GET /auth/oauth/:provider/callback
 * @desc    Handle OAuth provider callback
 * @access  Public
 * @ratelimit 10 requests per minute
 */
router.get(
  '/:provider/callback',
  oauthRateLimit,
  asyncHandler(oauthController.handleOAuthCallback.bind(oauthController))
);

/**
 * @route   DELETE /auth/oauth/:provider/unlink
 * @desc    Unlink OAuth provider from user account
 * @access  Private
 */
router.delete(
  '/:provider/unlink',
  (req, res, next) => void authMiddleware(req, res, next),
  asyncHandler(oauthController.unlinkOAuthProvider.bind(oauthController))
);

export default router;
