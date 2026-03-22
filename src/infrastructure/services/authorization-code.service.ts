/**
 * AuthorizationCodeService — manages SuperOAuth-issued authorization codes
 *
 * Flow:
 *   1. /oauth/authorize → generates code, stores in DB + Redis
 *   2. /oauth/token → validates code + PKCE verifier, marks as used
 *
 * Security:
 *   - Code stored as SHA-256 hash (raw code never persisted)
 *   - TTL: 5 minutes (Redis auto-expire + DB check)
 *   - Use-once: marked used_at on first exchange
 *   - PKCE S256: code_verifier validated against stored code_challenge
 */

import crypto from 'crypto';
import { Repository } from 'typeorm';
import { DatabaseConnection } from '../database/config/database.config';
import { AuthorizationCodeEntity } from '../database/entities/authorization-code.entity';
import { redisClientSingleton } from '../redis/redis-client';
import { logger } from '../../shared/utils/logger.util';

const CODE_TTL_SECONDS = 300; // 5 minutes
const CODE_LENGTH_BYTES = 32; // 64 hex chars
const REDIS_PREFIX = 'oauth:authcode:';

export interface AuthorizationCodeData {
  tenantId: string;
  userId: string;
  provider: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope?: string | undefined;
}

export interface AuthorizationCodeResult {
  code: string; // raw code to return to client
  expiresAt: Date;
}

export class AuthorizationCodeService {
  private repository: Repository<AuthorizationCodeEntity>;

  constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(AuthorizationCodeEntity);
  }

  /**
   * Generate and store an authorization code.
   * Returns the raw code (sent to client). Only the hash is persisted.
   */
  async create(data: AuthorizationCodeData): Promise<AuthorizationCodeResult> {
    const rawCode = crypto.randomBytes(CODE_LENGTH_BYTES).toString('hex');
    const codeHash = this.hashCode(rawCode);
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);

    // Store in DB
    const entity = this.repository.create({
      code: codeHash,
      tenantId: data.tenantId,
      userId: data.userId,
      provider: data.provider,
      redirectUri: data.redirectUri,
      codeChallenge: data.codeChallenge,
      codeChallengeMethod: data.codeChallengeMethod,
      scope: data.scope ?? null,
      expiresAt,
    });
    await this.repository.save(entity);

    // Also store in Redis for fast lookup (auto-expire)
    try {
      const redis = await redisClientSingleton.getClient();
      await redis.setEx(
        `${REDIS_PREFIX}${codeHash}`,
        CODE_TTL_SECONDS,
        JSON.stringify(data)
      );
    } catch {
      // Redis failure is non-critical — DB is the source of truth
      logger.warn('AuthorizationCodeService: Redis cache write failed');
    }

    logger.info('Authorization code created', {
      tenantId: data.tenantId,
      provider: data.provider,
      codeHash: codeHash.substring(0, 8) + '...',
    });

    return { code: rawCode, expiresAt };
  }

  /**
   * Exchange an authorization code for user data.
   * Validates: existence, expiry, use-once, redirect_uri match, PKCE verifier.
   *
   * Returns the stored data on success, null on any validation failure.
   */
  async exchange(
    rawCode: string,
    redirectUri: string,
    codeVerifier: string
  ): Promise<(AuthorizationCodeData & { userId: string }) | null> {
    const codeHash = this.hashCode(rawCode);

    // Find the code in DB
    const entity = await this.repository.findOne({ where: { code: codeHash } });

    if (!entity) {
      logger.warn('Authorization code not found', { codeHash: codeHash.substring(0, 8) + '...' });
      return null;
    }

    // Check expiry
    if (entity.expiresAt < new Date()) {
      logger.warn('Authorization code expired', { codeHash: codeHash.substring(0, 8) + '...' });
      await this.repository.delete({ code: codeHash });
      return null;
    }

    // Check use-once
    if (entity.usedAt) {
      logger.warn('Authorization code already used — possible replay attack', {
        codeHash: codeHash.substring(0, 8) + '...',
        usedAt: entity.usedAt,
      });
      // Delete the code entirely on replay attempt
      await this.repository.delete({ code: codeHash });
      return null;
    }

    // Validate redirect_uri match (exact match required per RFC 6749)
    if (entity.redirectUri !== redirectUri) {
      logger.warn('Authorization code redirect_uri mismatch', {
        expected: entity.redirectUri,
        received: redirectUri,
      });
      return null;
    }

    // Validate PKCE
    if (!this.verifyPkce(codeVerifier, entity.codeChallenge, entity.codeChallengeMethod)) {
      logger.warn('PKCE verification failed', {
        codeHash: codeHash.substring(0, 8) + '...',
        method: entity.codeChallengeMethod,
      });
      return null;
    }

    // Mark as used
    entity.usedAt = new Date();
    await this.repository.save(entity);

    // Clean Redis
    try {
      const redis = await redisClientSingleton.getClient();
      await redis.del(`${REDIS_PREFIX}${codeHash}`);
    } catch {
      // Non-critical
    }

    logger.info('Authorization code exchanged successfully', {
      tenantId: entity.tenantId,
      provider: entity.provider,
      codeHash: codeHash.substring(0, 8) + '...',
    });

    return {
      tenantId: entity.tenantId,
      userId: entity.userId,
      provider: entity.provider,
      redirectUri: entity.redirectUri,
      codeChallenge: entity.codeChallenge,
      codeChallengeMethod: entity.codeChallengeMethod,
      scope: entity.scope ?? undefined,
    };
  }

  /**
   * Clean up expired codes (called periodically or on-demand).
   */
  async cleanupExpired(): Promise<number> {
    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();
    return result.affected ?? 0;
  }

  /**
   * Hash a raw code with SHA-256.
   * The raw code is never stored — only this hash is persisted.
   */
  private hashCode(rawCode: string): string {
    return crypto.createHash('sha256').update(rawCode).digest('hex');
  }

  /**
   * Verify PKCE code_verifier against stored code_challenge.
   * Supports S256 (recommended) and plain (discouraged).
   */
  private verifyPkce(codeVerifier: string, codeChallenge: string, method: string): boolean {
    if (method === 'S256') {
      const computed = crypto
        .createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
      return computed === codeChallenge;
    }

    if (method === 'plain') {
      return codeVerifier === codeChallenge;
    }

    // Unknown method — reject
    return false;
  }
}
