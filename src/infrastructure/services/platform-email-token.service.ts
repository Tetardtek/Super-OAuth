import crypto from 'crypto';
import { Repository } from 'typeorm';
import { PlatformEmailTokenEntity } from '../database/entities/platform-email-token.entity';
import { DatabaseConnection } from '../database/config/database.config';
import { logger } from '../../shared/utils/logger.util';

const VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 60;

export type PlatformEmailTokenType = 'verification' | 'password_reset';

export interface CreatePlatformTokenData {
  platformUserId: string;
}

export interface PlatformEmailTokenResult {
  rawToken: string;
  expiresAt: Date;
}

export class PlatformEmailTokenService {
  private repository: Repository<PlatformEmailTokenEntity>;

  constructor() {
    this.repository = DatabaseConnection.getDataSource().getRepository(PlatformEmailTokenEntity);
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async createVerificationToken(
    data: CreatePlatformTokenData
  ): Promise<PlatformEmailTokenResult> {
    await this.repository.delete({ platformUserId: data.platformUserId, type: 'verification' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

    const entity = this.repository.create({
      token: tokenHash,
      platformUserId: data.platformUserId,
      type: 'verification',
      expiresAt,
    });

    await this.repository.save(entity);

    logger.info('Platform verification token created', { platformUserId: data.platformUserId });

    return { rawToken, expiresAt };
  }

  async createPasswordResetToken(
    data: CreatePlatformTokenData
  ): Promise<PlatformEmailTokenResult> {
    await this.repository.delete({ platformUserId: data.platformUserId, type: 'password_reset' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

    const entity = this.repository.create({
      token: tokenHash,
      platformUserId: data.platformUserId,
      type: 'password_reset',
      expiresAt,
    });

    await this.repository.save(entity);

    logger.info('Platform password reset token created', {
      platformUserId: data.platformUserId,
    });

    return { rawToken, expiresAt };
  }

  async verifyToken(
    rawToken: string,
    expectedType: PlatformEmailTokenType
  ): Promise<PlatformEmailTokenEntity | null> {
    const tokenHash = this.hashToken(rawToken);

    const entity = await this.repository.findOne({ where: { token: tokenHash } });

    if (!entity) {
      logger.warn('Platform email token not found');
      return null;
    }

    if (entity.type !== expectedType) {
      logger.warn('Platform email token type mismatch', {
        expected: expectedType,
        actual: entity.type,
      });
      return null;
    }

    if (entity.expiresAt < new Date()) {
      logger.warn('Platform email token expired');
      await this.repository.delete({ token: tokenHash });
      return null;
    }

    if (entity.usedAt) {
      logger.warn('Platform email token already used');
      return null;
    }

    entity.usedAt = new Date();
    await this.repository.save(entity);

    return entity;
  }
}
