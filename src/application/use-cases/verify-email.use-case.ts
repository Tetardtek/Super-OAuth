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
 * Use Case: Verify Email
 *
 * Validates the email verification token, activates the account,
 * and returns auth tokens so the user is logged in immediately.
 */
export class VerifyEmailUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly sessionRepository: ISessionRepository,
    private readonly tenantTokenService: ITenantTokenService,
    private readonly auditLog: IAuditLogService,
    private readonly emailTokenService: EmailTokenService
  ) {}

  async execute(rawToken: string): Promise<AuthResponseDto> {
    // 1. Verify the token
    const tokenEntity = await this.emailTokenService.verifyToken(rawToken, 'verification');
    if (!tokenEntity) {
      throw new Error('INVALID_OR_EXPIRED_TOKEN');
    }

    // 2. Find user
    const user = await this.userRepository.findById(tokenEntity.userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // 3. Activate account
    user.verifyEmail();
    user.recordLogin();
    await this.userRepository.save(user);

    // 4. Generate tokens — user is now logged in
    const accessToken = await this.tenantTokenService.generateAccessToken(user.id, user.tenantId);
    const refreshToken = this.tokenService.generateRefreshToken();

    // 5. Store refresh token
    const tokenExpiration = this.tokenService.getTokenExpiration();
    const expiresAt = new Date(Date.now() + tokenExpiration.refreshToken);
    await this.sessionRepository.create(user.id, refreshToken, expiresAt);

    // 6. Audit
    this.auditLog.log({ tenantId: user.tenantId, userId: user.id, event: 'register' }).catch(() => {});

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
