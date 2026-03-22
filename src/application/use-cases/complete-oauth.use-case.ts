import { User, LinkedAccount, OAuthProvider } from '../../domain/entities';
import { Nickname, UserId, Email } from '../../domain/value-objects';
import {
  IUserRepository,
  ITokenService,
  ISessionRepository,
  IOAuthService,
  ITenantTokenService,
  IAuditLogService,
  IEmailService,
  IEmailTokenService,
} from '../interfaces/repositories.interface';
import { AuthResponseDto, MergePendingResponseDto, UserDto } from '../dto/auth.dto';

export interface CompleteOAuthDto {
  provider: string;
  code: string;
  state: string;
}

export type CompleteOAuthResult =
  | { type: 'authenticated'; data: AuthResponseDto }
  | { type: 'merge_pending'; data: MergePendingResponseDto }
  | { type: 'verification_pending'; data: { message: string; email: string; tenantId: string } };

export class CompleteOAuthUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly sessionRepository: ISessionRepository,
    private readonly oauthService: IOAuthService,
    private readonly tenantTokenService: ITenantTokenService,
    private readonly auditLog: IAuditLogService,
    private readonly emailService: IEmailService,
    private readonly emailTokenService: IEmailTokenService
  ) {}

  async execute(dto: CompleteOAuthDto): Promise<CompleteOAuthResult> {
    // 1. Exchange code — tenantId recovered from Redis state
    const oauthResult = await this.oauthService.exchangeCodeForTokens(
      dto.provider,
      dto.code,
      dto.state
    );

    const { tenantId, userInfo } = oauthResult;
    const providerSource = `provider:${dto.provider}`;

    // 2. Check if user already exists with this provider (scoped by tenant)
    let user = await this.userRepository.findByProvider(dto.provider, userInfo.id, tenantId);

    if (user) {
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Staleness update — ADR-008 decision 3
      if (userInfo.emailVerified && userInfo.email) {
        user.updateEmailFromProvider(Email.create(userInfo.email), providerSource);
      }

      user.recordLogin();
      await this.userRepository.save(user);

      return { type: 'authenticated', data: await this.issueTokens(user) };
    }

    // 3. Check if a verified account exists with the same email
    if (userInfo.email) {
      const existingEmailUser = await this.userRepository.findByEmail(userInfo.email, tenantId);

      if (existingEmailUser) {
        // Account exists — send merge token instead of auto-linking
        const { rawToken } = await this.emailTokenService.createMergeToken({
          userId: existingEmailUser.id,
          tenantId,
          provider: dto.provider,
          providerId: userInfo.id,
          providerDisplayName: userInfo.nickname,
          providerEmail: userInfo.email,
          providerMetadata: {
            accessToken: oauthResult.accessToken,
            refreshToken: oauthResult.refreshToken,
          },
        });

        await this.emailService.sendMergeEmail(
          userInfo.email,
          rawToken,
          dto.provider,
          tenantId
        );

        return {
          type: 'merge_pending',
          data: {
            message: 'MERGE_EMAIL_SENT',
            email: userInfo.email,
            provider: dto.provider,
            tenantId,
          },
        };
      }
    }

    // 4. No existing account — create new user with provider
    const userId = UserId.generate();
    const nickname = Nickname.create(userInfo.nickname);
    const email = userInfo.email ? Email.create(userInfo.email) : undefined;

    const linkedAccount = LinkedAccount.create({
      userId,
      tenantId,
      provider: dto.provider as OAuthProvider,
      providerId: userInfo.id,
      displayName: userInfo.nickname,
      email: userInfo.email || '',
      avatarUrl: undefined,
      metadata: {
        accessToken: oauthResult.accessToken,
        refreshToken: oauthResult.refreshToken,
      },
    });

    // emailVerified = false — SuperOAuth verifies, not the provider
    user = User.createWithProvider(
      userId.toString(),
      nickname,
      linkedAccount,
      tenantId,
      email,
      false // Never trust provider emailVerified
    );

    user.recordLogin();
    await this.userRepository.save(user);

    // 5. Send verification email if we have an email
    if (userInfo.email) {
      const { rawToken } = await this.emailTokenService.createVerificationToken({
        userId: user.id,
        tenantId,
      });
      await this.emailService.sendVerificationEmail(userInfo.email, rawToken, tenantId);

      return {
        type: 'verification_pending',
        data: {
          message: 'VERIFICATION_EMAIL_SENT',
          email: userInfo.email,
          tenantId,
        },
      };
    }

    // No email from provider — account created but unverified
    return { type: 'authenticated', data: await this.issueTokens(user) };
  }

  private async issueTokens(user: User): Promise<AuthResponseDto> {
    const accessToken = await this.tenantTokenService.generateAccessToken(user.id, user.tenantId);
    const refreshToken = this.tokenService.generateRefreshToken();

    const tokenExpiration = this.tokenService.getTokenExpiration();
    const expiresAt = new Date(Date.now() + tokenExpiration.refreshToken);
    await this.sessionRepository.create(user.id, refreshToken, expiresAt);

    this.auditLog.log({ tenantId: user.tenantId, userId: user.id, event: 'login' }).catch(() => {});

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
