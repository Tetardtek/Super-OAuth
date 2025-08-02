import { Session } from '../entities';
import { SessionId, UserId } from '../value-objects';

export interface ISessionRepository {
  findById(id: SessionId): Promise<Session | null>;
  findByToken(token: string): Promise<Session | null>;
  findByUserId(userId: UserId): Promise<Session[]>;
  findActiveByUserId(userId: UserId): Promise<Session[]>;
  save(session: Session): Promise<Session>;
  delete(id: SessionId): Promise<void>;
  deleteByUserId(userId: UserId): Promise<void>;
  deleteExpired(): Promise<number>;
  deleteInactive(): Promise<number>;
  countByUserId(userId: UserId): Promise<number>;
  countActiveByUserId(userId: UserId): Promise<number>;
}
