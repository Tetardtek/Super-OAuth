import { Repository } from 'typeorm';
import { PlatformUserEntity } from '../database/entities/platform-user.entity';
import { DatabaseConnection } from '../database/config/database.config';
import { PlatformEmailTokenService } from './platform-email-token.service';
import { PlatformSessionService } from './platform-session.service';
import { PasswordService } from './password.service';
import { logger } from '../../shared/utils/logger.util';

export interface RequestResetResult {
  /** True if a token was issued. False when email doesn't match any platform user (returned to the caller as success to avoid email enumeration). */
  issued: boolean;
  /** Raw token to embed in email link — only present when issued=true. */
  rawToken?: string;
  expiresAt?: Date;
}

export interface ConfirmResetResult {
  success: boolean;
  platformUserId?: string;
  reason?: 'invalid_token' | 'weak_password';
}

const MIN_PASSWORD_LENGTH = 12;

export class PlatformPasswordResetService {
  private userRepository: Repository<PlatformUserEntity>;
  private passwordService: PasswordService;

  constructor(
    private readonly emailTokenService: PlatformEmailTokenService,
    private readonly sessionService: PlatformSessionService,
    passwordService?: PasswordService
  ) {
    this.userRepository = DatabaseConnection.getDataSource().getRepository(PlatformUserEntity);
    this.passwordService = passwordService ?? new PasswordService();
  }

  /**
   * Issues a password reset token for the given email.
   * Returns `issued: false` silently when email doesn't exist — callers should
   * respond with a generic "check your inbox" message to avoid email enumeration.
   */
  async requestReset(email: string): Promise<RequestResetResult> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      logger.info('Platform password reset requested for unknown email', { email });
      return { issued: false };
    }

    const { rawToken, expiresAt } = await this.emailTokenService.createPasswordResetToken({
      platformUserId: user.id,
    });

    return { issued: true, rawToken, expiresAt };
  }

  /**
   * Confirms the reset: validates token, sets new password hash, revokes all active sessions.
   */
  async confirmReset(rawToken: string, newPassword: string): Promise<ConfirmResetResult> {
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      return { success: false, reason: 'weak_password' };
    }

    const tokenEntity = await this.emailTokenService.verifyToken(rawToken, 'password_reset');
    if (!tokenEntity) {
      return { success: false, reason: 'invalid_token' };
    }

    const newHash = await this.passwordService.hash(newPassword);

    await this.userRepository.update(
      { id: tokenEntity.platformUserId },
      { passwordHash: newHash }
    );

    await this.sessionService.revokeAllForUser(tokenEntity.platformUserId);

    logger.info('Platform password reset confirmed', {
      platformUserId: tokenEntity.platformUserId,
    });

    return { success: true, platformUserId: tokenEntity.platformUserId };
  }
}
