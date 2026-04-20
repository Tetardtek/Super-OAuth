import { IPlatformUserRepository } from '../../../domain/repositories/platform-user.repository.interface';
import { PlatformSessionService } from '../../../infrastructure/services/platform-session.service';
import { PlatformTokenService } from '../../../infrastructure/services/platform-token.service';

export interface RefreshPlatformSessionInput {
  refreshToken: string;
  metadata?: { ipAddress?: string; userAgent?: string; deviceFingerprint?: string };
}

export type RefreshPlatformSessionOutcome =
  | { status: 'ok'; accessToken: string; refreshToken: string }
  | { status: 'invalid_refresh_token' };

/**
 * Rotates a platform refresh token : validates JWT + DB session, revokes the
 * old session, issues a fresh access + refresh pair, and persists the new session.
 */
export class RefreshPlatformSessionUseCase {
  constructor(
    private readonly userRepository: IPlatformUserRepository,
    private readonly tokenService: PlatformTokenService,
    private readonly sessionService: PlatformSessionService
  ) {}

  async execute(input: RefreshPlatformSessionInput): Promise<RefreshPlatformSessionOutcome> {
    const claims = this.tokenService.verifyRefreshToken(input.refreshToken);
    if (!claims) return { status: 'invalid_refresh_token' };

    const session = await this.sessionService.findByRefreshToken(input.refreshToken);
    if (!session) return { status: 'invalid_refresh_token' };

    const user = await this.userRepository.findById(session.platformUserId);
    if (!user) return { status: 'invalid_refresh_token' };

    await this.sessionService.revokeByRefreshToken(input.refreshToken);

    const newAccess = this.tokenService.generateAccessToken(user.id, user.role);
    const newRefresh = this.tokenService.generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.tokenService.getRefreshExpirationMs());
    await this.sessionService.create(user.id, newRefresh, expiresAt, input.metadata);

    return { status: 'ok', accessToken: newAccess, refreshToken: newRefresh };
  }
}
