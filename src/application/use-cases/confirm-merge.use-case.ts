import type { OAuthProvider } from '../../domain/entities';
import {
  IUserRepository,
  ITokenService,
  ISessionRepository,
  ITenantTokenService,
  IAuditLogService,
} from '../interfaces/repositories.interface';
import { EmailTokenService } from '../../infrastructure/services/email-token.service';
import { AuthResponseDto, UserDto } from '../dto/auth.dto';
import { User } from '../../domain/entities';

/**
 * Use Case: Confirm Merge
 *
 * Called when user clicks the merge link in their email.
 * Links the pending provider to the existing account and logs them in.
 */
export class ConfirmMergeUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly sessionRepository: ISessionRepository,
    private readonly tenantTokenService: ITenantTokenService,
    private readonly auditLog: IAuditLogService,
    private readonly emailTokenService: EmailTokenService
  ) {}

  async execute(rawToken: string): Promise<AuthResponseDto> {
    // 1. Verify the merge token
    const tokenEntity = await this.emailTokenService.verifyToken(rawToken, 'merge');
    if (!tokenEntity) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN');
    }

    if (!tokenEntity.provider || !tokenEntity.providerId) {
      throw new Error('INVALID_MERGE_TOKEN');
    }

    // 2. Find the target user
    const user = await this.userRepository.findById(tokenEntity.userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // 3. Parse provider metadata
    const metadata = tokenEntity.providerMetadata
      ? JSON.parse(tokenEntity.providerMetadata)
      : {};

    // 4. Link the provider — direct DB insert (cascade via save doesn't work)
    const { LinkedAccountEntity } = await import('../../infrastructure/database/entities/linked-account.entity');
    const { DatabaseConnection } = await import('../../infrastructure/database/config/database.config');
    const { v4: uuidv4 } = await import('uuid');

    const laRepo = DatabaseConnection.getDataSource().getRepository(LinkedAccountEntity);
    const laEntity = laRepo.create({
      id: uuidv4(),
      userId: user.id,
      tenantId: tokenEntity.tenantId,
      provider: tokenEntity.provider,
      providerId: tokenEntity.providerId,
      displayName: tokenEntity.providerDisplayName || '',
      email: tokenEntity.providerEmail || '',
      metadata,
    });
    await laRepo.save(laEntity);

    // Also verify email if not already (merge = proof of email ownership)
    if (!user.emailVerified) {
      user.verifyEmail();
    }

    user.recordLogin();
    await this.userRepository.save(user);

    // 5. Audit
    this.auditLog
      .log({
        tenantId: user.tenantId,
        userId: user.id,
        event: 'merge',
        metadata: { provider: tokenEntity.provider },
      })
      .catch(() => {});

    // 6. Issue tokens — user is logged in
    const accessToken = await this.tenantTokenService.generateAccessToken(user.id, user.tenantId);
    const refreshToken = this.tokenService.generateRefreshToken();

    const tokenExpiration = this.tokenService.getTokenExpiration();
    const expiresAt = new Date(Date.now() + tokenExpiration.refreshToken);
    await this.sessionRepository.create(user.id, refreshToken, expiresAt);

    return {
      accessToken,
      refreshToken,
      user: this.mapUserToDto(user),
    };
  }

  private mapUserToDto(user: User): UserDto {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email?.toString() || null,
      nickname: user.nickname.toString(),
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      linkedProviders: user.linkedProviders,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount,
    };
  }
}
