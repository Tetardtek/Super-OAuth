/**
 * OAuth Service - Handles all OAuth provider interactions
 * Supports Discord, Twitch, Google, and GitHub
 * @version 1.0.0
 */

import crypto from 'crypto';
import axios from 'axios';
import {
  OAUTH_PROVIDERS,
  OAuthState,
  OAuthTokenResponse,
  OAuthUserInfo,
  OAuthError,
  OAuthErrorType,
  validateOAuthConfig,
  getOAuthConfig,
  isProviderSupported,
} from './oauth-config';
import { logger } from '../../shared/utils/logger.util';

export class OAuthService {
  private stateStorage = new Map<string, OAuthState>();
  private readonly stateExpirationMs = 10 * 60 * 1000; // 10 minutes

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
    const state = this.generateState(provider, redirectUrl);

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

      // Cleanup state
      this.stateStorage.delete(state);

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
  private normalizeUserData(provider: string, rawData: any): OAuthUserInfo {
    let normalized: OAuthUserInfo;

    switch (provider) {
      case 'discord':
        normalized = {
          id: rawData.id,
          email: rawData.email,
          nickname: rawData.username,
          provider: 'discord',
          raw: rawData,
        };
        if (rawData.avatar) {
          normalized.avatar = `https://cdn.discordapp.com/avatars/${rawData.id}/${rawData.avatar}.png`;
        }
        break;

      case 'twitch': {
        const twitchUser = rawData.data?.[0]; // Twitch returns array
        normalized = {
          id: twitchUser?.id || rawData.id,
          email: twitchUser?.email || rawData.email,
          nickname: twitchUser?.display_name || twitchUser?.login || rawData.login,
          avatar: twitchUser?.profile_image_url || rawData.profile_image_url,
          provider: 'twitch',
          raw: rawData,
        };
        break;
      }

      case 'google':
        normalized = {
          id: rawData.id,
          email: rawData.email,
          nickname: rawData.name || rawData.given_name || rawData.email?.split('@')[0],
          avatar: rawData.picture,
          provider: 'google',
          raw: rawData,
        };
        break;

      case 'github':
        normalized = {
          id: rawData.id.toString(),
          email: rawData.email,
          nickname: rawData.name || rawData.login,
          avatar: rawData.avatar_url,
          provider: 'github',
          raw: rawData,
        };
        break;

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
  private generateState(provider: string, redirectUrl?: string): string {
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

    this.stateStorage.set(state, stateData);

    // Cleanup expired states
    this.cleanupExpiredStates();

    return state;
  }

  /**
   * Validate OAuth state
   */
  private validateState(state: string, expectedProvider: string): OAuthState | null {
    const stateData = this.stateStorage.get(state);

    if (!stateData) {
      return null;
    }

    // Check expiration
    if (Date.now() - stateData.timestamp > this.stateExpirationMs) {
      this.stateStorage.delete(state);
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
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    for (const [state, data] of this.stateStorage.entries()) {
      if (now - data.timestamp > this.stateExpirationMs) {
        this.stateStorage.delete(state);
      }
    }
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
