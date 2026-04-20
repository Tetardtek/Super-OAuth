import { Repository } from 'typeorm';
import { IPlatformUserRepository } from '@domain/repositories/platform-user.repository.interface';
import { PlatformUser } from '@domain/entities/platform-user.entity';
import { PlatformUserEntity } from '../entities/platform-user.entity';
import { DatabaseConnection } from '../config/database.config';
import { PlatformUserMapper } from './mappers/platform-user.mapper';

export class PlatformUserRepository implements IPlatformUserRepository {
  private readonly repository: Repository<PlatformUserEntity>;

  constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(PlatformUserEntity);
  }

  async save(user: PlatformUser): Promise<void> {
    const entity = PlatformUserMapper.toEntity(user);
    await this.repository.save(entity);
  }

  async update(user: PlatformUser): Promise<void> {
    const entity = PlatformUserMapper.toEntity(user);
    await this.repository.save(entity);
  }

  async findById(id: string): Promise<PlatformUser | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? PlatformUserMapper.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<PlatformUser | null> {
    const entity = await this.repository.findOne({ where: { email: email.toLowerCase() } });
    return entity ? PlatformUserMapper.toDomain(entity) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repository.count({ where: { email: email.toLowerCase() } });
    return count > 0;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
