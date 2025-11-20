/**
 * OAuth Service - Handles all OAuth provider interactions
 * Supports Discord, Twitch, Google, and GitHub
 * @version 1.0.0
 */

import crypto from 'crypto';
import axios from 'axios';
import {
  OAUTH_PROVIDERS,
  OAuthTokenResponse,
  OAuthUserInfo,
  OAuthError,
  OAuthErrorType,
  validateOAuthConfig,
  getOAuthConfig,
  isProviderSupported,
  DiscordUser,
  GoogleUser,
  GitHubUser,
  TwitchUserResponse,
  ProviderRawData,
} from './oauth-config';
import { logger } from '../../shared/utils/logger.util';
import { RedisStateStorage, IStateStorage, OAuthState } from '../redis';

export class OAuthService {
  private stateStorage: IStateStorage;
  private readonly stateExpirationSeconds = 10 * 60; // 10 minutes (en secondes pour Redis TTL)

  constructor(stateStorage?: IStateStorage) {
    // Dependency injection pour faciliter les tests
    this.stateStorage = stateStorage || new RedisStateStorage();
  }

  /**
   * Generate OAuth authorization URL
   */
  async generateAuthUrl(
    provider: string,
    redirectUrl?: string
  ): Promise<{ authUrl: string; state: string }> {
    logger.info(`🔗 Generating OAuth URL for ${provider}`);

    if (!isProviderSupported(provider)) {
      throw new OAuthError(
        OAuthErrorType.INVALID_PROVIDER,
        `Provider ${provider} is not supported`
      );
    }

    if (!validateOAuthConfig(provider)) {
      throw new OAuthError(
        OAuthErrorType.INVALID_PROVIDER,
        `Provider ${provider} is not properly configured`
      );
    }

    const config = getOAuthConfig(provider)!;
    const state = await this.generateState(provider, redirectUrl);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope.join(' '),
      state: state,
    });

    // Provider-specific parameters
    if (provider === 'google') {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
    }

    if (provider === 'discord') {
      params.append('prompt', 'none');
    }

    const authUrl = `${config.authUrl}?${params.toString()}`;

    logger.info(`✅ OAuth URL generated for ${provider}`, { provider, hasState: !!state });
    return { authUrl, state };
  }

  /**
   * Handle OAuth callback and exchange code for token
   */
  async handleCallback(provider: string, code: string, state: string): Promise<OAuthUserInfo> {
    logger.info(`🔄 Processing OAuth callback for ${provider}`);

    if (!isProviderSupported(provider)) {
      throw new OAuthError(
        OAuthErrorType.INVALID_PROVIDER,
        `Provider ${provider} is not supported`,
        provider
      );
    }

    // Validate state
    const stateData = this.validateState(state, provider);
    if (!stateData) {
      throw new OAuthError(
        OAuthErrorType.INVALID_STATE,
        'Invalid or expired OAuth state',
        provider
      );
    }

    try {
      // Exchange code for token
      const tokenResponse = await this.exchangeCodeForToken(provider, code);

      // Get user info using token
      const userInfo = await this.getUserInfo(provider, tokenResponse.access_token);

      // State déjà supprimé par validateState() (use-once pattern)

      logger.info(`✅ OAuth callback processed successfully for ${provider}`, {
        provider,
        userId: userInfo.id,
        email: userInfo.email,
      });

      return userInfo;
    } catch (error) {
      logger.error(
        `❌ OAuth callback failed for ${provider}`,
        error instanceof Error ? error : undefined,
        { provider, state }
      );

      if (error instanceof OAuthError) {
        throw error;
      }

      throw new OAuthError(
        OAuthErrorType.TOKEN_EXCHANGE_FAILED,
        `OAuth process failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider,
        error
      );
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(provider: string, code: string): Promise<OAuthTokenResponse> {
    const config = getOAuthConfig(provider)!;

    const data = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code: code,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };

    // GitHub requires User-Agent header
    if (provider === 'github') {
      headers['User-Agent'] = 'SuperOAuth-App';
    }

    try {
      const response = await axios.post(config.tokenUrl, data.toString(), { headers });

      if (!response.data.access_token) {
        throw new Error('No access token in response');
      }

      logger.info(`🔑 Token exchange successful for ${provider}`);
      return response.data;
    } catch (error) {
      logger.error(
        `❌ Token exchange failed for ${provider}`,
        error instanceof Error ? error : undefined
      );
      throw new OAuthError(
        OAuthErrorType.TOKEN_EXCHANGE_FAILED,
        `Failed to exchange code for token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider,
        error
      );
    }
  }

  /**
   * Get user information from OAuth provider
   */
  private async getUserInfo(provider: string, accessToken: string): Promise<OAuthUserInfo> {
    const config = getOAuthConfig(provider)!;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    };

    // Provider-specific headers
    if (provider === 'github') {
      headers['User-Agent'] = 'SuperOAuth-App';
    }

    if (provider === 'twitch') {
      headers['Client-Id'] = config.clientId;
    }

    try {
      const response = await axios.get(config.userInfoUrl, { headers });
      const userData = response.data;

      // Normalize user data based on provider
      const userInfo = this.normalizeUserData(provider, userData);

      logger.info(`👤 User info retrieved for ${provider}`, {
        provider,
        userId: userInfo.id,
        email: userInfo.email,
      });

      return userInfo;
    } catch (error) {
      logger.error(
        `❌ Failed to get user info from ${provider}`,
        error instanceof Error ? error : undefined
      );
      throw new OAuthError(
        OAuthErrorType.USER_INFO_FAILED,
        `Failed to get user info: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider,
        error
      );
    }
  }

  /**
   * Normalize user data from different providers
   */
  private normalizeUserData(provider: string, rawData: ProviderRawData): OAuthUserInfo {
    let normalized: OAuthUserInfo;

    switch (provider) {
      case 'discord': {
        const discordData = rawData as DiscordUser;
        normalized = {
          id: discordData.id,
          email: discordData.email,
          nickname: discordData.username,
          provider: 'discord',
          raw: discordData,
        };
        if (discordData.avatar) {
          normalized.avatar = `https://cdn.discordapp.com/avatars/${discordData.id}/${discordData.avatar}.png`;
        }
        break;
      }

      case 'twitch': {
        const twitchData = rawData as TwitchUserResponse;
        const twitchUser = twitchData.data?.[0];
        if (!twitchUser) {
          throw new OAuthError(OAuthErrorType.USER_INFO_FAILED, 'No user data from Twitch', provider);
        }
        normalized = {
          id: twitchUser.id,
          email: twitchUser.email,
          nickname: twitchUser.display_name || twitchUser.login,
          avatar: twitchUser.profile_image_url,
          provider: 'twitch',
          raw: twitchData,
        };
        break;
      }

      case 'google': {
        const googleData = rawData as GoogleUser;
        normalized = {
          id: googleData.id,
          email: googleData.email,
          nickname: googleData.name || googleData.given_name || googleData.email?.split('@')[0] || 'User',
          avatar: googleData.picture,
          provider: 'google',
          raw: googleData,
        };
        break;
      }

      case 'github': {
        const githubData = rawData as GitHubUser;
        normalized = {
          id: githubData.id.toString(),
          email: githubData.email,
          nickname: githubData.name || githubData.login,
          avatar: githubData.avatar_url,
          provider: 'github',
          raw: githubData,
        };
        break;
      }

      default:
        throw new OAuthError(OAuthErrorType.INVALID_PROVIDER, `Unknown provider: ${provider}`);
    }

    // Validate required fields
    if (!normalized.id || !normalized.nickname) {
      throw new OAuthError(
        OAuthErrorType.USER_INFO_FAILED,
        'Invalid user data from OAuth provider',
        provider
      );
    }

    return normalized;
  }

  /**
   * Generate secure state for OAuth flow
   */
  private async generateState(provider: string, redirectUrl?: string): Promise<string> {
    const nonce = crypto.randomBytes(32).toString('hex');
    const state = crypto.randomBytes(16).toString('hex');

    const stateData: OAuthState = {
      provider,
      timestamp: Date.now(),
      nonce,
    };

    if (redirectUrl) {
      stateData.redirectUrl = redirectUrl;
    }

    // Sauvegarder avec TTL automatique (Redis gère l'expiration)
    await this.stateStorage.save(state, stateData, this.stateExpirationSeconds);

    return state;
  }

  /**
   * Validate OAuth state
   */
  private async validateState(state: string, expectedProvider: string): Promise<OAuthState | null> {
    // get() supprime automatiquement le state (use-once pattern)
    const stateData = await this.stateStorage.get(state);

    if (!stateData) {
      return null;
    }

    // Redis TTL gère l'expiration automatiquement
    // Vérification additionnelle pour double sécurité
    const expirationMs = this.stateExpirationSeconds * 1000;
    if (Date.now() - stateData.timestamp > expirationMs) {
      return null;
    }

    // Check provider
    if (stateData.provider !== expectedProvider) {
      return null;
    }

    return stateData;
  }

  /**
   * Cleanup expired states
   * Note: Redis gère automatiquement l'expiration via TTL
   * Cette méthode est conservée pour monitoring/stats si nécessaire
   */
  async cleanupExpiredStates(): Promise<number> {
    return await this.stateStorage.cleanupExpired();
  }

  /**
   * Get OAuth provider configuration for frontend
   */
  getProviderInfo(provider: string) {
    if (!isProviderSupported(provider)) {
      return null;
    }

    const config = getOAuthConfig(provider)!;
    return {
      name: config.name,
      color: config.color,
      icon: config.icon,
      supported: validateOAuthConfig(provider),
    };
  }

  /**
   * Get all supported providers info
   */
  getAllProvidersInfo() {
    return Object.keys(OAUTH_PROVIDERS)
      .map((provider) => ({
        provider,
        ...this.getProviderInfo(provider),
      }))
      .filter((info) => info.supported);
  }
}

export const oauthService = new OAuthService();

// OAuth Service is ready for use
