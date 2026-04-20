import crypto from 'crypto';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';

interface PlatformAccessPayload extends JwtPayload {
  platformUserId: string;
  role: 'suadmin' | 'client';
  type: 'access';
  jti: string;
}

interface PlatformRefreshPayload extends JwtPayload {
  type: 'refresh';
  jti: string;
}

export interface PlatformAccessClaims {
  platformUserId: string;
  role: 'suadmin' | 'client';
  jti: string;
}

/**
 * Issues and verifies platform-audience JWTs — distinct from tenant user tokens.
 *
 * Invariant #10 (SOA-002) : a tenant-issued token must never authenticate a
 * platform request. Isolation is enforced here via `audience='superoauth-platform'`
 * at both issuance and verification — same signing secrets as tenant tokens are
 * acceptable because audience mismatch is a hard fail on verify.
 */
export class PlatformTokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiration: string;
  private readonly refreshExpiration: string;

  private readonly ACCESS_AUDIENCE = 'superoauth-platform';
  private readonly REFRESH_AUDIENCE = 'superoauth-platform-refresh';
  private readonly ISSUER = 'superoauth';

  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET || 'default-access-secret';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
    this.accessExpiration = process.env.JWT_ACCESS_EXPIRATION || '15m';
    this.refreshExpiration = process.env.JWT_REFRESH_EXPIRATION || '7d';

    if (process.env.NODE_ENV === 'production') {
      if (
        this.accessSecret === 'default-access-secret' ||
        this.refreshSecret === 'default-refresh-secret'
      ) {
        throw new Error('JWT secrets must be properly configured in production');
      }
    }
  }

  generateAccessToken(platformUserId: string, role: 'suadmin' | 'client'): string {
    const payload = {
      platformUserId,
      role,
      type: 'access',
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
    };
    const options = {
      expiresIn: this.accessExpiration,
      issuer: this.ISSUER,
      audience: this.ACCESS_AUDIENCE,
    } as SignOptions;
    return jwt.sign(payload, this.accessSecret, options);
  }

  generateRefreshToken(): string {
    const payload = {
      type: 'refresh',
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
    };
    const options = {
      expiresIn: this.refreshExpiration,
      issuer: this.ISSUER,
      audience: this.REFRESH_AUDIENCE,
    } as SignOptions;
    return jwt.sign(payload, this.refreshSecret, options);
  }

  verifyAccessToken(token: string): PlatformAccessClaims | null {
    try {
      const decoded = jwt.verify(token, this.accessSecret, {
        issuer: this.ISSUER,
        audience: this.ACCESS_AUDIENCE,
      }) as PlatformAccessPayload;

      if (decoded.type !== 'access' || !decoded.platformUserId || !decoded.jti) return null;
      return {
        platformUserId: decoded.platformUserId,
        role: decoded.role,
        jti: decoded.jti,
      };
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): { jti: string } | null {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        issuer: this.ISSUER,
        audience: this.REFRESH_AUDIENCE,
      }) as PlatformRefreshPayload;

      if (decoded.type !== 'refresh' || !decoded.jti) return null;
      return { jti: decoded.jti };
    } catch {
      return null;
    }
  }

  getRefreshExpirationMs(): number {
    return this.parseDuration(this.refreshExpiration);
  }

  private parseDuration(d: string): number {
    const match = d.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid duration: ${d}`);
    const value = parseInt(match[1]);
    const unit = match[2];
    const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return value * mult[unit as keyof typeof mult];
  }
}
