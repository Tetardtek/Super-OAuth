/**
 * OAuth Routes - Express routes for OAuth authentication
 * Supports Discord, Twitch, Google, and GitHub
 * @version 1.0.0
 */

import { Router } from 'express';
import { oauthController } from '../controllers/oauth.controller';
import { asyncHandler } from '../../shared/middleware/async-handler.middleware';
import { authMiddleware } from '../../shared/middleware/auth.middleware';

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
  authMiddleware,
  asyncHandler(oauthController.getLinkedAccounts.bind(oauthController))
);

/**
 * @route   GET /auth/oauth/:provider
 * @desc    Start OAuth authentication flow
 * @access  Public
 */
router.get('/:provider', asyncHandler(oauthController.startOAuth.bind(oauthController)));

/**
 * @route   GET /auth/oauth/:provider/callback
 * @desc    Handle OAuth provider callback
 * @access  Public
 */
router.get(
  '/:provider/callback',
  asyncHandler(oauthController.handleOAuthCallback.bind(oauthController))
);

/**
 * @route   DELETE /auth/oauth/:provider/unlink
 * @desc    Unlink OAuth provider from user account
 * @access  Private
 */
router.delete(
  '/:provider/unlink',
  authMiddleware,
  asyncHandler(oauthController.unlinkOAuthProvider.bind(oauthController))
);

export default router;
