import { IUserRepository } from '../../application/interfaces/repositories.interface';
import { User } from '../../domain/entities';
import { LinkedAccount, OAuthProvider } from '../../domain/entities/linked-account';
import { Nickname, UserId, Email } from '../../domain/value-objects';
import { LinkedAccountId } from '../../domain/value-objects/linked-account-id';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { LinkedAccountEntity } from '../database/entities/linked-account.entity';
import { DatabaseConnection } from '../database/config/database.config';
import { UserMapper } from '../database/repositories/mappers/user.mapper';

interface CreateUserData {
  tenantId: string;
  email?: string | null | undefined;
  nickname: string;
  avatar?: string | undefined;
  isVerified?: boolean | undefined;
  emailVerified?: boolean | undefined;
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
  tenantId: string;
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

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { email, tenantId },
      relations: ['linkedAccounts'],
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByProvider(provider: string, providerId: string, tenantId: string): Promise<User | null> {
    const entity = await this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.linkedAccounts', 'linkedAccount')
      .where('user.tenantId = :tenantId', { tenantId })
      .andWhere('linkedAccount.provider = :provider', { provider })
      .andWhere('linkedAccount.providerId = :providerId', { providerId })
      .getOne();

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async save(user: User): Promise<User> {
    const entity = UserMapper.toEntity(user);
    const savedEntity = await this.repository.save(entity);
    return UserMapper.toDomain(savedEntity);
  }

  /**
   * Partial update — no cascade, no linkedAccounts touched.
   * Use this after direct DB inserts on linked_accounts to avoid cascade corruption.
   */
  async updateFields(id: string, fields: Partial<{ emailVerified: boolean; lastLogin: Date; nickname: string }>): Promise<void> {
    const update: Record<string, unknown> = {};
    if (fields.emailVerified !== undefined) update.emailVerified = fields.emailVerified;
    if (fields.lastLogin !== undefined) update.lastLogin = fields.lastLogin;
    if (fields.nickname !== undefined) update.nickname = fields.nickname;
    await this.repository.update(id, update);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }

  /**
   * Create a new user from OAuth data
   */
  async create(userData: CreateUserData): Promise<User> {
    const userId = UserId.generate();
    const nickname = Nickname.create(userData.nickname);
    const email = userData.email ? Email.create(userData.email) : undefined;
    const emailVerified = userData.emailVerified ?? userData.isVerified ?? !!userData.email;

    let linkedAccount: LinkedAccount | undefined;
    if (userData.linkedAccounts && userData.linkedAccounts.length > 0) {
      const la = userData.linkedAccounts[0];
      linkedAccount = LinkedAccount.create({
        userId,
        tenantId: userData.tenantId,
        provider: la.provider as OAuthProvider,
        providerId: la.providerId,
        displayName: la.nickname || userData.nickname,
        email: la.email || userData.email || '',
        avatarUrl: la.avatar,
        metadata: la.raw ? { raw: la.raw } : undefined,
      });
    }

    const user = linkedAccount
      ? User.createWithProvider(userId.toString(), nickname, linkedAccount, userData.tenantId, email, emailVerified)
      : User.createWithEmail(userId.toString(), email!, nickname, { hash: () => '' } as never, userData.tenantId);

    try {
      return await this.save(user);
    } catch (err: unknown) {
      // Duplicate nickname — append random suffix and retry once
      const isDuplicate = err instanceof Error && 'code' in err && (err as { code: string }).code === 'ER_DUP_ENTRY'
        && err.message.includes('nickname');
      if (!isDuplicate) throw err;

      const suffix = Math.floor(Math.random() * 9000 + 1000).toString();
      const fallbackNickname = Nickname.create(`${userData.nickname}_${suffix}`);
      const retryUser = linkedAccount
        ? User.createWithProvider(userId.toString(), fallbackNickname, linkedAccount, userData.tenantId, email, emailVerified)
        : User.createWithEmail(userId.toString(), email!, fallbackNickname, { hash: () => '' } as never, userData.tenantId);

      return await this.save(retryUser);
    }
  }

  /**
   * Find user by OAuth provider (scoped by tenant)
   */
  async findByOAuthProvider(provider: string, providerId: string, tenantId: string): Promise<User | null> {
    return this.findByProvider(provider, providerId, tenantId);
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(userId: string, oauthData: OAuthAccountData): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const userIdVO = new UserId(userId);
    const linkedAccountId = LinkedAccountId.generate();

    const linkedAccount = new LinkedAccount({
      id: linkedAccountId,
      userId: userIdVO,
      tenantId: oauthData.tenantId,
      provider: oauthData.provider as OAuthProvider,
      providerId: oauthData.providerId,
      displayName: oauthData.nickname || oauthData.email || oauthData.provider,
      email: oauthData.email || '',
      linkedAt: oauthData.linkedAt,
    } as never);

    user.linkAccount(linkedAccount);
    await this.save(user);
  }

  /**
   * Update OAuth information for existing user
   */
  async updateOAuthInfo(
    userId: string,
    _provider: string,
    _providerId: string,
    updateData: OAuthUpdateData
  ): Promise<void> {
    if (updateData.lastLoginAt) {
      await this.repository.update(userId, { lastLogin: updateData.lastLoginAt });
    }
  }

  /**
   * Unlink OAuth provider from user — direct DELETE (cascade via save() unreliable)
   */
  async unlinkOAuthProvider(userId: string, provider: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Business rule check via domain entity
    user.unlinkAccount(provider);

    // Direct DELETE — same pattern as confirm-merge (ac7eb17)
    const laRepo = DatabaseConnection.getInstance().getRepository(LinkedAccountEntity);
    await laRepo.delete({ userId, provider });
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
