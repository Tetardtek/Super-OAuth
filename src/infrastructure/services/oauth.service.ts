// Liste blanche dynamique des redirect_uri autorisés par provider (via .env)
const REDIRECT_URI_WHITELIST: Record<string, string[]> = {
  discord: process.env.REDIRECT_URIS_DISCORD?.split(',') || [],
  twitch: process.env.REDIRECT_URIS_TWITCH?.split(',') || [],
  google: process.env.REDIRECT_URIS_GOOGLE?.split(',') || [],
  github: process.env.REDIRECT_URIS_GITHUB?.split(',') || []
};
import { IOAuthService } from '../../application/interfaces/repositories.interface';
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

export class OAuthService implements IOAuthService {
  private providers: Record<string, OAuthProvider>;

  constructor() {
    this.providers = {
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID || '',
        clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
        authUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        userInfoUrl: 'https://discord.com/api/users/@me',
        scope: 'identify email',
        redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback'
      },
      twitch: {
        clientId: process.env.TWITCH_CLIENT_ID || '',
        clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
        authUrl: 'https://id.twitch.tv/oauth2/authorize',
        tokenUrl: 'https://id.twitch.tv/oauth2/token',
        userInfoUrl: 'https://api.twitch.tv/helix/users',
        scope: 'user:read:email',
        redirectUri: process.env.TWITCH_REDIRECT_URI || 'http://localhost:3000/auth/twitch/callback'
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scope: 'openid email profile',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        scope: 'user:email',
        redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/auth/github/callback'
      }
    };
  }

  getAuthUrl(provider: string, state: string, redirectUri?: string): string {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
    let effectiveRedirectUri = config.redirectUri;
    if (redirectUri) {
      // Sécurité : n'accepte que les URLs whitelisted
      if (!REDIRECT_URI_WHITELIST[provider]?.includes(redirectUri)) {
        throw new Error('redirect_uri non autorisé');
      }
      effectiveRedirectUri = redirectUri;
    }
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: effectiveRedirectUri,
      scope: config.scope,
      state: state,
      response_type: 'code'
    });
    // Provider-specific parameters
    if (provider === 'google') {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
    }
    return `${config.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(provider: string, code: string, _state: string, redirectUri?: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    userInfo: {
      id: string;
      email?: string;
      nickname: string;
    };
  }> {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    // Exchange code for tokens
    const tokenResponse = await this.exchangeCode(config, code, redirectUri);
    
    // Get user information
    const userInfo = await this.getUserInfo(provider, config, tokenResponse.access_token);

    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      userInfo: {
        id: userInfo.id,
        ...(userInfo.email && { email: userInfo.email }),
        nickname: userInfo.nickname
      }
    };
  }

  private async exchangeCode(config: OAuthProvider, code: string, redirectUri?: string): Promise<any> {
    const data = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: redirectUri || config.redirectUri,
      grant_type: 'authorization_code'
    };

    const response = await axios.post(config.tokenUrl, data, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (response.data.error) {
      throw new Error(`OAuth token exchange failed: ${response.data.error_description}`);
    }

    return response.data;
  }

  private async getUserInfo(provider: string, config: OAuthProvider, accessToken: string): Promise<{
    id: string;
    email?: string;
    nickname: string;
  }> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`
    };

    // Twitch requires Client-ID header
    if (provider === 'twitch') {
      headers['Client-ID'] = config.clientId;
    }

    const response = await axios.get(config.userInfoUrl, { headers });

    // Parse response based on provider
    switch (provider) {
      case 'discord':
        return {
          id: response.data.id,
          email: response.data.email,
          nickname: response.data.username
        };

      case 'twitch': {
        const twitchUser = response.data.data[0];
        return {
          id: twitchUser.id,
          email: twitchUser.email,
          nickname: twitchUser.display_name || twitchUser.login
        };
      }

      case 'google':
        return {
          id: response.data.id,
          email: response.data.email,
          nickname: response.data.name || response.data.given_name
        };

      case 'github':
        return {
          id: response.data.id.toString(),
          email: response.data.email,
          nickname: response.data.login
        };

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
