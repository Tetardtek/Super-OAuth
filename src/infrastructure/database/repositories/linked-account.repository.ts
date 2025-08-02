import { Repository } from 'typeorm';
import { LinkedAccount, OAuthProvider } from '@domain/entities';
import { LinkedAccountId, UserId } from '@domain/value-objects';
import { ILinkedAccountRepository } from '@domain/repositories';
import { LinkedAccountEntity } from '../entities/linked-account.entity';
import { LinkedAccountMapper } from './mappers/linked-account.mapper';
import { DatabaseConnection } from '../config/database.config';

export class LinkedAccountRepository implements ILinkedAccountRepository {
  private readonly repository: Repository<LinkedAccountEntity>;

  constructor() {
    this.repository = DatabaseConnection.getDataSource().getRepository(LinkedAccountEntity);
  }

  async findById(id: LinkedAccountId): Promise<LinkedAccount | null> {
    const entity = await this.repository.findOne({
      where: { id: id.getValue() }
    });

    return entity ? LinkedAccountMapper.toDomain(entity) : null;
  }

  async findByUserId(userId: UserId): Promise<LinkedAccount[]> {
    const entities = await this.repository.find({
      where: { userId: userId.getValue() },
      order: { createdAt: 'DESC' }
    });

    return entities.map(entity => LinkedAccountMapper.toDomain(entity));
  }

  async findByProvider(userId: UserId, provider: OAuthProvider): Promise<LinkedAccount | null> {
    const entity = await this.repository.findOne({
      where: { 
        userId: userId.getValue(),
        provider
      }
    });

    return entity ? LinkedAccountMapper.toDomain(entity) : null;
  }

  async findByProviderAccount(provider: OAuthProvider, providerId: string): Promise<LinkedAccount | null> {
    const entity = await this.repository.findOne({
      where: { 
        provider,
        providerId
      }
    });

    return entity ? LinkedAccountMapper.toDomain(entity) : null;
  }

  async save(linkedAccount: LinkedAccount): Promise<LinkedAccount> {
    const entity = LinkedAccountMapper.toEntity(linkedAccount);
    const savedEntity = await this.repository.save(entity);
    return LinkedAccountMapper.toDomain(savedEntity);
  }

  async delete(id: LinkedAccountId): Promise<void> {
    await this.repository.delete({ id: id.getValue() });
  }

  async deleteByUserId(userId: UserId): Promise<void> {
    await this.repository.delete({ userId: userId.getValue() });
  }

  async countByUserId(userId: UserId): Promise<number> {
    return await this.repository.count({
      where: { userId: userId.getValue() }
    });
  }

  async existsByProvider(userId: UserId, provider: OAuthProvider): Promise<boolean> {
    const count = await this.repository.count({
      where: { 
        userId: userId.getValue(),
        provider
      }
    });

    return count > 0;
  }

  async existsByProviderAccount(provider: OAuthProvider, providerId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { 
        provider,
        providerId
      }
    });

    return count > 0;
  }
}
