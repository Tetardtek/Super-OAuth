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

export interface ITenantTokenService {
  generateAccessToken(userId: string, tenantId: string): Promise<string>;
  verifyAccessToken(
    token: string,
    tenantId: string
  ): Promise<{ userId: string; jti: string; tenantId: string } | null>;
}

export type AuditEvent =
  | 'login'
  | 'register'
  | 'link'
  | 'unlink'
  | 'merge'
  | 'password_reset'
  | 'token_refresh';

export interface IAuditLogService {
  log(entry: {
    tenantId: string;
    userId?: string | null;
    event: AuditEvent;
    ip?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void>;
}

export interface ITokenBlacklist {
  revoke(jti: string, ttlSeconds: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
}

export interface IPasswordService {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface IEmailService {
  sendVerificationEmail(to: string, token: string, tenantId: string): Promise<void>;
  sendMergeEmail(to: string, token: string, provider: string, tenantId: string): Promise<void>;
}

export interface IEmailTokenService {
  createVerificationToken(data: { userId: string; tenantId: string }): Promise<{ rawToken: string; expiresAt: Date }>;
  createMergeToken(data: {
    userId: string;
    tenantId: string;
    provider: string;
    providerId: string;
    providerDisplayName?: string;
    providerEmail?: string;
    providerMetadata?: Record<string, unknown>;
  }): Promise<{ rawToken: string; expiresAt: Date }>;
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
