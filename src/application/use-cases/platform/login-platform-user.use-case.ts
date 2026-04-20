import { IPlatformUserRepository } from '../../../domain/repositories/platform-user.repository.interface';
import { PlatformSessionService } from '../../../infrastructure/services/platform-session.service';
import { PlatformTokenService } from '../../../infrastructure/services/platform-token.service';

export interface LoginPlatformUserInput {
  email: string;
  password: string;
  metadata?: { ipAddress?: string; userAgent?: string; deviceFingerprint?: string };
}

export type LoginPlatformUserOutcome =
  | {
      status: 'ok';
      accessToken: string;
      refreshToken: string;
      platformUser: {
        id: string;
        email: string;
        role: 'suadmin' | 'client';
        emailVerified: boolean;
      };
    }
  | { status: 'invalid_credentials' }
  | { status: 'email_not_verified' }
  | { status: 'requires_password_reset' };

export class LoginPlatformUserUseCase {
  constructor(
    private readonly userRepository: IPlatformUserRepository,
    private readonly tokenService: PlatformTokenService,
    private readonly sessionService: PlatformSessionService
  ) {}

  async execute(input: LoginPlatformUserInput): Promise<LoginPlatformUserOutcome> {
    const user = await this.userRepository.findByEmail(input.email.toLowerCase());
    if (!user) return { status: 'invalid_credentials' };

    if (user.requiresPasswordReset()) return { status: 'requires_password_reset' };
    if (!user.verifyPassword(input.password)) return { status: 'invalid_credentials' };
    if (!user.emailVerified) return { status: 'email_not_verified' };

    user.recordLogin();
    await this.userRepository.update(user);

    const accessToken = this.tokenService.generateAccessToken(user.id, user.role);
    const refreshToken = this.tokenService.generateRefreshToken();

    const expiresAt = new Date(Date.now() + this.tokenService.getRefreshExpirationMs());
    await this.sessionService.create(user.id, refreshToken, expiresAt, input.metadata);

    return {
      status: 'ok',
      accessToken,
      refreshToken,
      platformUser: {
        id: user.id,
        email: user.email.toString(),
        role: user.role,
        emailVerified: user.emailVerified,
      },
    };
  }
}
