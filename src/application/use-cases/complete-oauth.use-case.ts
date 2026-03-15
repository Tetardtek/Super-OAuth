import { User, LinkedAccount, OAuthProvider } from '../../domain/entities';
import { Nickname, UserId, Email } from '../../domain/value-objects';
import {
  IUserRepository,
  ITokenService,
  ISessionRepository,
  IOAuthService,
} from '../interfaces/repositories.interface';
import { AuthResponseDto, UserDto } from '../dto/auth.dto';

export interface CompleteOAuthDto {
  provider: string;
  code: string;
  state: string;
}

export class CompleteOAuthUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly sessionRepository: ISessionRepository,
    private readonly oauthService: IOAuthService
  ) {}

  async execute(dto: CompleteOAuthDto): Promise<AuthResponseDto> {
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
    } else {
      // Check if user exists with same email — only auto-link if email is verified
      if (userInfo.email && userInfo.emailVerified) {
        const existingEmailUser = await this.userRepository.findByEmail(userInfo.email, tenantId);

        if (existingEmailUser) {
          const linkedAccount = LinkedAccount.create({
            userId: new UserId(existingEmailUser.id),
            tenantId,
            provider: dto.provider as OAuthProvider,
            providerId: userInfo.id,
            displayName: userInfo.nickname,
            email: userInfo.email,
            avatarUrl: undefined,
            metadata: {
              accessToken: oauthResult.accessToken,
              refreshToken: oauthResult.refreshToken,
            },
          });

          existingEmailUser.linkAccount(linkedAccount);
          existingEmailUser.recordLogin();
          user = await this.userRepository.save(existingEmailUser);
        }
      }

      if (!user) {
        // Create new user — emailVerified from provider gates emailSource
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

        user = User.createWithProvider(
          userId.toString(),
          nickname,
          linkedAccount,
          tenantId,
          email,
          userInfo.emailVerified
        );

        user.recordLogin();
        await this.userRepository.save(user);
      }
    }

    // 3. Generate tokens (tenantId embedded in JWT)
    const accessToken = this.tokenService.generateAccessToken(user.id, user.tenantId);
    const refreshToken = this.tokenService.generateRefreshToken();

    // 4. Store refresh token in session
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
