import crypto from 'crypto';
import { Repository } from 'typeorm';
import { EmailTokenEntity } from '../database/entities/email-token.entity';
import { DatabaseConnection } from '../database/config/database.config';
import { logger } from '../../shared/utils/logger.util';

const VERIFICATION_TTL_HOURS = 24;
const MERGE_TTL_MINUTES = 15;

export interface CreateVerificationTokenData {
  userId: string;
  tenantId: string;
}

export interface CreateMergeTokenData {
  userId: string;
  tenantId: string;
  provider: string;
  providerId: string;
  providerDisplayName?: string;
  providerEmail?: string;
  providerMetadata?: Record<string, unknown>;
}

export interface EmailTokenResult {
  rawToken: string;
  expiresAt: Date;
}

export class EmailTokenService {
  private repository: Repository<EmailTokenEntity>;

  constructor() {
    this.repository = DatabaseConnection.getDataSource().getRepository(EmailTokenEntity);
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async createVerificationToken(data: CreateVerificationTokenData): Promise<EmailTokenResult> {
    // Invalidate previous verification tokens for this user
    await this.repository.delete({ userId: data.userId, type: 'verification' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

    const entity = this.repository.create({
      token: tokenHash,
      userId: data.userId,
      tenantId: data.tenantId,
      type: 'verification',
      expiresAt,
    });

    await this.repository.save(entity);

    logger.info('Verification token created', { userId: data.userId, tenantId: data.tenantId });

    return { rawToken, expiresAt };
  }

  async createMergeToken(data: CreateMergeTokenData): Promise<EmailTokenResult> {
    // Invalidate previous merge tokens for this user+provider
    await this.repository
      .createQueryBuilder()
      .delete()
      .where('userId = :userId AND type = :type AND provider = :provider', {
        userId: data.userId,
        type: 'merge',
        provider: data.provider,
      })
      .execute();

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + MERGE_TTL_MINUTES * 60 * 1000);

    const entity = this.repository.create({
      token: tokenHash,
      userId: data.userId,
      tenantId: data.tenantId,
      type: 'merge',
      provider: data.provider,
      providerId: data.providerId,
      providerDisplayName: data.providerDisplayName ?? null,
      providerEmail: data.providerEmail ?? null,
      providerMetadata: data.providerMetadata ? JSON.stringify(data.providerMetadata) : null,
      expiresAt,
    });

    await this.repository.save(entity);

    logger.info('Merge token created', {
      userId: data.userId,
      provider: data.provider,
      tenantId: data.tenantId,
    });

    return { rawToken, expiresAt };
  }

  async verifyToken(rawToken: string, expectedType: 'verification' | 'merge'): Promise<EmailTokenEntity | null> {
    const tokenHash = this.hashToken(rawToken);

    const entity = await this.repository.findOne({ where: { token: tokenHash } });

    if (!entity) {
      logger.warn('Email token not found');
      return null;
    }

    if (entity.type !== expectedType) {
      logger.warn('Email token type mismatch', { expected: expectedType, actual: entity.type });
      return null;
    }

    if (entity.expiresAt < new Date()) {
      logger.warn('Email token expired');
      await this.repository.delete({ token: tokenHash });
      return null;
    }

    if (entity.usedAt) {
      logger.warn('Email token already used');
      return null;
    }

    // Mark as used
    entity.usedAt = new Date();
    await this.repository.save(entity);

    return entity;
  }
}
