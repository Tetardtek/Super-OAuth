import { Repository, LessThan } from 'typeorm';
import { Session } from '@domain/entities';
import { SessionId, UserId } from '@domain/value-objects';
import { ISessionRepository } from '@domain/repositories';
import { SessionEntity } from '../entities/session.entity';
import { SessionMapper } from './mappers/session.mapper';
import { DatabaseConnection } from '../config/database.config';

export class SessionRepository implements ISessionRepository {
  private readonly repository: Repository<SessionEntity>;

  constructor() {
    this.repository = DatabaseConnection.getDataSource().getRepository(SessionEntity);
  }

  async findById(id: SessionId): Promise<Session | null> {
    const entity = await this.repository.findOne({
      where: { id: id.getValue() }
    });

    return entity ? SessionMapper.toDomain(entity) : null;
  }

  async findByToken(token: string): Promise<Session | null> {
    const entity = await this.repository.findOne({
      where: { token }
    });

    return entity ? SessionMapper.toDomain(entity) : null;
  }

  async findByUserId(userId: UserId): Promise<Session[]> {
    const entities = await this.repository.find({
      where: { userId: userId.getValue() },
      order: { createdAt: 'DESC' }
    });

    return entities.map(entity => SessionMapper.toDomain(entity));
  }

  async findActiveByUserId(userId: UserId): Promise<Session[]> {
    const entities = await this.repository.find({
      where: { 
        userId: userId.getValue(),
        isActive: true
      },
      order: { lastActivity: 'DESC' }
    });

    // Filter out expired sessions in domain logic
    return entities
      .map(entity => SessionMapper.toDomain(entity))
      .filter(session => !session.isExpired());
  }

  async save(session: Session): Promise<Session> {
    const entity = SessionMapper.toEntity(session);
    const savedEntity = await this.repository.save(entity);
    return SessionMapper.toDomain(savedEntity);
  }

  async delete(id: SessionId): Promise<void> {
    await this.repository.delete({ id: id.getValue() });
  }

  async deleteByUserId(userId: UserId): Promise<void> {
    await this.repository.delete({ userId: userId.getValue() });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date())
    });

    return result.affected || 0;
  }

  async deleteInactive(): Promise<number> {
    const result = await this.repository.delete({
      isActive: false
    });

    return result.affected || 0;
  }

  async countByUserId(userId: UserId): Promise<number> {
    return await this.repository.count({
      where: { userId: userId.getValue() }
    });
  }

  async countActiveByUserId(userId: UserId): Promise<number> {
    const entities = await this.repository.find({
      where: { 
        userId: userId.getValue(),
        isActive: true
      }
    });

    // Count non-expired sessions
    return entities
      .map(entity => SessionMapper.toDomain(entity))
      .filter(session => !session.isExpired())
      .length;
  }
}
