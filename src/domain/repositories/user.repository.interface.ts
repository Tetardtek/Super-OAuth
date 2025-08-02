import { User } from '@domain/entities/user.entity';

export interface IUserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByNickname(nickname: string): Promise<User | null>;
  findByEmailOrNickname(emailOrNickname: string): Promise<User | null>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  existsByNickname(nickname: string): Promise<boolean>;
}
