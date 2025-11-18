import { User, LinkedAccount } from '../../domain/entities';
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
    // 1. Exchange code for tokens and user info
    const oauthResult = await this.oauthService.exchangeCodeForTokens(
      dto.provider,
      dto.code,
      dto.state
    );

    // 2. Check if user already exists with this provider
    let user = await this.userRepository.findByProvider(dto.provider, oauthResult.userInfo.id);

    if (user) {
      // Existing user - just login
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Record login
      user.recordLogin();
      await this.userRepository.save(user);
    } else {
      // Check if user exists with same email
      if (oauthResult.userInfo.email) {
        const existingEmailUser = await this.userRepository.findByEmail(oauthResult.userInfo.email);

        if (existingEmailUser) {
          // Link this provider to existing user
          const linkedAccount = LinkedAccount.create({
            userId: new UserId(existingEmailUser.id),
            provider: dto.provider as any,
            providerId: oauthResult.userInfo.id,
            displayName: oauthResult.userInfo.nickname,
            email: oauthResult.userInfo.email || '',
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
        // Create new user
        const userId = UserId.generate();
        const nickname = Nickname.create(oauthResult.userInfo.nickname);
        const email = oauthResult.userInfo.email
          ? Email.create(oauthResult.userInfo.email)
          : undefined;

        const linkedAccount = LinkedAccount.create({
          userId: userId,
          provider: dto.provider as any,
          providerId: oauthResult.userInfo.id,
          displayName: oauthResult.userInfo.nickname,
          email: oauthResult.userInfo.email || '',
          avatarUrl: undefined,
          metadata: {
            accessToken: oauthResult.accessToken,
            refreshToken: oauthResult.refreshToken,
          },
        });

        user = User.createWithProvider(userId.toString(), nickname, linkedAccount, email);

        user.recordLogin();
        await this.userRepository.save(user);
      }
    }

    // 3. Generate tokens
    const accessToken = this.tokenService.generateAccessToken(user.id);
    const refreshToken = this.tokenService.generateRefreshToken();

    // 4. Store refresh token in session
    const tokenExpiration = this.tokenService.getTokenExpiration();
    const expiresAt = new Date(Date.now() + tokenExpiration.refreshToken);
    await this.sessionRepository.create(user.id, refreshToken, expiresAt);

    // 5. Return authentication response
    return {
      accessToken,
      refreshToken,
      user: this.mapUserToDto(user),
    };
  }

  private mapUserToDto(user: User): UserDto {
    return {
      id: user.id,
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
