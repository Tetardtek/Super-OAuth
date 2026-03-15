import { Repository } from 'typeorm';
import { IUserRepository } from '@domain/repositories/user.repository.interface';
import { User } from '@domain/entities/user.entity';
import { UserEntity } from '../entities/user.entity';
import { DatabaseConnection } from '../config/database.config';
import { UserMapper } from './mappers/user.mapper';

export class UserRepository implements IUserRepository {
  private readonly repository: Repository<UserEntity>;

  constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(UserEntity);
  }

  async save(user: User): Promise<void> {
    const userEntity = UserMapper.toEntity(user);
    await this.repository.save(userEntity);
  }

  async findById(id: string): Promise<User | null> {
    const userEntity = await this.repository.findOne({
      where: { id },
      relations: ['linkedAccounts', 'sessions'],
    });

    return userEntity ? UserMapper.toDomain(userEntity) : null;
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    const userEntity = await this.repository.findOne({
      where: { email, tenantId },
      relations: ['linkedAccounts', 'sessions'],
    });

    return userEntity ? UserMapper.toDomain(userEntity) : null;
  }

  async findByNickname(nickname: string, tenantId: string): Promise<User | null> {
    const userEntity = await this.repository.findOne({
      where: { nickname, tenantId },
      relations: ['linkedAccounts', 'sessions'],
    });

    return userEntity ? UserMapper.toDomain(userEntity) : null;
  }

  async findByEmailOrNickname(emailOrNickname: string, tenantId: string): Promise<User | null> {
    const isEmail = emailOrNickname.includes('@');

    if (isEmail) {
      return this.findByEmail(emailOrNickname, tenantId);
    } else {
      return this.findByNickname(emailOrNickname, tenantId);
    }
  }

  async findByProvider(provider: string, providerId: string, tenantId: string): Promise<User | null> {
    const userEntity = await this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.linkedAccounts', 'linkedAccount')
      .where('user.tenantId = :tenantId', { tenantId })
      .andWhere('linkedAccount.tenantId = :tenantId', { tenantId })
      .andWhere('linkedAccount.provider = :provider', { provider })
      .andWhere('linkedAccount.providerId = :providerId', { providerId })
      .getOne();

    return userEntity ? UserMapper.toDomain(userEntity) : null;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  async existsByEmail(email: string, tenantId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { email, tenantId } });
    return count > 0;
  }

  async existsByNickname(nickname: string, tenantId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { nickname, tenantId } });
    return count > 0;
  }
}
