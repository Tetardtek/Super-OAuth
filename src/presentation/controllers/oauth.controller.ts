/**
 * OAuth Controller - Handles OAuth authentication flows
 * Supports Discord, Twitch, Google, and GitHub
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { oauthService } from '../../infrastructure/oauth/oauth.service';
import { userService } from '../../application/services/user.service';
import { authService } from '../../application/services/auth.service';
import { logger } from '../../shared/utils/logger.util';
import { ApiResponse } from '../../shared/utils/response.util';
import { OAuthError, OAuthErrorType } from '../../infrastructure/oauth/oauth-config';

// Extended Request interfaces
interface ExtendedRequest extends Request {
  user?: { id: string; email?: string } | undefined;
  session?: { oauthState?: string } & Record<string, unknown> | undefined;
}

interface OAuthParams {
  provider: string;
}

interface OAuthQuery {
  redirectUrl?: string;
  code?: string;
  state?: string;
  error?: string;
}

export class OAuthController {
  /**
   * Start OAuth authentication flow
   * GET /auth/oauth/:provider
   */
  async startOAuth(req: ExtendedRequest, res: Response): Promise<void> {
    const { provider } = req.params as unknown as OAuthParams;
    const { redirectUrl } = req.query as unknown as OAuthQuery;

    try {
      logger.info(`🚀 Starting OAuth flow for ${provider}`, { provider, redirectUrl });

      // Generate OAuth URL and state
      const { authUrl, state } = await oauthService.generateAuthUrl(
        provider,
        redirectUrl
      );

      // Store state in session for additional security
      if (req.session) {
        req.session.oauthState = state;
      }

      logger.info(`✅ OAuth URL generated for ${provider}`, { provider });

      // Redirect to OAuth provider
      res.redirect(authUrl);
    } catch (error) {
      logger.error(
        `❌ Failed to start OAuth for ${provider}`,
        error instanceof Error ? error : undefined,
        { provider }
      );

      if (error instanceof OAuthError) {
        switch (error.type) {
          case OAuthErrorType.INVALID_PROVIDER:
            res.status(400).json(ApiResponse.error('Provider not supported', 'INVALID_PROVIDER'));
            return;
          default:
            res
              .status(500)
              .json(ApiResponse.error('OAuth initialization failed', 'OAUTH_INIT_FAILED'));
            return;
        }
      }

      res.status(500).json(ApiResponse.error('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Handle OAuth callback
   * GET /auth/oauth/:provider/callback
   */
  async handleOAuthCallback(req: ExtendedRequest, res: Response): Promise<void> {
    const { provider } = req.params as unknown as OAuthParams;
    const { code, state, error: oauthError } = req.query as unknown as OAuthQuery;

    try {
      logger.info(`🔄 Processing OAuth callback for ${provider}`, {
        provider,
        hasCode: !!code,
        hasState: !!state,
      });

      // Check for OAuth errors
      if (oauthError) {
        logger.warn(`⚠️ OAuth error from ${provider}`, { provider, error: oauthError });
        res.redirect(
          `${process.env.FRONTEND_URL}/auth/error?error=access_denied&provider=${provider}`
        );
        return;
      }

      // Validate required parameters
      if (!code || !state) {
        logger.warn(`⚠️ Missing OAuth parameters for ${provider}`, {
          provider,
          hasCode: !!code,
          hasState: !!state,
        });
        res.redirect(
          `${process.env.FRONTEND_URL}/auth/error?error=invalid_request&provider=${provider}`
        );
        return;
      }

      // Validate state matches session
      if (req.session?.oauthState !== state) {
        logger.warn(`⚠️ OAuth state mismatch for ${provider}`, {
          provider,
          sessionState: req.session?.oauthState,
          receivedState: state,
        });
        res.redirect(
          `${process.env.FRONTEND_URL}/auth/error?error=state_mismatch&provider=${provider}`
        );
        return;
      }

      // Process OAuth callback (code and state are validated above)
      const oauthUserInfo = await oauthService.handleCallback(
        provider,
        code,
        state
      );

      logger.info(`👤 OAuth user info received for ${provider}`, {
        provider,
        userId: oauthUserInfo.id,
        email: oauthUserInfo.email,
      });

      // Check if user exists with this OAuth provider
      let user = await userService.findByOAuthProvider(provider, oauthUserInfo.id);

      if (user) {
        // Existing user - sign them in
        logger.info(`🔄 Existing user login via ${provider}`, { userId: user.id, provider });

        // Update OAuth info if needed
        await userService.updateOAuthInfo(user.id, provider, oauthUserInfo);
      } else {
        // Check if user exists with this email
        if (oauthUserInfo.email) {
          user = await userService.findByEmail(oauthUserInfo.email);

          if (user) {
            // Link OAuth account to existing user
            logger.info(`🔗 Linking ${provider} account to existing user`, {
              userId: user.id,
              provider,
              email: oauthUserInfo.email,
            });
            await userService.linkOAuthAccount(user.id, provider, oauthUserInfo);
          }
        }

        if (!user) {
          // Create new user
          logger.info(`👤 Creating new user via ${provider}`, {
            provider,
            email: oauthUserInfo.email,
          });

          user = await userService.createFromOAuth(oauthUserInfo);
        }
      }

      // Generate JWT tokens
      const tokens = await authService.generateTokens(user);

      // Clear OAuth state from session
      if (req.session?.oauthState) {
        delete req.session.oauthState;
      }

      logger.info(`✅ OAuth authentication successful for ${provider}`, {
        userId: user.id,
        provider,
        isNewUser: !user.lastLogin,
      });

      // Redirect to frontend with tokens
      const redirectUrl =
        req.session?.oauthRedirectUrl || `${process.env.FRONTEND_URL}/auth/success`;
      if (req.session?.oauthRedirectUrl) {
        delete req.session.oauthRedirectUrl;
      }

      const urlWithTokens = `${String(redirectUrl)}?token=${tokens.accessToken}&refresh=${tokens.refreshToken}&provider=${provider}`;
      res.redirect(urlWithTokens);
    } catch (error) {
      logger.error(
        `❌ OAuth callback failed for ${provider}`,
        error instanceof Error ? error : undefined,
        { provider }
      );

      if (error instanceof OAuthError) {
        let errorCode = 'oauth_failed';

        switch (error.type) {
          case OAuthErrorType.INVALID_STATE:
            errorCode = 'invalid_state';
            break;
          case OAuthErrorType.TOKEN_EXCHANGE_FAILED:
            errorCode = 'token_exchange_failed';
            break;
          case OAuthErrorType.USER_INFO_FAILED:
            errorCode = 'user_info_failed';
            break;
          case OAuthErrorType.ACCOUNT_LINK_FAILED:
            errorCode = 'account_link_failed';
            break;
        }

        res.redirect(
          `${process.env.FRONTEND_URL}/auth/error?error=${errorCode}&provider=${provider}`
        );
        return;
      }

      res.redirect(
        `${process.env.FRONTEND_URL}/auth/error?error=internal_error&provider=${provider}`
      );
    }
  }

  /**
   * Unlink OAuth provider from user account
   * DELETE /auth/oauth/:provider/unlink
   */
  async unlinkOAuthProvider(req: ExtendedRequest, res: Response): Promise<void> {
    const { provider } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json(ApiResponse.error('Authentication required', 'UNAUTHORIZED'));
      return;
    }

    try {
      logger.info(`🔗 Unlinking ${provider} from user`, { userId, provider });

      // Check if user can unlink this provider (must have password or other OAuth)
      const user = await userService.findById(userId);
      if (!user) {
        res.status(404).json(ApiResponse.error('User not found', 'USER_NOT_FOUND'));
        return;
      }

      const canUnlink = await userService.canUnlinkOAuthProvider(userId, provider);
      if (!canUnlink) {
        res
          .status(400)
          .json(
            ApiResponse.error(
              'Cannot unlink last authentication method. Please set a password first.',
              'CANNOT_UNLINK_LAST_AUTH'
            )
          );
        return;
      }

      await userService.unlinkOAuthProvider(userId, provider);

      logger.info(`✅ Successfully unlinked ${provider} from user`, { userId, provider });

      res.json(
        ApiResponse.success({
          message: `Successfully unlinked ${provider} account`,
          provider,
        })
      );
    } catch (error) {
      logger.error(
        `❌ Failed to unlink ${provider} from user`,
        error instanceof Error ? error : undefined,
        { userId, provider }
      );
      res.status(500).json(ApiResponse.error('Failed to unlink OAuth provider', 'UNLINK_FAILED'));
    }
  }

  /**
   * Get OAuth provider info
   * GET /auth/oauth/providers
   */
  async getProviders(_req: Request, res: Response): Promise<void> {
    try {
      const providers = oauthService.getAllProvidersInfo();

      res.json(
        ApiResponse.success({
          providers,
          count: providers.length,
        })
      );
    } catch (error) {
      logger.error('❌ Failed to get OAuth providers', error instanceof Error ? error : undefined);
      res.status(500).json(ApiResponse.error('Failed to get providers', 'PROVIDERS_FAILED'));
    }
  }

  /**
   * Get specific OAuth provider info
   * GET /auth/oauth/providers/:provider
   */
  async getProviderInfo(req: Request, res: Response): Promise<void> {
    const { provider } = req.params;

    try {
      const providerInfo = oauthService.getProviderInfo(provider);

      if (!providerInfo) {
        res.status(404).json(ApiResponse.error('Provider not found', 'PROVIDER_NOT_FOUND'));
        return;
      }

      res.json(
        ApiResponse.success({
          provider,
          ...providerInfo,
        })
      );
    } catch (error) {
      logger.error(
        `❌ Failed to get ${provider} info`,
        error instanceof Error ? error : undefined,
        { provider }
      );
      res
        .status(500)
        .json(ApiResponse.error('Failed to get provider info', 'PROVIDER_INFO_FAILED'));
    }
  }

  /**
   * Get user's linked OAuth accounts
   * GET /auth/oauth/linked
   */
  async getLinkedAccounts(req: ExtendedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json(ApiResponse.error('Authentication required', 'UNAUTHORIZED'));
      return;
    }

    try {
      const linkedAccounts = await userService.getLinkedOAuthAccounts(userId);

      res.json(
        ApiResponse.success({
          linkedAccounts,
          count: linkedAccounts.length,
        })
      );
    } catch (error) {
      logger.error(
        '❌ Failed to get linked OAuth accounts',
        error instanceof Error ? error : undefined,
        { userId }
      );
      res
        .status(500)
        .json(ApiResponse.error('Failed to get linked accounts', 'LINKED_ACCOUNTS_FAILED'));
    }
  }
}

export const oauthController = new OAuthController();

// OAuth Controller is ready for use
