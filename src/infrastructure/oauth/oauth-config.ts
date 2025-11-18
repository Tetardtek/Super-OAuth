/**
 * OAuth Providers Configuration
 * Support for Discord, Twitch, Google, and GitHub
 * @version 1.0.0
 */

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  name: string;
  color: string;
  icon: string;
}

export interface OAuthProviders {
  discord: OAuthProviderConfig;
  twitch: OAuthProviderConfig;
  google: OAuthProviderConfig;
  github: OAuthProviderConfig;
}

/**
 * OAuth Provider Configurations
 */
export const OAUTH_PROVIDERS: OAuthProviders = {
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri:
      process.env.DISCORD_REDIRECT_URI || `${process.env.APP_URL}/auth/oauth/discord/callback`,
    scope: ['identify', 'email'],
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/v10/users/@me',
    name: 'Discord',
    color: '#5865F2',
    icon: '🎮',
  },

  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID || '',
    clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    redirectUri:
      process.env.TWITCH_REDIRECT_URI || `${process.env.APP_URL}/auth/oauth/twitch/callback`,
    scope: ['user:read:email'],
    authUrl: 'https://id.twitch.tv/oauth2/authorize',
    tokenUrl: 'https://id.twitch.tv/oauth2/token',
    userInfoUrl: 'https://api.twitch.tv/helix/users',
    name: 'Twitch',
    color: '#9146FF',
    icon: '🟣',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/auth/oauth/google/callback`,
    scope: ['openid', 'profile', 'email'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    name: 'Google',
    color: '#4285F4',
    icon: '🔍',
  },

  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    redirectUri:
      process.env.GITHUB_REDIRECT_URI || `${process.env.APP_URL}/auth/oauth/github/callback`,
    scope: ['user:email'],
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    name: 'GitHub',
    color: '#24292F',
    icon: '🐙',
  },
};

/**
 * Validate OAuth provider configuration
 */
export function validateOAuthConfig(provider: string): boolean {
  const config = OAUTH_PROVIDERS[provider as keyof OAuthProviders];
  if (!config) return false;

  return !!(
    config.clientId &&
    config.clientSecret &&
    config.redirectUri &&
    config.authUrl &&
    config.tokenUrl &&
    config.userInfoUrl
  );
}

/**
 * Get OAuth provider configuration
 */
export function getOAuthConfig(provider: string): OAuthProviderConfig | null {
  const config = OAUTH_PROVIDERS[provider as keyof OAuthProviders];
  return config || null;
}

/**
 * Get list of supported OAuth providers
 */
export function getSupportedProviders(): string[] {
  return Object.keys(OAUTH_PROVIDERS);
}

/**
 * Check if provider is supported
 */
export function isProviderSupported(provider: string): boolean {
  return getSupportedProviders().includes(provider);
}

/**
 * OAuth State Management
 */
export interface OAuthState {
  provider: string;
  timestamp: number;
  nonce: string;
  redirectUrl?: string;
}

/**
 * OAuth Token Response
 */
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Normalized OAuth User Info
 */
export interface OAuthUserInfo {
  id: string;
  email?: string;
  nickname: string;
  avatar?: string;
  provider: string;
  raw: any; // Original provider response
}

/**
 * OAuth Error Types
 */
export enum OAuthErrorType {
  INVALID_PROVIDER = 'INVALID_PROVIDER',
  INVALID_STATE = 'INVALID_STATE',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INVALID_CODE = 'INVALID_CODE',
  TOKEN_EXCHANGE_FAILED = 'TOKEN_EXCHANGE_FAILED',
  USER_INFO_FAILED = 'USER_INFO_FAILED',
  ACCOUNT_LINK_FAILED = 'ACCOUNT_LINK_FAILED',
}

export class OAuthError extends Error {
  constructor(
    public type: OAuthErrorType,
    message: string,
    public provider?: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

// OAuth providers configuration is ready for service initialization
