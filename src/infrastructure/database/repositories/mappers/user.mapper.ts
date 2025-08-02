import { User } from '@domain/entities';
import { Email, Nickname, Password } from '@domain/value-objects';
import { UserEntity } from '../../entities/user.entity';
import { LinkedAccountMapper } from './linked-account.mapper';

export class UserMapper {
  static toDomain(entity: UserEntity): User {
    // Create user using factory method based on whether it has email or is provider-only
    let user: User;
    
    if (entity.email && entity.passwordHash) {
      // Classic user with email and password
      // Use createForExistingUser to bypass validation for stored passwords
      const tempPassword = Password.createForExistingUser();
      user = User.createWithEmail(
        entity.id,
        Email.create(entity.email),
        Nickname.create(entity.nickname),
        tempPassword
      );
      // Override the password hash
      (user as any)._passwordHash = entity.passwordHash;
    } else if (entity.linkedAccounts && entity.linkedAccounts.length > 0) {
      // Provider user - we need at least one linked account
      const firstLinkedAccount = LinkedAccountMapper.toDomain(entity.linkedAccounts[0]);
      user = User.createWithProvider(
        entity.id,
        Nickname.create(entity.nickname),
        firstLinkedAccount,
        entity.email ? Email.create(entity.email) : undefined
      );
      
      // Add remaining linked accounts
      for (let i = 1; i < entity.linkedAccounts.length; i++) {
        const linkedAccount = LinkedAccountMapper.toDomain(entity.linkedAccounts[i]);
        user.linkAccount(linkedAccount);
      }
    } else {
      // Fallback: create with email if available, otherwise throw error
      if (entity.email) {
        const tempPassword = Password.createForExistingUser();
        user = User.createWithEmail(
          entity.id,
          Email.create(entity.email),
          Nickname.create(entity.nickname),
          tempPassword
        );
        // Clear password hash since this user doesn't have one
        (user as any)._passwordHash = null;
      } else {
        throw new Error('Cannot create user without email or linked accounts');
      }
    }

    // Set additional properties by accessing private fields
    (user as any)._emailVerified = entity.emailVerified;
    (user as any)._isActive = entity.isActive;
    (user as any)._createdAt = entity.createdAt;
    (user as any)._updatedAt = entity.updatedAt;
    (user as any)._lastLogin = entity.lastLogin;
    (user as any)._loginCount = entity.loginCount;
    
    return user;
  }

  static toEntity(user: User): UserEntity {
    const entity = new UserEntity();
    
    entity.id = user.id;
    entity.email = user.email?.toString() || null;
    entity.nickname = user.nickname.toString();
    entity.passwordHash = (user as any)._passwordHash || null;
    entity.emailVerified = user.emailVerified;
    entity.isActive = user.isActive;
    entity.lastLogin = user.lastLogin;
    entity.loginCount = user.loginCount;
    entity.createdAt = user.createdAt;
    entity.updatedAt = user.updatedAt;
    
    return entity;
  }
}
