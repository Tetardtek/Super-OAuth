import { PlatformSessionService } from '../../../infrastructure/services/platform-session.service';

export interface LogoutPlatformUserInput {
  refreshToken: string;
}

/**
 * Revokes a platform session by its refresh token. Idempotent : revoking an
 * already-revoked or unknown token is a silent no-op (avoids user enumeration
 * on logout endpoints).
 */
export class LogoutPlatformUserUseCase {
  constructor(private readonly sessionService: PlatformSessionService) {}

  async execute(input: LogoutPlatformUserInput): Promise<void> {
    await this.sessionService.revokeByRefreshToken(input.refreshToken);
  }
}
