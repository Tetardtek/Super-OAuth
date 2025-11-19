import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { ITokenService } from '../../application/interfaces/repositories.interface';

interface AccessTokenPayload extends JwtPayload {
  userId: string;
  type: 'access';
}

interface RefreshTokenPayload extends JwtPayload {
  type: 'refresh';
  jti: string;
}

export class TokenService implements ITokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiration: string;
  private readonly refreshTokenExpiration: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'default-access-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
    this.accessTokenExpiration = process.env.JWT_ACCESS_EXPIRATION || '15m';
    this.refreshTokenExpiration = process.env.JWT_REFRESH_EXPIRATION || '7d';

    // Validate secrets in production
    if (process.env.NODE_ENV === 'production') {
      if (
        this.accessTokenSecret === 'default-access-secret' ||
        this.refreshTokenSecret === 'default-refresh-secret'
      ) {
        throw new Error('JWT secrets must be properly configured in production');
      }
    }
  }

  generateAccessToken(userId: string): string {
    const payload = {
      userId,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
    };

    // Type assertion needed because StringValue from 'ms' package is a branded type
    const options = {
      expiresIn: this.accessTokenExpiration,
      issuer: 'superoauth',
      audience: 'superoauth-users',
    } as SignOptions;

    return jwt.sign(payload, this.accessTokenSecret, options);
  }

  generateRefreshToken(): string {
    const payload = {
      type: 'refresh',
      jti: this.generateJti(), // Unique identifier for the token
      iat: Math.floor(Date.now() / 1000),
    };

    // Type assertion needed because StringValue from 'ms' package is a branded type
    const options = {
      expiresIn: this.refreshTokenExpiration,
      issuer: 'superoauth',
      audience: 'superoauth-refresh',
    } as SignOptions;

    return jwt.sign(payload, this.refreshTokenSecret, options);
  }

  verifyAccessToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'superoauth',
        audience: 'superoauth-users',
      }) as AccessTokenPayload;

      if (decoded.type !== 'access' || !decoded.userId) {
        return null;
      }

      return { userId: decoded.userId };
    } catch (error) {
      return null;
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'superoauth',
        audience: 'superoauth-refresh',
      }) as RefreshTokenPayload;

      return decoded;
    } catch (error) {
      return null;
    }
  }

  getTokenExpiration(): { accessToken: number; refreshToken: number } {
    return {
      accessToken: this.parseExpiration(this.accessTokenExpiration),
      refreshToken: this.parseExpiration(this.refreshTokenExpiration),
    };
  }

  private parseExpiration(expiration: string): number {
    // Parse duration strings like '15m', '7d', '1h'
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiration}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      s: 1000, // seconds
      m: 60 * 1000, // minutes
      h: 60 * 60 * 1000, // hours
      d: 24 * 60 * 60 * 1000, // days
    };

    return value * multipliers[unit as keyof typeof multipliers];
  }

  private generateJti(): string {
    // Generate a unique identifier for the token
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Revoke a token (placeholder implementation)
   */
  async revokeToken(_token: string): Promise<void> {
    // Implementation would depend on your token storage strategy
    // Could be stored in Redis, database, or in-memory blacklist
  }
}

// Export singleton instance
export const tokenService = new TokenService();
