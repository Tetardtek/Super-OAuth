import { IUserRepository } from '../../application/interfaces/repositories.interface';
import { User } from '../../domain/entities';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { DatabaseConnection } from '../database/config/database.config';
import { UserMapper } from '../database/repositories/mappers/user.mapper';

interface CreateUserData {
  email?: string | null | undefined;
  nickname: string;
  avatar?: string | undefined;
  isVerified?: boolean | undefined;
  authProvider?: string | undefined;
  linkedAccounts?: Array<{
    provider: string;
    providerId: string;
    email?: string | undefined;
    nickname?: string | undefined;
    avatar?: string | undefined;
    linkedAt: Date;
    raw?: unknown;
  }> | undefined;
}

interface OAuthAccountData {
  provider: string;
  providerId: string;
  email?: string | undefined;
  nickname?: string | undefined;
  avatar?: string | undefined;
  linkedAt: Date;
  raw?: unknown;
}

interface OAuthUpdateData {
  email?: string | undefined;
  nickname?: string | undefined;
  avatar?: string | undefined;
  lastLoginAt?: Date | undefined;
  raw?: unknown;
}

export class UserRepository implements IUserRepository {
  private repository: Repository<UserEntity>;

  constructor() {
    this.repository = DatabaseConnection.getInstance().getRepository(UserEntity);
  }

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { id },
      relations: ['linkedAccounts'],
    });

    if (!entity) {
      return null;
    }

    return UserMapper.toDomain(entity);
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { email },
      relations: ['linkedAccounts'],
    });

    if (!entity) {
      return null;
    }

    return UserMapper.toDomain(entity);
  }

  async findByProvider(provider: string, providerId: string): Promise<User | null> {
    const entity = await this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.linkedAccounts', 'linkedAccount')
      .where('linkedAccount.provider = :provider', { provider })
      .andWhere('linkedAccount.providerId = :providerId', { providerId })
      .getOne();

    if (!entity) {
      return null;
    }

    return UserMapper.toDomain(entity);
  }

  async save(user: User): Promise<User> {
    const entity = UserMapper.toEntity(user);
    const savedEntity = await this.repository.save(entity);
    return UserMapper.toDomain(savedEntity);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  /**
   * Create a new user
   */
  async create(_userData: CreateUserData): Promise<User> {
    // This would need to be implemented based on your database schema
    // For now, returning a mock user as placeholder
    const mockUser = User.reconstruct(
      'mock-id',
      null,
      'mock-user',
      null,
      false,
      true,
      new Date(),
      new Date(),
      null,
      0,
      []
    );

    return mockUser;
  }

  /**
   * Find user by OAuth provider
   */
  async findByOAuthProvider(_provider: string, _providerId: string): Promise<User | null> {
    // This would need to be implemented based on your database schema
    // For now, returning null as placeholder
    return null;
  }

  /**
   * Link OAuth account to user
   */
  async linkOAuthAccount(_userId: string, _oauthData: OAuthAccountData): Promise<void> {
    // This would need to be implemented based on your database schema
    // For now, empty implementation as placeholder
  }

  /**
   * Update OAuth information
   */
  async updateOAuthInfo(
    _userId: string,
    _provider: string,
    _providerId: string,
    _updateData: OAuthUpdateData
  ): Promise<void> {
    // This would need to be implemented based on your database schema
    // For now, empty implementation as placeholder
  }

  /**
   * Unlink OAuth provider from user
   */
  async unlinkOAuthProvider(_userId: string, _provider: string): Promise<void> {
    // This would need to be implemented based on your database schema
    // For now, empty implementation as placeholder
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.repository.update(userId, {
      lastLogin: new Date(),
    });
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
