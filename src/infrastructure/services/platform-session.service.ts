import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { LessThan, Repository } from 'typeorm';
import { PlatformSessionEntity } from '../database/entities/platform-session.entity';
import { DatabaseConnection } from '../database/config/database.config';
import { logger } from '../../shared/utils/logger.util';

export interface PlatformSessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

export interface PlatformSessionRecord {
  id: string;
  platformUserId: string;
  expiresAt: Date;
  deviceFingerprint?: string;
}

export class PlatformSessionService {
  private repository: Repository<PlatformSessionEntity>;

  constructor() {
    this.repository = DatabaseConnection.getDataSource().getRepository(PlatformSessionEntity);
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async create(
    platformUserId: string,
    rawRefreshToken: string,
    expiresAt: Date,
    metadata?: PlatformSessionMetadata
  ): Promise<PlatformSessionRecord> {
    const session = this.repository.create({
      id: randomUUID(),
      platformUserId,
      refreshTokenHash: this.hashToken(rawRefreshToken),
      expiresAt,
      userAgent: metadata?.userAgent ?? null,
      ipAddress: metadata?.ipAddress ?? null,
      deviceFingerprint: metadata?.deviceFingerprint ?? null,
    });

    await this.repository.save(session);

    logger.info('Platform session created', { platformUserId, sessionId: session.id });

    return {
      id: session.id,
      platformUserId: session.platformUserId,
      expiresAt: session.expiresAt,
      ...(session.deviceFingerprint && { deviceFingerprint: session.deviceFingerprint }),
    };
  }

  async findByRefreshToken(rawRefreshToken: string): Promise<PlatformSessionRecord | null> {
    const hash = this.hashToken(rawRefreshToken);
    const session = await this.repository.findOne({ where: { refreshTokenHash: hash } });

    if (!session) return null;
    if (session.revokedAt) {
      logger.warn('Platform session already revoked', { sessionId: session.id });
      return null;
    }
    if (session.expiresAt < new Date()) {
      logger.warn('Platform session expired', { sessionId: session.id });
      return null;
    }

    session.lastUsedAt = new Date();
    await this.repository.save(session);

    return {
      id: session.id,
      platformUserId: session.platformUserId,
      expiresAt: session.expiresAt,
      ...(session.deviceFingerprint && { deviceFingerprint: session.deviceFingerprint }),
    };
  }

  async revokeByRefreshToken(rawRefreshToken: string): Promise<void> {
    const hash = this.hashToken(rawRefreshToken);
    await this.repository
      .createQueryBuilder()
      .update(PlatformSessionEntity)
      .set({ revokedAt: new Date() })
      .where('refresh_token_hash = :hash AND revoked_at IS NULL', { hash })
      .execute();
  }

  async revokeAllForUser(platformUserId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(PlatformSessionEntity)
      .set({ revokedAt: new Date() })
      .where('platform_user_id = :platformUserId AND revoked_at IS NULL', { platformUserId })
      .execute();

    logger.info('All platform sessions revoked for user', { platformUserId });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.repository.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }
}
