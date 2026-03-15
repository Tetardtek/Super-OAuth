import { User } from '@domain/entities/user.entity';

export interface IUserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string, tenantId: string): Promise<User | null>;
  findByNickname(nickname: string, tenantId: string): Promise<User | null>;
  findByEmailOrNickname(emailOrNickname: string, tenantId: string): Promise<User | null>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  existsByEmail(email: string, tenantId: string): Promise<boolean>;
  existsByNickname(nickname: string, tenantId: string): Promise<boolean>;
}
