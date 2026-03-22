/**
 * TenantValidationService — validates tenant existence via DB + Redis cache
 *
 * Replaces the hardcoded VALID_TENANTS whitelist (ADR-008 [SG1]).
 * Cache TTL: 5 minutes — tenants don't change frequently.
 */

import { Repository } from 'typeorm';
import { DatabaseConnection } from '../database/config/database.config';
import { TenantEntity } from '../database/entities/tenant.entity';
import { redisClientSingleton } from '../redis/redis-client';
import { logger } from '../../shared/utils/logger.util';

const CACHE_PREFIX = 'tenant:exists:';
const CACHE_TTL_SECONDS = 300; // 5 minutes

export class TenantValidationService {
  private static instance: TenantValidationService;
  private repository: Repository<TenantEntity>;

  private constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(TenantEntity);
  }

  static getInstance(): TenantValidationService {
    if (!TenantValidationService.instance) {
      TenantValidationService.instance = new TenantValidationService();
    }
    return TenantValidationService.instance;
  }

  /**
   * Check if a tenant exists and is active.
   * Looks up Redis cache first, falls back to DB.
   */
  async exists(tenantId: string): Promise<boolean> {
    if (!tenantId) return false;

    // 1. Check Redis cache
    try {
      const redis = await redisClientSingleton.getClient();
      const cached = await redis.get(`${CACHE_PREFIX}${tenantId}`);
      if (cached !== null) {
        return cached === '1';
      }
    } catch {
      // Redis down — fall through to DB
      logger.warn('TenantValidationService: Redis unavailable, falling back to DB', { tenantId });
    }

    // 2. Query DB
    const entity = await this.repository.findOne({
      where: { clientId: tenantId, isActive: true },
      select: ['clientId'],
    });
    const exists = entity !== null;

    // 3. Cache result
    try {
      const redis = await redisClientSingleton.getClient();
      await redis.set(`${CACHE_PREFIX}${tenantId}`, exists ? '1' : '0', { EX: CACHE_TTL_SECONDS });
    } catch {
      // Cache write failure is non-critical
    }

    return exists;
  }

  /**
   * Invalidate cache for a tenant (call after create/delete).
   */
  async invalidateCache(tenantId: string): Promise<void> {
    try {
      const redis = await redisClientSingleton.getClient();
      await redis.del(`${CACHE_PREFIX}${tenantId}`);
    } catch {
      // Non-critical
    }
  }
}
