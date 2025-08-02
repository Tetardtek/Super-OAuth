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
      relations: ['linkedAccounts', 'sessions']
    });
    
    return userEntity ? UserMapper.toDomain(userEntity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userEntity = await this.repository.findOne({
      where: { email },
      relations: ['linkedAccounts', 'sessions']
    });
    
    return userEntity ? UserMapper.toDomain(userEntity) : null;
  }

  async findByNickname(nickname: string): Promise<User | null> {
    const userEntity = await this.repository.findOne({
      where: { nickname },
      relations: ['linkedAccounts', 'sessions']
    });
    
    return userEntity ? UserMapper.toDomain(userEntity) : null;
  }

  async findByEmailOrNickname(emailOrNickname: string): Promise<User | null> {
    // Try to determine if it's an email or nickname
    const isEmail = emailOrNickname.includes('@');
    
    if (isEmail) {
      return this.findByEmail(emailOrNickname);
    } else {
      return this.findByNickname(emailOrNickname);
    }
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.repository.count({ where: { email } });
    return count > 0;
  }

  async existsByNickname(nickname: string): Promise<boolean> {
    const count = await this.repository.count({ where: { nickname } });
    return count > 0;
  }
}
