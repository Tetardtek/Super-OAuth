import { LinkedAccount, OAuthProvider } from '@domain/entities';
import { UserId, LinkedAccountId } from '@domain/value-objects';
import { LinkedAccountEntity } from '../../entities/linked-account.entity';

export class LinkedAccountMapper {
  static toDomain(entity: LinkedAccountEntity): LinkedAccount {
    return LinkedAccount.createFromData({
      id: new LinkedAccountId(entity.id),
      userId: new UserId(entity.userId),
      provider: entity.provider as OAuthProvider,
      providerId: entity.providerId,
      displayName: entity.displayName,
      email: entity.email,
      avatarUrl: entity.avatarUrl || undefined,
      metadata: entity.metadata || undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(linkedAccount: LinkedAccount): LinkedAccountEntity {
    const entity = new LinkedAccountEntity();
    
    // Set primary key if exists
    const id = linkedAccount.getId();
    if (id) {
      entity.id = id.getValue();
    }
    
    entity.userId = linkedAccount.getUserId().getValue();
    entity.provider = linkedAccount.getProvider();
    entity.providerId = linkedAccount.getProviderId();
    entity.displayName = linkedAccount.getDisplayName();
    entity.email = linkedAccount.getEmail();
    entity.avatarUrl = linkedAccount.getAvatarUrl() || null;
    entity.metadata = linkedAccount.getMetadata() || null;
    entity.createdAt = linkedAccount.getCreatedAt();
    entity.updatedAt = linkedAccount.getUpdatedAt();
    
    return entity;
  }
}
