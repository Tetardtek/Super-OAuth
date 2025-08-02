import { Session } from '@domain/entities';

export interface ISessionRepository {
  save(session: Session): Promise<void>;
  findById(id: string): Promise<Session | null>;
  findByUserId(userId: string): Promise<Session[]>;
  findByAccessToken(accessToken: string): Promise<Session | null>;
  findByRefreshToken(refreshToken: string): Promise<Session | null>;
  findActiveByUserId(userId: string): Promise<Session[]>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteExpired(): Promise<void>;
  invalidateByUserId(userId: string): Promise<void>;
}
