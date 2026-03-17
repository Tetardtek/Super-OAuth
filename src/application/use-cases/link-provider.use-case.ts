/**
 * LinkProviderUseCase — link an OAuth provider to an existing authenticated user
 *
 * Security gates applied:
 *   [SG5] linkingUserId is read from Redis state — never from the callback request
 *   [SG10] PROVIDER_CONFLICT does not reveal existence of another account
 */

import { OAuthUserInfo } from '../../infrastructure/oauth/oauth-config';
import { IUserRepository, IAuditLogService } from '../interfaces/repositories.interface';
import { logger } from '../../shared/utils/logger.util';

export interface LinkProviderInput {
  /** userId of the authenticated user who initiated the link flow [SG5] */
  linkingUserId: string;
  tenantId: string;
  provider: string;
  oauthUserInfo: OAuthUserInfo;
}

export interface LinkProviderOutput {
  success: true;
  provider: string;
}

export class LinkProviderUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly auditLog: IAuditLogService
  ) {}

  async execute(input: LinkProviderInput): Promise<LinkProviderOutput> {
    const { linkingUserId, tenantId, provider, oauthUserInfo } = input;

    logger.info('🔗 LinkProviderUseCase: linking provider to user', {
      userId: linkingUserId,
      provider,
      tenantId,
    });

    // 1. Retrieve the user who initiated the link
    const currentUser = await this.userRepository.findById(linkingUserId);
    if (!currentUser || !currentUser.isActive) {
      throw new Error('LINK_USER_NOT_FOUND');
    }

    // 2. Check whether this provider+providerId is already linked to ANOTHER user [SG10]
    //    Do NOT reveal which user owns it — generic error only
    const ownerOfProvider = await this.userRepository.findByProvider(provider, oauthUserInfo.id, tenantId);
    if (ownerOfProvider && ownerOfProvider.id !== linkingUserId) {
      // [SG10] No info leak — do not disclose that another account holds this provider
      logger.warn('LinkProviderUseCase: provider already linked to another user (PROVIDER_CONFLICT)', {
        provider,
        tenantId,
      });
      throw new Error('PROVIDER_CONFLICT');
    }

    // 3. Check whether this provider is already linked to the same user (ALREADY_LINKED)
    if (currentUser.isProviderLinked(provider)) {
      throw new Error('ALREADY_LINKED');
    }

    // 4. Perform the link via the repository
    await (this.userRepository as UserRepositoryWithLink).linkOAuthAccount(linkingUserId, {
      tenantId,
      provider,
      providerId: oauthUserInfo.id,
      ...(oauthUserInfo.email !== undefined && { email: oauthUserInfo.email }),
      ...(oauthUserInfo.nickname !== undefined && { nickname: oauthUserInfo.nickname }),
      ...(oauthUserInfo.avatar !== undefined && { avatar: oauthUserInfo.avatar }),
      linkedAt: new Date(),
      ...(oauthUserInfo.raw !== undefined && { raw: oauthUserInfo.raw as unknown }),
    });

    logger.info('✅ LinkProviderUseCase: provider linked successfully', {
      userId: linkingUserId,
      provider,
    });

    // Audit log — fire-and-forget
    this.auditLog.log({ tenantId, userId: linkingUserId, event: 'link', metadata: { provider } }).catch(() => {});

    return { success: true, provider };
  }
}

/**
 * Extended interface — userRepository exposes linkOAuthAccount in the concrete implementation.
 * Declared here to keep the use-case free of infrastructure imports.
 */
interface UserRepositoryWithLink extends IUserRepository {
  linkOAuthAccount(
    userId: string,
    data: {
      tenantId: string;
      provider: string;
      providerId: string;
      email?: string;
      nickname?: string;
      avatar?: string;
      linkedAt: Date;
      raw?: unknown;
    }
  ): Promise<void>;
}
