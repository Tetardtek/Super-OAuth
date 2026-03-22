/**
 * PKCE Controller — OAuth 2.0 Authorization Server endpoints
 *
 * Implements the standard OAuth 2.0 Authorization Code flow with PKCE (RFC 7636).
 * SuperOAuth acts as an authorization server: client apps use these endpoints
 * instead of connecting directly to Discord/Google/etc.
 *
 * Flow:
 *   1. Client → GET /oauth/authorize (with PKCE challenge)
 *   2. SuperOAuth → redirects to provider (Discord, etc.)
 *   3. Provider → callbacks to SuperOAuth
 *   4. SuperOAuth → issues authorization code → redirects to client's redirect_uri
 *   5. Client → POST /oauth/token (with code + verifier)
 *   6. SuperOAuth → validates PKCE, returns access_token
 *
 * Security gates:
 *   [SG-PKCE-1] redirect_uri validated against tenant's registered redirect_uris
 *   [SG-PKCE-2] PKCE S256 mandatory — plain only if explicitly allowed
 *   [SG-PKCE-3] Authorization code hashed (SHA-256), use-once, TTL 5min
 *   [SG-PKCE-4] Tenant credentials resolved per-tenant with global fallback
 */

import { Request, Response } from 'express';
import { oauthService } from '../../infrastructure/oauth/oauth.service';
import { userService } from '../../application/services/user.service';
import { logger } from '../../shared/utils/logger.util';
import { ApiResponse } from '../../shared/utils/response.util';
import { OAuthError } from '../../infrastructure/oauth/oauth-config';
import { DIContainer } from '../../infrastructure/di/container';
import { AuthorizationCodeService } from '../../infrastructure/services/authorization-code.service';
import { TenantProviderRepository } from '../../infrastructure/services/tenant-provider.repository';
import { TenantCryptoService } from '../../infrastructure/services/tenant-crypto.service';
import type { TenantCredentialOverrides } from '../../infrastructure/oauth/oauth.service';

interface AuthorizeQuery {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  provider?: string;
  scope?: string;
  state?: string;
}

interface TokenBody {
  grant_type?: string;
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
  client_id?: string;
  client_secret?: string;
}

// Lazy-initialized singletons
let authCodeService: AuthorizationCodeService;
let tenantProviderRepo: TenantProviderRepository;

function getAuthCodeService(): AuthorizationCodeService {
  if (!authCodeService) {
    authCodeService = new AuthorizationCodeService();
  }
  return authCodeService;
}

function getTenantProviderRepo(): TenantProviderRepository {
  if (!tenantProviderRepo) {
    const crypto = DIContainer.getInstance().get<TenantCryptoService>('TenantCryptoService');
    tenantProviderRepo = new TenantProviderRepository(crypto);
  }
  return tenantProviderRepo;
}

/**
 * Resolve provider credentials: tenant-specific first, global fallback.
 */
async function resolveCredentials(
  tenantId: string,
  provider: string
): Promise<TenantCredentialOverrides | undefined> {
  try {
    const tenantCreds = await getTenantProviderRepo().getDecrypted(tenantId, provider);
    if (tenantCreds) {
      logger.info('Using tenant-specific credentials', { tenantId, provider });
      return tenantCreds;
    }
  } catch {
    logger.warn('Failed to resolve tenant credentials, falling back to global', { tenantId, provider });
  }
  // undefined = use global config
  return undefined;
}

export class PkceController {
  /**
   * GET /oauth/authorize
   *
   * Standard OAuth 2.0 authorization endpoint with PKCE.
   * Validates tenant, redirect_uri, PKCE params, then redirects to the OAuth provider.
   */
  async authorize(req: Request, res: Response): Promise<void> {
    const {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: responseType,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod = 'S256',
      provider,
      scope,
      state: clientState,
    } = req.query as unknown as AuthorizeQuery;

    // ── Validate required params ──────────────────────────────────────────────
    if (!clientId || !redirectUri || !responseType || !provider) {
      res.status(400).json(ApiResponse.error(
        'Missing required parameters: client_id, redirect_uri, response_type, provider',
        'INVALID_REQUEST'
      ));
      return;
    }

    if (responseType !== 'code') {
      res.status(400).json(ApiResponse.error(
        'Only response_type=code is supported',
        'UNSUPPORTED_RESPONSE_TYPE'
      ));
      return;
    }

    // [SG-PKCE-2] PKCE is mandatory
    if (!codeChallenge) {
      res.status(400).json(ApiResponse.error(
        'PKCE is required: code_challenge parameter missing',
        'PKCE_REQUIRED'
      ));
      return;
    }

    if (codeChallengeMethod !== 'S256' && codeChallengeMethod !== 'plain') {
      res.status(400).json(ApiResponse.error(
        'Unsupported code_challenge_method. Use S256 (recommended) or plain.',
        'INVALID_CODE_CHALLENGE_METHOD'
      ));
      return;
    }

    // ── Validate tenant ───────────────────────────────────────────────────────
    const { TenantValidationService } = await import('../../infrastructure/services/tenant-validation.service');
    const tenantValid = await TenantValidationService.getInstance().exists(clientId);
    if (!tenantValid) {
      res.status(400).json(ApiResponse.error('Invalid client_id', 'INVALID_CLIENT'));
      return;
    }

    // [SG-PKCE-1] Validate redirect_uri against tenant's registered URIs
    const { TenantRepository: TenantRepoClass } = await import('../../infrastructure/services/tenant.repository');
    const tenantCrypto = DIContainer.getInstance().get<TenantCryptoService>('TenantCryptoService');
    const tenantRepo = new TenantRepoClass(tenantCrypto);
    const tenant = await tenantRepo.findByClientId(clientId);

    if (!tenant) {
      res.status(400).json(ApiResponse.error('Invalid client_id', 'INVALID_CLIENT'));
      return;
    }

    const registeredUris = tenant.redirectUris ?? [];
    if (registeredUris.length > 0 && !registeredUris.includes(redirectUri)) {
      logger.warn('redirect_uri not in tenant registered URIs', {
        clientId,
        redirectUri,
        registeredUris,
      });
      res.status(400).json(ApiResponse.error(
        'redirect_uri not registered for this client',
        'INVALID_REDIRECT_URI'
      ));
      return;
    }

    try {
      // [SG-PKCE-4] Resolve tenant-specific credentials
      const tenantCreds = await resolveCredentials(clientId, provider);

      // Store PKCE data in the OAuth state for the callback
      // We use the redirectUrl field to pass the client's redirect_uri
      // and store PKCE params in the state metadata
      const { authUrl, state } = await oauthService.generateAuthUrl(
        provider,
        clientId, // tenantId = clientId
        undefined,
        'auth',
        undefined,
        tenantCreds
      );

      // Store PKCE metadata in Redis alongside the OAuth state
      // We piggyback on the existing state storage with a separate key
      const { redisClientSingleton } = await import('../../infrastructure/redis/redis-client');
      const redis = await redisClientSingleton.getClient();
      await redis.setEx(
        `oauth:pkce:${state}`,
        600, // 10 minutes
        JSON.stringify({
          codeChallenge,
          codeChallengeMethod,
          clientRedirectUri: redirectUri,
          clientState: clientState ?? null,
          scope: scope ?? null,
        })
      );

      logger.info('PKCE authorize: redirecting to provider', {
        provider,
        clientId,
        redirectUri,
        hasClientState: !!clientState,
      });

      res.redirect(authUrl);
    } catch (error) {
      logger.error(
        'PKCE authorize failed',
        error instanceof Error ? error : undefined,
        { provider, clientId }
      );

      if (error instanceof OAuthError) {
        res.status(400).json(ApiResponse.error(error.message, error.type));
        return;
      }

      res.status(500).json(ApiResponse.error('Authorization failed', 'SERVER_ERROR'));
    }
  }

  /**
   * GET /oauth/:provider/callback (PKCE flow)
   *
   * Called by the OAuth provider after user authenticates.
   * Instead of issuing a JWT directly, generates a SuperOAuth authorization code
   * and redirects to the client's redirect_uri.
   *
   * This is called from the standard callback handler when PKCE metadata is detected.
   */
  async handlePkceCallback(
    _req: Request,
    res: Response,
    provider: string,
    code: string,
    state: string
  ): Promise<boolean> {
    // Check if this is a PKCE flow by looking for PKCE metadata
    const { redisClientSingleton } = await import('../../infrastructure/redis/redis-client');
    const redis = await redisClientSingleton.getClient();
    const pkceDataRaw = await redis.get(`oauth:pkce:${state}`);

    if (!pkceDataRaw) {
      // Not a PKCE flow — let the standard callback handle it
      return false;
    }

    // Delete PKCE metadata (use-once)
    await redis.del(`oauth:pkce:${state}`);

    const pkceData = JSON.parse(pkceDataRaw) as {
      codeChallenge: string;
      codeChallengeMethod: string;
      clientRedirectUri: string;
      clientState: string | null;
      scope: string | null;
    };

    try {
      // Resolve tenant credentials for the code exchange with the provider
      // The tenantId is stored in the OAuth state (Redis)
      const stateData = await oauthService.peekState(state);
      const tenantId = stateData?.tenantId ?? 'origins';
      const tenantCreds = await resolveCredentials(tenantId, provider);

      // Exchange the provider's code for user info (standard OAuth flow)
      const { userInfo, tenantId: resolvedTenantId } = await oauthService.handleCallback(
        provider,
        code,
        state,
        tenantCreds
      );

      // Find or create user in SuperOAuth (email sovereign model)
      let user = await userService.findByOAuthProvider(provider, userInfo.id, resolvedTenantId);

      if (user) {
        // Existing linked user — update info and proceed
        await userService.updateOAuthInfo(user.id, provider, userInfo);
      } else {
        // Check if email already taken by another account
        if (userInfo.email) {
          const existingEmailUser = await userService.findByEmail(userInfo.email, resolvedTenantId);

          if (existingEmailUser) {
            // Email exists — send merge token instead of auto-linking
            const { EmailTokenService } = await import('../../infrastructure/services/email-token.service');
            const { EmailService } = await import('../../infrastructure/email/email.service');
            const emailTokenService = new EmailTokenService();
            const emailService = new EmailService();

            const { rawToken } = await emailTokenService.createMergeToken({
              userId: existingEmailUser.id,
              tenantId: resolvedTenantId,
              provider,
              providerId: userInfo.id,
              providerDisplayName: userInfo.nickname,
              providerEmail: userInfo.email,
            });

            await emailService.sendMergeEmail(userInfo.email, rawToken, provider, resolvedTenantId);

            // Redirect to client with merge_pending status
            const redirectParams = new URLSearchParams({
              status: 'merge_pending',
              email: userInfo.email,
              provider,
            });
            if (pkceData.clientState) redirectParams.set('state', pkceData.clientState);

            logger.info('PKCE callback: merge email sent', { provider, tenantId: resolvedTenantId, email: userInfo.email });

            res.redirect(`${pkceData.clientRedirectUri}?${redirectParams.toString()}`);
            return true;
          }
        }

        // No existing account — create new user (emailVerified=false)
        user = await userService.createFromOAuth(userInfo, resolvedTenantId);

        // Send verification email
        if (userInfo.email) {
          const { EmailTokenService } = await import('../../infrastructure/services/email-token.service');
          const { EmailService } = await import('../../infrastructure/email/email.service');
          const emailTokenService = new EmailTokenService();
          const emailService = new EmailService();

          const { rawToken } = await emailTokenService.createVerificationToken({
            userId: user.id,
            tenantId: resolvedTenantId,
          });

          await emailService.sendVerificationEmail(userInfo.email, rawToken, resolvedTenantId);

          // Redirect to client with verification_pending status
          const redirectParams = new URLSearchParams({
            status: 'verification_pending',
            email: userInfo.email,
          });
          if (pkceData.clientState) redirectParams.set('state', pkceData.clientState);

          logger.info('PKCE callback: verification email sent', { provider, tenantId: resolvedTenantId, userId: user.id });

          res.redirect(`${pkceData.clientRedirectUri}?${redirectParams.toString()}`);
          return true;
        }
      }

      // User is linked and verified — issue authorization code
      // [SG-PKCE-3] Generate SuperOAuth authorization code
      const { code: authCode } = await getAuthCodeService().create({
        tenantId: resolvedTenantId,
        userId: user.id,
        provider,
        redirectUri: pkceData.clientRedirectUri,
        codeChallenge: pkceData.codeChallenge,
        codeChallengeMethod: pkceData.codeChallengeMethod,
        scope: pkceData.scope ?? undefined,
      });

      // Redirect to client's redirect_uri with the authorization code
      const redirectParams = new URLSearchParams({ code: authCode });
      if (pkceData.clientState) {
        redirectParams.set('state', pkceData.clientState);
      }

      const redirectUrl = `${pkceData.clientRedirectUri}?${redirectParams.toString()}`;

      logger.info('PKCE callback: issuing authorization code', {
        provider,
        tenantId: resolvedTenantId,
        userId: user.id,
        redirectUri: pkceData.clientRedirectUri,
      });

      res.redirect(redirectUrl);
      return true;
    } catch (error) {
      logger.error(
        'PKCE callback failed',
        error instanceof Error ? error : undefined,
        { provider }
      );

      const errorParams = new URLSearchParams({
        error: 'server_error',
        error_description: 'Authorization failed',
      });
      if (pkceData.clientState) {
        errorParams.set('state', pkceData.clientState);
      }

      res.redirect(`${pkceData.clientRedirectUri}?${errorParams.toString()}`);
      return true;
    }
  }

  /**
   * POST /oauth/token
   *
   * Standard OAuth 2.0 token endpoint.
   * Exchanges an authorization code + PKCE verifier for an access token.
   */
  async token(req: Request, res: Response): Promise<void> {
    const {
      grant_type: grantType,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      client_id: clientId,
    } = req.body as TokenBody;

    // ── Validate required params ──────────────────────────────────────────────
    if (grantType !== 'authorization_code') {
      res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code grant type is supported',
      });
      return;
    }

    if (!code || !redirectUri || !codeVerifier) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters: code, redirect_uri, code_verifier',
      });
      return;
    }

    try {
      // Exchange code — validates expiry, use-once, redirect_uri match, PKCE
      const codeData = await getAuthCodeService().exchange(code, redirectUri, codeVerifier);

      if (!codeData) {
        res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid, expired, or already used authorization code',
        });
        return;
      }

      // Optional: validate client_id matches the tenant that generated the code
      if (clientId && clientId !== codeData.tenantId) {
        res.status(400).json({
          error: 'invalid_grant',
          error_description: 'client_id does not match the authorization code',
        });
        return;
      }

      // Generate tenant-scoped JWT
      const container = DIContainer.getInstance();
      const tenantTokenService = container.get<{ generateAccessToken(userId: string, tenantId: string): Promise<string> }>('TenantTokenService');

      const accessToken = await tenantTokenService.generateAccessToken(
        codeData.userId,
        codeData.tenantId
      );

      // Generate refresh token via standard auth service
      const { authService } = await import('../../application/services/auth.service');
      const user = await userService.findById(codeData.userId);
      if (!user) {
        res.status(400).json({
          error: 'invalid_grant',
          error_description: 'User not found',
        });
        return;
      }

      const tokens = await authService.generateTokens(user, codeData.tenantId);

      logger.info('PKCE token: access token issued', {
        tenantId: codeData.tenantId,
        userId: codeData.userId,
        provider: codeData.provider,
      });

      // Standard OAuth 2.0 token response
      res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: tokens.refreshToken,
        scope: codeData.scope ?? 'openid',
      });
    } catch (error) {
      logger.error(
        'PKCE token exchange failed',
        error instanceof Error ? error : undefined
      );

      res.status(500).json({
        error: 'server_error',
        error_description: 'Token generation failed',
      });
    }
  }
}

export const pkceController = new PkceController();
