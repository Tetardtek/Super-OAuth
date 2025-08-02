import { Provider } from './common.types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface UserProfile {
  id: string;
  email: string | null;
  nickname: string;
  emailVerified: boolean;
  linkedProviders: Provider[];
}

export interface RegisterClassicRequest {
  email: string;
  nickname: string;
  password: string;
}

export interface RegisterClassicResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface LoginClassicRequest {
  emailOrNickname: string;
  password: string;
  fingerprint: string;
}

export interface LoginClassicResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface OAuthConnectRequest {
  provider: Provider;
  redirectUri: string;
  state?: string;
}

export interface OAuthConnectResponse {
  authUrl: string;
  state: string;
}

export interface OAuthCallbackRequest {
  provider: Provider;
  code: string;
  state: string;
  fingerprint: string;
}

export interface OAuthCallbackResponse {
  user: UserProfile;
  tokens: AuthTokens;
  isNewUser: boolean;
}
