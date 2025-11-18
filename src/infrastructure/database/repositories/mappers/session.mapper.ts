import { Session } from '@domain/entities';
import { SessionId, UserId } from '@domain/value-objects';
import { SessionEntity } from '../../entities/session.entity';

export class SessionMapper {
  static toDomain(entity: SessionEntity): Session {
    return Session.createFromData({
      id: new SessionId(entity.id),
      userId: new UserId(entity.userId),
      token: entity.token,
      refreshToken: entity.refreshToken || undefined,
      expiresAt: entity.expiresAt,
      ipAddress: entity.ipAddress || undefined,
      userAgent: entity.userAgent || undefined,
      isActive: entity.isActive,
      lastActivity: entity.lastActivity,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(session: Session): SessionEntity {
    const entity = new SessionEntity();

    // Set primary key if exists
    const id = session.getId();
    if (id) {
      entity.id = id.getValue();
    }

    entity.userId = session.getUserId().getValue();
    entity.token = session.getToken();
    entity.refreshToken = session.getRefreshToken() || null;
    entity.expiresAt = session.getExpiresAt();
    entity.ipAddress = session.getIpAddress() || null;
    entity.userAgent = session.getUserAgent() || null;
    entity.isActive = session.getIsActive();
    entity.lastActivity = session.getLastActivity();
    entity.createdAt = session.getCreatedAt();
    entity.updatedAt = session.getUpdatedAt();

    return entity;
  }
}
