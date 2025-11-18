import { User } from '@domain/entities';
import { UserEntity } from '../../entities/user.entity';
import { LinkedAccountMapper } from './linked-account.mapper';

export class UserMapper {
  static toDomain(entity: UserEntity): User {
    // Map linked accounts
    const linkedAccounts = entity.linkedAccounts
      ? entity.linkedAccounts.map((la) => LinkedAccountMapper.toDomain(la))
      : [];

    // Use the reconstruct factory method to create User from database entity
    const user = User.reconstruct(
      entity.id,
      entity.email ?? null,
      entity.nickname,
      entity.passwordHash ?? null,
      entity.emailVerified,
      entity.isActive,
      entity.createdAt,
      entity.updatedAt,
      entity.lastLogin ?? null,
      entity.loginCount,
      linkedAccounts
    );

    return user;
  }

  static toEntity(user: User): UserEntity {
    const entity = new UserEntity();

    entity.id = user.id;
    entity.email = user.email?.toString() || null;
    entity.nickname = user.nickname.toString();
    entity.passwordHash = user.getPasswordHash();
    entity.emailVerified = user.emailVerified;
    entity.isActive = user.isActive;
    entity.lastLogin = user.lastLogin;
    entity.loginCount = user.loginCount;
    entity.createdAt = user.createdAt;
    entity.updatedAt = user.updatedAt;

    return entity;
  }
}
