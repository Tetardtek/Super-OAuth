/**
 * OAuth Controller — Tier 1 Multi-tenant
 * Supports Discord, Twitch, Google, and GitHub
 *
 * Security gates applied (ADR-008):
 *   [SG1] tenantId whitelist validated server-side (not trusting client input)
 *   [SG2] emailVerified defaults to false — never to true (safe default)
 *   [SG3] emailSource NULL → conservative (no overwrite of classic email)
 *   [SG4] tenantId read from Redis state in callback — not re-provided by client
 */

import { Request, Response } from 'express';
import { oauthService } from '../../infrastructure/oauth/oauth.service';
import { userService } from '../../application/services/user.service';
import { authService } from '../../application/services/auth.service';
import { logger } from '../../shared/utils/logger.util';
import { ApiResponse } from '../../shared/utils/response.util';
import { OAuthError, OAuthErrorType } from '../../infrastructure/oauth/oauth-config';

// [SG1] Hardcoded whitelist for Tier 1 — Tier 2 will move this to DB-backed config
const VALID_TENANTS = new Set(['origins']);

interface ExtendedRequest extends Request {
  user?: { id: string; email?: string } | undefined;
  session?: { oauthState?: string } & Record<string, unknown> | undefined;
}

interface OAuthParams {
  provider: string;
}

interface OAuthStartQuery {
  redirectUrl?: string;
  tenantId?: string;
}

interface OAuthCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
}

export class OAuthController {
  /**
   * Start OAuth authentication flow
   * GET /api/v1/oauth/:provider?tenantId=origins&redirectUrl=...
   */
  async startOAuth(req: ExtendedRequest, res: Response): Promise<void> {
    const { provider } = req.params as unknown as OAuthParams;
    const { redirectUrl, tenantId: rawTenantId } = req.query as unknown as OAuthStartQuery;

    // [SG1] Validate tenantId against whitelist — reject unknown tenants early
    const tenantId = rawTenantId || 'origins';
    if (!VALID_TENANTS.has(tenantId)) {
      res.status(400).json(ApiResponse.error('Unknown tenant', 'INVALID_TENANT'));
      return;
    }

    try {
      logger.info(`🚀 Starting OAuth flow for ${provider}`, { provider, tenantId, redirectUrl });

      // tenantId stored in Redis state — not relied on at callback via client [SG4]
      const { authUrl, state } = await oauthService.generateAuthUrl(provider, redirectUrl, tenantId);

      if (req.session) {
        req.session.oauthState = state;
      }

      logger.info(`✅ OAuth URL generated for ${provider}`, { provider, tenantId });
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
            res.status(500).json(ApiResponse.error('OAuth initialization failed', 'OAUTH_INIT_FAILED'));
            return;
        }
      }

      res.status(500).json(ApiResponse.error('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Handle OAuth callback
   * GET /api/v1/oauth/:provider/callback?code=xxx&state=yyy
   */
  async handleOAuthCallback(req: ExtendedRequest, res: Response): Promise<void> {
    const { provider } = req.params as unknown as OAuthParams;
    const { code, state, error: oauthError } = req.query as unknown as OAuthCallbackQuery;

    try {
      logger.info(`🔄 Processing OAuth callback for ${provider}`, {
        provider,
        hasCode: !!code,
        hasState: !!state,
      });

      if (oauthError) {
        logger.warn(`⚠️ OAuth error from ${provider}`, { provider, error: oauthError });
        res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=access_denied&provider=${provider}`);
        return;
      }

      if (!code || !state) {
        res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=invalid_request&provider=${provider}`);
        return;
      }

      if (req.session?.oauthState !== state) {
        logger.warn(`⚠️ OAuth state mismatch for ${provider}`, { provider });
        res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=state_mismatch&provider=${provider}`);
        return;
      }

      // [SG4] tenantId is read from Redis state — NOT from the callback query params
      // This prevents tenantId forgery at the callback stage
      const { userInfo: oauthUserInfo, tenantId } = await oauthService.handleCallback(provider, code, state);

      logger.info(`👤 OAuth user info received for ${provider}`, {
        provider,
        userId: oauthUserInfo.id,
        emailVerified: oauthUserInfo.emailVerified,
        tenantId,
      });

      // Check if user already exists with this provider + tenant
      let user = await userService.findByOAuthProvider(provider, oauthUserInfo.id, tenantId);

      if (user) {
        // Existing linked account — login
        logger.info(`🔄 Existing user login via ${provider}`, { userId: user.id, provider, tenantId });
        await userService.updateOAuthInfo(user.id, provider, oauthUserInfo);
      } else {
        // Check if a user with the same email exists in this tenant
        if (oauthUserInfo.email) {
          const existingEmailUser = await userService.findByEmail(oauthUserInfo.email, tenantId);

          if (existingEmailUser) {
            // [SG2] Only auto-link if provider returned verified email
            if (!oauthUserInfo.emailVerified) {
              logger.warn(`⚠️ Email exists but unverified — not auto-linking`, {
                provider,
                tenantId,
              });
              // ADR-008: EMAIL_UNVERIFIED_EXISTS — do not link, create new account without email
              user = await userService.createFromOAuth(
                { ...oauthUserInfo, email: undefined, emailVerified: false },
                tenantId
              );
            } else if (!existingEmailUser.emailVerified) {
              // Existing user has unverified email — return EMAIL_UNVERIFIED_EXISTS
              logger.warn(`⚠️ Existing user email unverified — not auto-linking`, {
                provider,
                tenantId,
              });
              res.redirect(
                `${process.env.FRONTEND_URL}/auth/error?error=EMAIL_UNVERIFIED_EXISTS&provider=${provider}`
              );
              return;
            } else {
              // Both sides verified — link this provider to existing user
              logger.info(`🔗 Linking ${provider} to existing verified user`, {
                userId: existingEmailUser.id,
                provider,
                tenantId,
              });
              await userService.linkOAuthAccount(existingEmailUser.id, provider, oauthUserInfo, tenantId);
              user = existingEmailUser;
            }
          }
        }

        if (!user) {
          // No existing user — create new
          logger.info(`👤 Creating new user via ${provider}`, { provider, tenantId });
          user = await userService.createFromOAuth(oauthUserInfo, tenantId);
        }
      }

      // Generate tokens — tenantId included in JWT payload
      const tokens = await authService.generateTokens(user, tenantId);

      if (req.session?.oauthState) {
        delete req.session.oauthState;
      }

      logger.info(`✅ OAuth authentication successful for ${provider}`, {
        userId: user.id,
        provider,
        tenantId,
      });

      const redirectUrl = req.session?.oauthRedirectUrl || `${process.env.FRONTEND_URL}/auth/success`;
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
        res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=${errorCode}&provider=${provider}`);
        return;
      }

      res.redirect(`${process.env.FRONTEND_URL}/auth/error?error=internal_error&provider=${provider}`);
    }
  }

  /**
   * Unlink OAuth provider from user account
   * DELETE /api/v1/oauth/:provider/unlink
   */
  async unlinkOAuthProvider(req: ExtendedRequest, res: Response): Promise<void> {
    const { provider } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json(ApiResponse.error('Authentication required', 'UNAUTHORIZED'));
      return;
    }

    try {
      const user = await userService.findById(userId);
      if (!user) {
        res.status(404).json(ApiResponse.error('User not found', 'USER_NOT_FOUND'));
        return;
      }

      const canUnlink = await userService.canUnlinkOAuthProvider(userId, provider);
      if (!canUnlink) {
        res.status(400).json(
          ApiResponse.error(
            'Cannot unlink last authentication method. Please set a password first.',
            'CANNOT_UNLINK_LAST_AUTH'
          )
        );
        return;
      }

      await userService.unlinkOAuthProvider(userId, provider);

      res.json(ApiResponse.success({ message: `Successfully unlinked ${provider} account`, provider }));
    } catch (error) {
      logger.error(
        `❌ Failed to unlink ${provider} from user`,
        error instanceof Error ? error : undefined,
        { userId }
      );
      res.status(500).json(ApiResponse.error('Failed to unlink OAuth provider', 'UNLINK_FAILED'));
    }
  }

  async getProviders(_req: Request, res: Response): Promise<void> {
    try {
      const providers = oauthService.getAllProvidersInfo();
      res.json(ApiResponse.success({ providers, count: providers.length }));
    } catch (error) {
      logger.error('❌ Failed to get OAuth providers', error instanceof Error ? error : undefined);
      res.status(500).json(ApiResponse.error('Failed to get providers', 'PROVIDERS_FAILED'));
    }
  }

  async getProviderInfo(req: Request, res: Response): Promise<void> {
    const { provider } = req.params;
    try {
      const providerInfo = oauthService.getProviderInfo(provider);
      if (!providerInfo) {
        res.status(404).json(ApiResponse.error('Provider not found', 'PROVIDER_NOT_FOUND'));
        return;
      }
      res.json(ApiResponse.success({ provider, ...providerInfo }));
    } catch (error) {
      logger.error(`❌ Failed to get ${provider} info`, error instanceof Error ? error : undefined, { provider });
      res.status(500).json(ApiResponse.error('Failed to get provider info', 'PROVIDER_INFO_FAILED'));
    }
  }

  async getLinkedAccounts(req: ExtendedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json(ApiResponse.error('Authentication required', 'UNAUTHORIZED'));
      return;
    }
    try {
      const linkedAccounts = await userService.getLinkedOAuthAccounts(userId);
      res.json(ApiResponse.success({ linkedAccounts, count: linkedAccounts.length }));
    } catch (error) {
      logger.error('❌ Failed to get linked OAuth accounts', error instanceof Error ? error : undefined, { userId });
      res.status(500).json(ApiResponse.error('Failed to get linked accounts', 'LINKED_ACCOUNTS_FAILED'));
    }
  }
}

export const oauthController = new OAuthController();
