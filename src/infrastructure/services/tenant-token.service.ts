import crypto from 'crypto';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { TenantRepository } from './tenant.repository';

interface TenantAccessTokenPayload extends JwtPayload {
  userId: string;
  tenantId: string;
  type: 'access';
  jti: string;
}

/**
 * TenantTokenService — JWT par tenant (Tier 3)
 *
 * Le secret JWT est stocké chiffré en DB (AES-256-GCM).
 * Chaque tenant signe ses tokens avec son secret propre.
 * Fallback sur JWT_ACCESS_SECRET global si le tenant n'est pas trouvé.
 */
export class TenantTokenService {
  private readonly accessTokenExpiration: string;
  private readonly fallbackSecret: string;

  constructor(private readonly tenantRepository: TenantRepository) {
    this.accessTokenExpiration = process.env.JWT_ACCESS_EXPIRATION || '15m';
    this.fallbackSecret = process.env.JWT_ACCESS_SECRET || 'default-access-secret';
  }

  async generateAccessToken(userId: string, tenantId: string): Promise<string> {
    const secret = await this.resolveSecret(tenantId);

    const payload = {
      userId,
      tenantId,
      type: 'access',
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
    };

    // Type cast needed because StringValue from 'ms' package is a branded type
    const options = {
      expiresIn: this.accessTokenExpiration,
      issuer: 'superoauth',
      audience: 'superoauth-users',
    } as SignOptions;

    return jwt.sign(payload, secret, options);
  }

  async verifyAccessToken(
    token: string,
    tenantId: string
  ): Promise<{ userId: string; jti: string; tenantId: string } | null> {
    try {
      const secret = await this.resolveSecret(tenantId);
      const decoded = jwt.verify(token, secret, {
        issuer: 'superoauth',
        audience: 'superoauth-users',
      }) as TenantAccessTokenPayload;

      if (decoded.type !== 'access' || !decoded.userId || !decoded.jti) return null;
      return { userId: decoded.userId, jti: decoded.jti, tenantId: decoded.tenantId };
    } catch {
      return null;
    }
  }

  private async resolveSecret(tenantId: string): Promise<string> {
    try {
      const secret = await this.tenantRepository.getJwtSecret(tenantId);
      return secret ?? this.fallbackSecret;
    } catch {
      return this.fallbackSecret;
    }
  }
}
