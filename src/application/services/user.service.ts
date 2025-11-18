/**
 * User Service - Application layer user business logic
 * Handles OAuth account management and user operations
 * @version 1.0.0
 */

import { User } from '../../domain/entities/user.entity';
import { userRepository } from '../../infrastructure/services/user.repository';
import { logger } from '../../shared/utils/logger.util';
import { OAuthUserInfo } from '../../infrastructure/oauth/oauth-config';

export interface LinkedOAuthAccount {
  provider: string;
  providerId: string;
  email?: string;
  nickname?: string;
  avatar?: string;
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
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await userRepository.findByEmail(email);
  }

  /**
   * Find user by OAuth provider
   */
  async findByOAuthProvider(provider: string, providerId: string): Promise<User | null> {
    return await userRepository.findByOAuthProvider(provider, providerId);
  }

  /**
   * Create user from OAuth information
   */
  async createFromOAuth(oauthUserInfo: OAuthUserInfo): Promise<User> {
    logger.info('👤 Creating new user from OAuth', {
      provider: oauthUserInfo.provider,
      email: oauthUserInfo.email,
      nickname: oauthUserInfo.nickname,
    });

    const userData = {
      email: oauthUserInfo.email,
      nickname: oauthUserInfo.nickname,
      avatar: oauthUserInfo.avatar,
      isVerified: !!oauthUserInfo.email, // Email verified by OAuth provider
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

    return user;
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(
    userId: string,
    provider: string,
    oauthUserInfo: OAuthUserInfo
  ): Promise<void> {
    logger.info('🔗 Linking OAuth account to user', {
      userId,
      provider,
      providerId: oauthUserInfo.id,
    });

    const oauthData = {
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

    const updateData = {
      email: oauthUserInfo.email,
      nickname: oauthUserInfo.nickname,
      avatar: oauthUserInfo.avatar,
      lastLoginAt: new Date(),
      raw: oauthUserInfo.raw,
    };

    await userRepository.updateOAuthInfo(userId, provider, oauthUserInfo.id, updateData);

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
