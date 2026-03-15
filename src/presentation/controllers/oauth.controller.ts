/**
 * OAuth Controller — Tier 2 Multi-tenant
 * Supports Discord, Twitch, Google, and GitHub
 *
 * Security gates applied (ADR-008):
 *   [SG1]  tenantId whitelist validated server-side (not trusting client input)
 *   [SG2]  emailVerified defaults to false — never to true (safe default)
 *   [SG3]  emailSource NULL → conservative (no overwrite of classic email)
 *   [SG4]  tenantId read from Redis state in callback — not re-provided by client
 *   [SG5]  linkingUserId stored in Redis state at link initiation — never from callback
 *   [SG6]  oauthRateLimit applied on POST /:provider/link route (see routes)
 *   [SG9]  self-merge check delegated to MergeAccountsUseCase
 *   [SG10] PROVIDER_CONFLICT does not leak account existence
 */

import { Request, Response } from 'express';
import { oauthService } from '../../infrastructure/oauth/oauth.service';
import { userService } from '../../application/services/user.service';
import { authService } from '../../application/services/auth.service';
import { logger } from '../../shared/utils/logger.util';
import { ApiResponse } from '../../shared/utils/response.util';
import { OAuthError, OAuthErrorType } from '../../infrastructure/oauth/oauth-config';
import { LinkProviderUseCase } from '../../application/use-cases/link-provider.use-case';
import { MergeAccountsUseCase } from '../../application/use-cases/merge-accounts.use-case';
import { userRepository } from '../../infrastructure/services/user.repository';
import { tokenService } from '../../infrastructure/services/token.service';
import { TokenBlacklistService } from '../../infrastructure/services/token-blacklist.service';
import { DatabaseConnection } from '../../infrastructure/database/config/database.config';
import { AuthenticatedRequest } from '../../shared/middleware/auth.middleware';

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

interface MergeBody {
  targetToken?: string;
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
      const { authUrl, state } = await oauthService.generateAuthUrl(provider, tenantId, redirectUrl);

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
   * Start OAuth link flow (from settings) — returns authUrl as JSON for frontend redirect
   * POST /api/v1/oauth/:provider/link
   * Requires: authMiddleware, oauthRateLimit [SG6]
   */
  async startLink(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { provider } = req.params as unknown as OAuthParams;
    const userId = req.user?.id;
    const tenantId = req.tenantId;

    if (!userId || !tenantId) {
      res.status(401).json(ApiResponse.error('Authentication required', 'UNAUTHORIZED'));
      return;
    }

    // [SG1] Validate tenantId from JWT against whitelist
    if (!VALID_TENANTS.has(tenantId)) {
      res.status(400).json(ApiResponse.error('Unknown tenant', 'INVALID_TENANT'));
      return;
    }

    try {
      logger.info(`🔗 Starting OAuth link flow for ${provider}`, { userId, provider, tenantId });

      // [SG5] userId stored in Redis state as linkingUserId — NOT sent back at callback
      const { authUrl, state } = await oauthService.generateAuthUrl(
        provider,
        tenantId,
        undefined,
        'link',
        userId
      );

      logger.info(`✅ OAuth link URL generated for ${provider}`, { userId, provider, tenantId });

      // Return JSON — the frontend is responsible for the redirect
      res.json(ApiResponse.success({ authUrl, state, provider }));
    } catch (error) {
      logger.error(
        `❌ Failed to start OAuth link for ${provider}`,
        error instanceof Error ? error : undefined,
        { userId, provider }
      );

      if (error instanceof OAuthError) {
        switch (error.type) {
          case OAuthErrorType.INVALID_PROVIDER:
            res.status(400).json(ApiResponse.error('Provider not supported', 'INVALID_PROVIDER'));
            return;
          default:
            res.status(500).json(ApiResponse.error('OAuth link initialization failed', 'OAUTH_LINK_INIT_FAILED'));
            return;
        }
      }

      res.status(500).json(ApiResponse.error('Internal server error', 'INTERNAL_ERROR'));
    }
  }

  /**
   * Handle OAuth callback
   * GET /api/v1/oauth/:provider/callback?code=xxx&state=yyy
   *
   * Bifurcates based on mode read from Redis state:
   *   - mode='auth'  → standard auth flow (existing behaviour)
   *   - mode='link'  → LinkProviderUseCase [SG5]
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

      // [SG4] All metadata (tenantId, mode, linkingUserId) read from Redis state
      const {
        userInfo: oauthUserInfo,
        tenantId,
        mode,
        linkingUserId,
      } = await oauthService.handleCallback(provider, code, state);

      logger.info(`👤 OAuth user info received for ${provider}`, {
        provider,
        userId: oauthUserInfo.id,
        emailVerified: oauthUserInfo.emailVerified,
        tenantId,
        mode,
      });

      // ── Link flow bifurcation ──────────────────────────────────────────────
      if (mode === 'link') {
        if (!linkingUserId) {
          logger.error('Link callback missing linkingUserId in Redis state', { provider });
          res.redirect(
            `${process.env.FRONTEND_URL}/settings/error?error=link_state_invalid&provider=${provider}`
          );
          return;
        }

        const linkUseCase = new LinkProviderUseCase(userRepository);
        try {
          await linkUseCase.execute({ linkingUserId, tenantId, provider, oauthUserInfo });
        } catch (linkError) {
          const msg = linkError instanceof Error ? linkError.message : 'LINK_FAILED';
          logger.warn(`⚠️ LinkProvider failed for ${provider}`, { provider, userId: linkingUserId, error: msg });
          res.redirect(
            `${process.env.FRONTEND_URL}/settings/error?error=${encodeURIComponent(msg)}&provider=${provider}`
          );
          return;
        }

        if (req.session?.oauthState) {
          delete req.session.oauthState;
        }

        logger.info(`✅ OAuth provider linked successfully for ${provider}`, {
          userId: linkingUserId,
          provider,
          tenantId,
        });

        res.redirect(`${process.env.FRONTEND_URL}/settings/linked?provider=${provider}`);
        return;
      }

      // ── Standard auth flow ─────────────────────────────────────────────────
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
   * Merge two accounts — absorb target into current
   * POST /api/v1/account/merge
   * Requires: authMiddleware
   * Body: { targetToken: string }
   */
  async handleMerge(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    const tenantId = req.tenantId;
    const { targetToken } = req.body as MergeBody;

    if (!userId || !tenantId) {
      res.status(401).json(ApiResponse.error('Authentication required', 'UNAUTHORIZED'));
      return;
    }

    if (!targetToken) {
      res.status(400).json(ApiResponse.error('targetToken is required', 'MISSING_TARGET_TOKEN'));
      return;
    }

    try {
      const mergeUseCase = new MergeAccountsUseCase(
        userRepository,
        tokenService,
        new TokenBlacklistService(),
        DatabaseConnection.getDataSource()
      );

      const result = await mergeUseCase.execute({
        currentUserId: userId,
        targetToken,
        tenantId,
      });

      logger.info('✅ Accounts merged successfully', { userId, tenantId });

      res.json(ApiResponse.success(result));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'MERGE_FAILED';
      logger.error('❌ Merge failed', error instanceof Error ? error : undefined, { userId });

      switch (msg) {
        case 'INVALID_TARGET_TOKEN':
          res.status(400).json(ApiResponse.error('Invalid or expired target token', 'INVALID_TARGET_TOKEN'));
          return;
        case 'SELF_MERGE_FORBIDDEN':
          res.status(400).json(ApiResponse.error('Cannot merge account with itself', 'SELF_MERGE_FORBIDDEN'));
          return;
        case 'CURRENT_USER_NOT_FOUND':
        case 'TARGET_USER_NOT_FOUND':
          res.status(404).json(ApiResponse.error('User not found', 'USER_NOT_FOUND'));
          return;
        case 'CROSS_TENANT_MERGE_FORBIDDEN':
          res.status(403).json(ApiResponse.error('Cross-tenant merge is not allowed', 'CROSS_TENANT_MERGE_FORBIDDEN'));
          return;
        default:
          res.status(500).json(ApiResponse.error('Merge failed', 'MERGE_FAILED'));
      }
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
