export interface JwtConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  issuer: string;
  audience: string;
}

export interface EncryptionConfig {
  algorithm: string;
  key: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  loginMax: number;
  registerMax: number;
}

export interface SecurityConfig {
  jwt: JwtConfig;
  encryption: EncryptionConfig;
  rateLimit: RateLimitConfig;
  passwordHashRounds: number;
}

export const getSecurityConfig = (): SecurityConfig => ({
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    issuer: process.env.JWT_ISSUER || 'superoauth',
    audience: process.env.JWT_AUDIENCE || 'superoauth-api',
  },
  encryption: {
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    key: process.env.ENCRYPTION_KEY || 'your-32-char-encryption-key-exactly',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    loginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5', 10),
    registerMax: parseInt(process.env.RATE_LIMIT_REGISTER_MAX || '3', 10),
  },
  passwordHashRounds: parseInt(process.env.PASSWORD_HASH_ROUNDS || '12', 10),
});
