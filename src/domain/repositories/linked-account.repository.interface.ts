import { LinkedAccount } from '@domain/entities';

export interface ILinkedAccountRepository {
  save(linkedAccount: LinkedAccount): Promise<void>;
  findById(id: string): Promise<LinkedAccount | null>;
  findByUserId(userId: string): Promise<LinkedAccount[]>;
  findByProvider(provider: string): Promise<LinkedAccount[]>;
  findByProviderAndProviderId(provider: string, providerId: string): Promise<LinkedAccount | null>;
  findByUserIdAndProvider(userId: string, provider: string): Promise<LinkedAccount | null>;
  delete(id: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteByUserIdAndProvider(userId: string, provider: string): Promise<void>;
}
