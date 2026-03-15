/**
 * User Service - Application layer user business logic
 * Handles OAuth account management and user operations
 * @version 1.0.0
 */

import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects';
import { userRepository } from '../../infrastructure/services/user.repository';
import { getWebhookService } from '../../infrastructure/services/webhook.service';
import { logger } from '../../shared/utils/logger.util';
import { OAuthUserInfo } from '../../infrastructure/oauth/oauth-config';

export interface LinkedOAuthAccount {
  provider: string;
  providerId: string;
  email?: string | undefined;
  nickname?: string | undefined;
  avatar?: string | undefined;
  linkedAt: Date;
}

export class UserService {
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return await userRepository.findById(id);
  }

  /**
   * Find user by email (scoped by tenant)
   */
  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return await userRepository.findByEmail(email, tenantId);
  }

  /**
   * Find user by OAuth provider (scoped by tenant)
   */
  async findByOAuthProvider(provider: string, providerId: string, tenantId: string): Promise<User | null> {
    return await userRepository.findByOAuthProvider(provider, providerId, tenantId);
  }

  /**
   * Create user from OAuth information
   */
  async createFromOAuth(oauthUserInfo: OAuthUserInfo, tenantId: string): Promise<User> {
    logger.info('👤 Creating new user from OAuth', {
      provider: oauthUserInfo.provider,
      email: oauthUserInfo.email,
      nickname: oauthUserInfo.nickname,
      tenantId,
    });

    const userData = {
      tenantId,
      email: oauthUserInfo.email,
      nickname: oauthUserInfo.nickname,
      avatar: oauthUserInfo.avatar,
      emailVerified: oauthUserInfo.emailVerified,
      authProvider: oauthUserInfo.provider,
      linkedAccounts: [
        {
          provider: oauthUserInfo.provider,
          providerId: oauthUserInfo.id,
          email: oauthUserInfo.email,
          nickname: oauthUserInfo.nickname,
          avatar: oauthUserInfo.avatar,
          linkedAt: new Date(),
          raw: oauthUserInfo.raw,
        },
      ],
    };

    const user = await userRepository.create(userData);

    logger.info('✅ User created successfully from OAuth', {
      userId: user.id,
      provider: oauthUserInfo.provider,
      email: user.email,
    });

    getWebhookService().dispatch(tenantId, 'user.created', {
      userId: user.id,
      provider: oauthUserInfo.provider,
      email: user.email?.toString() ?? null,
    });

    return user;
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(
    userId: string,
    provider: string,
    oauthUserInfo: OAuthUserInfo,
    tenantId: string
  ): Promise<void> {
    logger.info('🔗 Linking OAuth account to user', {
      userId,
      provider,
      providerId: oauthUserInfo.id,
      tenantId,
    });

    const oauthData = {
      tenantId,
      provider,
      providerId: oauthUserInfo.id,
      email: oauthUserInfo.email,
      nickname: oauthUserInfo.nickname,
      avatar: oauthUserInfo.avatar,
      linkedAt: new Date(),
      raw: oauthUserInfo.raw,
    };

    await userRepository.linkOAuthAccount(userId, oauthData);

    logger.info('✅ OAuth account linked successfully', {
      userId,
      provider,
      providerId: oauthUserInfo.id,
    });

    getWebhookService().dispatch(tenantId, 'user.linked', {
      userId,
      provider,
    });
  }

  /**
   * Update OAuth information for existing user
   */
  async updateOAuthInfo(
    userId: string,
    provider: string,
    oauthUserInfo: OAuthUserInfo
  ): Promise<void> {
    logger.info('🔄 Updating OAuth info for user', {
      userId,
      provider,
      providerId: oauthUserInfo.id,
    });

    await userRepository.updateOAuthInfo(userId, provider, oauthUserInfo.id, {
      lastLoginAt: new Date(),
      raw: oauthUserInfo.raw,
    });

    // Staleness gate — ADR-008: only update users.email if provider returns verified email
    // AND emailSource matches this provider (the original source of the email)
    if (oauthUserInfo.emailVerified && oauthUserInfo.email) {
      const user = await userRepository.findById(userId);
      if (user) {
        user.updateEmailFromProvider(Email.create(oauthUserInfo.email), `provider:${provider}`);
        await userRepository.save(user);
      }
    }

    logger.info('✅ OAuth info updated successfully', {
      userId,
      provider,
      providerId: oauthUserInfo.id,
    });
  }

  /**
   * Check if user can unlink OAuth provider
   */
  async canUnlinkOAuthProvider(userId: string, provider: string): Promise<boolean> {
    const user = await userRepository.findById(userId);
    if (!user) return false;

    // User must have either a password or other OAuth providers
    const hasPassword = user.hasPassword;
    const otherProviders = (user.linkedAccounts || []).filter((p) => p.getProvider() !== provider);

    return hasPassword || otherProviders.length > 0;
  }

  /**
   * Unlink OAuth provider from user
   */
  async unlinkOAuthProvider(userId: string, provider: string): Promise<void> {
    logger.info('🔗 Unlinking OAuth provider from user', { userId, provider });

    await userRepository.unlinkOAuthProvider(userId, provider);

    logger.info('✅ OAuth provider unlinked successfully', { userId, provider });
  }

  /**
   * Get user's linked OAuth accounts
   */
  async getLinkedOAuthAccounts(userId: string): Promise<LinkedOAuthAccount[]> {
    const user = await userRepository.findById(userId);
    if (!user || !user.linkedAccounts) return [];

    return (user.linkedAccounts || []).map((account) => ({
      provider: account.getProvider(),
      providerId: account.getProviderId(),
      email: account.getEmail(),
      nickname: account.getDisplayName(),
      avatar: account.getAvatarUrl(),
      linkedAt: account.getCreatedAt(),
    }));
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await userRepository.updateLastLogin(userId);
  }
}

export const userService = new UserService();

// User Service is ready for use
