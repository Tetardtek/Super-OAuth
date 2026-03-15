import { User } from '../../domain/entities';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string, tenantId: string): Promise<User | null>;
  findByProvider(provider: string, providerId: string, tenantId: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export interface ISessionRepository {
  create(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    metadata?: { ipAddress?: string; userAgent?: string; deviceFingerprint?: string }
  ): Promise<void>;
  findByRefreshToken(refreshToken: string): Promise<{ userId: string; expiresAt: Date; deviceFingerprint?: string } | null>;
  deleteByRefreshToken(refreshToken: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

export interface ITokenService {
  generateAccessToken(userId: string, tenantId: string): string;
  generateRefreshToken(): string;
  verifyAccessToken(token: string): { userId: string; jti: string; tenantId: string } | null;
  decodeAccessToken(token: string): { userId: string; jti: string; exp: number; tenantId: string } | null;
  getTokenExpiration(): { accessToken: number; refreshToken: number };
}

export interface ITokenBlacklist {
  revoke(jti: string, ttlSeconds: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
}

export interface IPasswordService {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface IOAuthService {
  generateAuthUrl(
    provider: string,
    tenantId: string,
    redirectUri?: string
  ): Promise<{ authUrl: string; state: string }>;
  exchangeCodeForTokens(
    provider: string,
    code: string,
    state: string
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
  }>;
}
