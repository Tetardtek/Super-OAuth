import { LinkedAccount, OAuthProvider } from '../entities';
import { LinkedAccountId, UserId } from '../value-objects';

export interface ILinkedAccountRepository {
  findById(id: LinkedAccountId): Promise<LinkedAccount | null>;
  findByUserId(userId: UserId): Promise<LinkedAccount[]>;
  findByProvider(userId: UserId, provider: OAuthProvider): Promise<LinkedAccount | null>;
  findByProviderAccount(provider: OAuthProvider, providerId: string): Promise<LinkedAccount | null>;
  save(linkedAccount: LinkedAccount): Promise<LinkedAccount>;
  delete(id: LinkedAccountId): Promise<void>;
  deleteByUserId(userId: UserId): Promise<void>;
  countByUserId(userId: UserId): Promise<number>;
  existsByProvider(userId: UserId, provider: OAuthProvider): Promise<boolean>;
  existsByProviderAccount(provider: OAuthProvider, providerId: string): Promise<boolean>;
}
