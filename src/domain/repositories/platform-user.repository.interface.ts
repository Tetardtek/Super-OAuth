import { PlatformUser } from '../entities/platform-user.entity';

export interface IPlatformUserRepository {
  save(user: PlatformUser): Promise<void>;
  update(user: PlatformUser): Promise<void>;
  findById(id: string): Promise<PlatformUser | null>;
  findByEmail(email: string): Promise<PlatformUser | null>;
  existsByEmail(email: string): Promise<boolean>;
  delete(id: string): Promise<void>;
}
