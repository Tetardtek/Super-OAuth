import { ISessionRepository } from '../../application/interfaces/repositories.interface';
import { Repository } from 'typeorm';
import { SessionEntity } from '../database/entities/session.entity';
import { DatabaseConnection } from '../database/config/database.config';

export class SessionRepository implements ISessionRepository {
  private repository: Repository<SessionEntity>;

  constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(SessionEntity);
  }

  async create(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    metadata?: { ipAddress?: string; userAgent?: string; deviceFingerprint?: string }
  ): Promise<void> {
    const session = new SessionEntity();
    session.id = this.generateSessionId();
    session.userId = userId;
    session.token = this.generateAccessToken();
    session.refreshToken = refreshToken;
    session.expiresAt = expiresAt;
    session.isActive = true;
    session.lastActivity = new Date();
    session.ipAddress = metadata?.ipAddress ?? null;
    session.userAgent = metadata?.userAgent ?? null;
    session.deviceFingerprint = metadata?.deviceFingerprint ?? null;

    await this.repository.save(session);
  }

  async findByRefreshToken(
    refreshToken: string
  ): Promise<{ userId: string; expiresAt: Date; deviceFingerprint?: string } | null> {
    const session = await this.repository.findOne({
      where: { refreshToken },
    });

    if (!session) {
      return null;
    }

    return {
      userId: session.userId,
      expiresAt: session.expiresAt,
      ...(session.deviceFingerprint && { deviceFingerprint: session.deviceFingerprint }),
    };
  }

  async deleteByRefreshToken(refreshToken: string): Promise<void> {
    await this.repository.delete({ refreshToken });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }

  async deleteExpired(): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .from(SessionEntity)
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAccessToken(): string {
    // Generate a unique access token placeholder (not JWT)
    return `access_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }
}
