import { User } from '../../domain/entities';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByProvider(provider: string, providerId: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export interface ISessionRepository {
  create(userId: string, refreshToken: string, expiresAt: Date): Promise<void>;
  findByRefreshToken(refreshToken: string): Promise<{ userId: string; expiresAt: Date } | null>;
  deleteByRefreshToken(refreshToken: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

export interface ITokenService {
  generateAccessToken(userId: string): string;
  generateRefreshToken(): string;
  verifyAccessToken(token: string): { userId: string } | null;
  getTokenExpiration(): { accessToken: number; refreshToken: number };
}

export interface IPasswordService {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface IOAuthService {
  getAuthUrl(provider: string, state: string): string;
  exchangeCodeForTokens(
    provider: string,
    code: string,
    state: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    userInfo: {
      id: string;
      email?: string;
      nickname: string;
    };
  }>;
}
