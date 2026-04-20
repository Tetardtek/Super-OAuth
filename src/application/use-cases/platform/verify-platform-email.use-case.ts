import { IPlatformUserRepository } from '../../../domain/repositories/platform-user.repository.interface';
import { PlatformEmailTokenService } from '../../../infrastructure/services/platform-email-token.service';

export interface VerifyPlatformEmailInput {
  rawToken: string;
}

export type VerifyPlatformEmailOutcome =
  | { status: 'verified'; platformUserId: string; email: string }
  | { status: 'invalid_token' }
  | { status: 'user_not_found' };

/**
 * Verifies a platform user's email using a single-use token.
 *
 * Idempotency : verifyToken() marks the token as used on success — a replay
 * returns 'invalid_token'. A user who is already verified and clicks an
 * expired link also falls through 'invalid_token' (safe default).
 */
export class VerifyPlatformEmailUseCase {
  constructor(
    private readonly userRepository: IPlatformUserRepository,
    private readonly emailTokenService: PlatformEmailTokenService
  ) {}

  async execute(input: VerifyPlatformEmailInput): Promise<VerifyPlatformEmailOutcome> {
    const token = await this.emailTokenService.verifyToken(input.rawToken, 'verification');
    if (!token) {
      return { status: 'invalid_token' };
    }

    const user = await this.userRepository.findById(token.platformUserId);
    if (!user) {
      return { status: 'user_not_found' };
    }

    user.verifyEmail();
    await this.userRepository.update(user);

    return {
      status: 'verified',
      platformUserId: user.id,
      email: user.email.toString(),
    };
  }
}
