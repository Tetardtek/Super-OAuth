import { PlatformUser, PlatformRole } from '@domain/entities/platform-user.entity';
import { PlatformUserEntity } from '../../entities/platform-user.entity';

export class PlatformUserMapper {
  static toDomain(entity: PlatformUserEntity): PlatformUser {
    return PlatformUser.reconstruct(
      entity.id,
      entity.email,
      entity.passwordHash ?? null,
      entity.role as PlatformRole,
      entity.emailVerified === 1 || (entity.emailVerified as unknown as boolean) === true,
      entity.lastLoginAt ?? null,
      entity.createdAt,
      entity.updatedAt
    );
  }

  static toEntity(user: PlatformUser): PlatformUserEntity {
    const entity = new PlatformUserEntity();
    entity.id = user.id;
    entity.email = user.email.toString();
    entity.passwordHash = user.getPasswordHash();
    entity.role = user.role;
    entity.emailVerified = user.emailVerified ? 1 : 0;
    entity.lastLoginAt = user.lastLoginAt;
    entity.createdAt = user.createdAt;
    entity.updatedAt = user.updatedAt;
    return entity;
  }
}
