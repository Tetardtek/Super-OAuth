// Authentication DTOs for Use Cases

export interface RegisterClassicDto {
  email: string;
  password: string;
  nickname: string;
  tenantId: string;
}

export interface LoginClassicDto {
  email: string;
  password: string;
  tenantId: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
  deviceFingerprint?: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
  expiresIn?: number;
  isNewUser?: boolean;
}

export interface UserDto {
  id: string;
  tenantId: string;
  email: string | null;
  nickname: string;
  emailVerified: boolean;
  isActive: boolean;
  linkedProviders: string[];
  authProvider?: string;
  createdAt: Date;
  lastLogin: Date | null;
  loginCount: number;
}

export interface OAuthProviderDto {
  provider: string;
  providerId: string;
  email?: string;
  nickname: string;
  accessToken: string;
  refreshToken?: string;
}

export interface LinkProviderDto {
  userId: string;
  provider: OAuthProviderDto;
}

export interface ValidateTokenDto {
  token: string;
}

export interface TokenValidationResponseDto {
  user: {
    id: string;
    tenantId: string;
    email: string | null;
    nickname: string;
    isActive: boolean;
    linkedProviders: string[];
  };
}
