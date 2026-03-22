/**
 * OAuth Routes - Express routes for OAuth authentication
 * Supports Discord, Twitch, Google, and GitHub
 * @version 2.0.0
 *
 * Security gates applied:
 *   [SG6] oauthRateLimit on POST /:provider/link
 */

import { Router } from 'express';
import { oauthController } from '../controllers/oauth.controller';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { oauthRateLimit } from '../middleware/rate-limit.middleware';
import { validateTenant, validateAuthenticatedTenant } from '../../shared/middleware/tenant.middleware';

const router = Router();

/**
 * @route   GET /api/v1/oauth/providers
 * @desc    Get list of available OAuth providers
 * @access  Public
 */
router.get('/providers', asyncHandler(oauthController.getProviders.bind(oauthController)));

/**
 * @route   GET /api/v1/oauth/linked
 * @desc    Get user's linked OAuth accounts
 * @access  Private
 */
router.get(
  '/linked',
  (req, res, next) => void authMiddleware(req, res, next),
  asyncHandler(oauthController.getLinkedAccounts.bind(oauthController))
);

/**
 * @route   POST /api/v1/oauth/account/merge
 * @desc    Merge two accounts — absorb targetToken account into current user
 * @access  Private (authMiddleware)
 * @body    { targetToken: string }
 */
router.post(
  '/account/merge',
  (req, res, next) => void authMiddleware(req, res, next),
  (req, res, next) => void validateAuthenticatedTenant(req, res, next),
  asyncHandler(oauthController.handleMerge.bind(oauthController))
);

/**
 * @route   GET /api/v1/oauth/:provider
 * @desc    Start OAuth authentication flow
 * @access  Public
 * @ratelimit 10 requests per minute
 */
router.get('/:provider', oauthRateLimit, (req, res, next) => void validateTenant(req, res, next), asyncHandler(oauthController.startOAuth.bind(oauthController)));

/**
 * @route   POST /api/v1/oauth/:provider/link
 * @desc    Initiate OAuth provider link flow from settings (authenticated user)
 * @access  Private (authMiddleware + oauthRateLimit [SG6])
 * @returns { authUrl, state, provider } — frontend is responsible for the redirect
 */
router.post(
  '/:provider/link',
  (req, res, next) => void authMiddleware(req, res, next),
  (req, res, next) => void validateAuthenticatedTenant(req, res, next),
  oauthRateLimit,
  asyncHandler(oauthController.startLink.bind(oauthController))
);

/**
 * @route   GET /api/v1/oauth/:provider/callback
 * @desc    Handle OAuth provider callback (auth flow + link flow bifurcation via Redis state mode)
 * @access  Public
 * @ratelimit 10 requests per minute
 */
router.get(
  '/:provider/callback',
  oauthRateLimit,
  asyncHandler(oauthController.handleOAuthCallback.bind(oauthController))
);

/**
 * @route   DELETE /api/v1/oauth/:provider/unlink
 * @desc    Unlink OAuth provider from user account
 * @access  Private
 */
router.delete(
  '/:provider/unlink',
  (req, res, next) => void authMiddleware(req, res, next),
  asyncHandler(oauthController.unlinkOAuthProvider.bind(oauthController))
);

export default router;
