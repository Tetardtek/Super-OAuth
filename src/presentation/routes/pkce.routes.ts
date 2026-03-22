/**
 * PKCE Routes — OAuth 2.0 Authorization Server endpoints
 *
 * These routes implement SuperOAuth as an authorization server.
 * Client apps use these instead of connecting to providers directly.
 *
 * @version 1.0.0
 */

import { Router } from 'express';
import { pkceController } from '../controllers/pkce.controller';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { oauthRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * @route   GET /oauth/authorize
 * @desc    Start OAuth 2.0 authorization flow with PKCE
 * @access  Public
 * @query   client_id, redirect_uri, response_type=code, code_challenge, code_challenge_method=S256, provider, scope?, state?
 */
router.get(
  '/authorize',
  oauthRateLimit,
  asyncHandler(pkceController.authorize.bind(pkceController))
);

/**
 * @route   POST /oauth/token
 * @desc    Exchange authorization code + PKCE verifier for access token
 * @access  Public
 * @body    grant_type=authorization_code, code, redirect_uri, code_verifier, client_id?
 */
router.post(
  '/token',
  oauthRateLimit,
  asyncHandler(pkceController.token.bind(pkceController))
);

export default router;
