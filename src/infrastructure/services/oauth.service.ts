// Liste blanche dynamique des redirect_uri autorisés par provider (via .env)
const REDIRECT_URI_WHITELIST: Record<string, string[]> = {
  discord: process.env.REDIRECT_URIS_DISCORD?.split(',') || [],
  twitch: process.env.REDIRECT_URIS_TWITCH?.split(',') || [],
  google: process.env.REDIRECT_URIS_GOOGLE?.split(',') || [],
  github: process.env.REDIRECT_URIS_GITHUB?.split(',') || [],
};
import crypto from 'crypto';
import { IOAuthService } from '../../application/interfaces/repositories.interface';
import { RedisStateStorage } from '../redis/redis-state-storage';
import axios from 'axios';

interface OAuthProvider {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  redirectUri: string;
}

interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string | undefined;
  token_type?: string | undefined;
  expires_in?: number | undefined;
  scope?: string | undefined;
  error?: string | undefined;
  error_description?: string | undefined;
}

const STATE_TTL_SECONDS = 600; // 10 minutes

export class OAuthService implements IOAuthService {
  private providers: Record<string, OAuthProvider>;
  private stateStorage = new RedisStateStorage();

  constructor() {
    this.providers = {
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID || '',
        clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
        authUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        userInfoUrl: 'https://discord.com/api/users/@me',
        scope: 'identify email',
        redirectUri:
          process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback',
      },
      twitch: {
        clientId: process.env.TWITCH_CLIENT_ID || '',
        clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
        authUrl: 'https://id.twitch.tv/oauth2/authorize',
        tokenUrl: 'https://id.twitch.tv/oauth2/token',
        userInfoUrl: 'https://api.twitch.tv/helix/users',
        scope: 'user:read:email',
        redirectUri:
          process.env.TWITCH_REDIRECT_URI || 'http://localhost:3000/auth/twitch/callback',
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: 'openid email profile',
        redirectUri:
          process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scope: 'user:email',
        redirectUri:
          process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/auth/github/callback',
      },
    };
  }

  async generateAuthUrl(
    provider: string,
    tenantId: string,
    redirectUri?: string
  ): Promise<{ authUrl: string; state: string }> {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    let effectiveRedirectUri = config.redirectUri;
    if (redirectUri) {
      if (!REDIRECT_URI_WHITELIST[provider]?.includes(redirectUri)) {
        throw new Error('redirect_uri non autorisé');
      }
      effectiveRedirectUri = redirectUri;
    }

    const state = crypto.randomBytes(16).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');

    await this.stateStorage.save(
      state,
      { provider, tenantId, timestamp: Date.now(), nonce },
      STATE_TTL_SECONDS
    );

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: effectiveRedirectUri,
      scope: config.scope,
      state,
      response_type: 'code',
    });

    if (provider === 'google') {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
    }

    return { authUrl: `${config.authUrl}?${params.toString()}`, state };
  }

  async exchangeCodeForTokens(
    provider: string,
    code: string,
    state: string,
    redirectUri?: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    tenantId: string;
    userInfo: {
      id: string;
      email?: string;
      emailVerified: boolean;
      nickname: string;
    };
  }> {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    // Retrieve tenantId from Redis state (use-once)
    const stateData = await this.stateStorage.get(state);
    const tenantId = stateData?.tenantId ?? 'origins';

    // Exchange code for tokens
    const tokenResponse = await this.exchangeCode(config, code, redirectUri);

    // Get user information
    const userInfo = await this.getUserInfo(provider, config, tokenResponse.access_token);

    return {
      accessToken: tokenResponse.access_token,
      ...(tokenResponse.refresh_token && { refreshToken: tokenResponse.refresh_token }),
      tenantId,
      userInfo: {
        id: userInfo.id,
        ...(userInfo.email && { email: userInfo.email }),
        emailVerified: userInfo.emailVerified,
        nickname: userInfo.nickname,
      },
    };
  }

  private async exchangeCode(
    config: OAuthProvider,
    code: string,
    redirectUri?: string
  ): Promise<OAuthTokenResponse> {
    const data = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: redirectUri || config.redirectUri,
      grant_type: 'authorization_code',
    };

    const response = await axios.post<OAuthTokenResponse>(config.tokenUrl, data, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data.error) {
      throw new Error(`OAuth token exchange failed: ${response.data.error_description}`);
    }

    return response.data;
  }

  private async getUserInfo(
    provider: string,
    config: OAuthProvider,
    accessToken: string
  ): Promise<{
    id: string;
    email?: string;
    emailVerified: boolean;
    nickname: string;
  }> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    if (provider === 'twitch') {
      headers['Client-ID'] = config.clientId;
    }

    const response = await axios.get(config.userInfoUrl, { headers });

    switch (provider) {
      case 'discord':
        return {
          id: response.data.id,
          email: response.data.email,
          emailVerified: response.data.verified ?? false,
          nickname: response.data.username,
        };

      case 'twitch': {
        const twitchUser = response.data.data[0];
        return {
          id: twitchUser.id,
          email: twitchUser.email,
          emailVerified: !!twitchUser.email,
          nickname: twitchUser.display_name || twitchUser.login,
        };
      }

      case 'google':
        return {
          id: response.data.id,
          email: response.data.email,
          emailVerified: response.data.verified_email ?? false,
          nickname: response.data.name || response.data.given_name,
        };

      case 'github':
        return {
          id: String(response.data.id),
          email: response.data.email,
          emailVerified: !!response.data.email,
          nickname: response.data.login,
        };

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
