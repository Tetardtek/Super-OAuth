export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

export interface OAuthConfig {
  discord: ProviderConfig;
  twitch: ProviderConfig;
  google: ProviderConfig;
  github: ProviderConfig;
}

export const getOAuthConfig = (): OAuthConfig => ({
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri:
      process.env.DISCORD_REDIRECT_URI ||
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/auth/provider/discord/callback`,
    scopes: (process.env.DISCORD_SCOPES || 'identify,email').split(','),
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
  },
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID || '',
    clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    redirectUri:
      process.env.TWITCH_REDIRECT_URI ||
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/auth/provider/twitch/callback`,
    scopes: (process.env.TWITCH_SCOPES || 'user:read:email').split(','),
    authUrl: 'https://id.twitch.tv/oauth2/authorize',
    tokenUrl: 'https://id.twitch.tv/oauth2/token',
    userInfoUrl: 'https://api.twitch.tv/helix/users',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/auth/provider/google/callback`,
    scopes: (process.env.GOOGLE_SCOPES || 'openid,profile,email').split(','),
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    redirectUri:
      process.env.GITHUB_REDIRECT_URI ||
      `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/auth/provider/github/callback`,
    scopes: (process.env.GITHUB_SCOPES || 'user:email').split(','),
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
  },
});
