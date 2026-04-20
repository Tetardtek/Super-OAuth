import { randomUUID } from 'crypto';
import { PlatformUser } from '../../../domain/entities/platform-user.entity';
import { Email } from '../../../domain/value-objects/email.vo';
import { Password } from '../../../domain/value-objects/password.vo';
import { IPlatformUserRepository } from '../../../domain/repositories/platform-user.repository.interface';
import { PlatformEmailTokenService } from '../../../infrastructure/services/platform-email-token.service';

export interface RegisterPlatformUserInput {
  email: string;
  password: string;
}

export type RegisterPlatformUserOutcome =
  | {
      status: 'created' | 'resent';
      platformUserId: string;
      email: string;
      verificationToken: string;
      verificationTokenExpiresAt: Date;
    }
  | { status: 'already_verified' };

/**
 * Registers a new platform user (SaaS client owner) with email + password.
 *
 * Flow :
 * 1. Validate email + password via value objects (throws on invalid input)
 * 2. If user exists and is verified → return 'already_verified'
 * 3. If user exists but not verified → re-issue verification token ('resent')
 * 4. Otherwise → create PlatformUser, persist, issue verification token ('created')
 *
 * The raw verification token is returned to the caller — the route layer is
 * responsible for dispatching the verification email. Never log the token.
 */
export class RegisterPlatformUserUseCase {
  constructor(
    private readonly userRepository: IPlatformUserRepository,
    private readonly emailTokenService: PlatformEmailTokenService
  ) {}

  async execute(input: RegisterPlatformUserInput): Promise<RegisterPlatformUserOutcome> {
    const email = Email.create(input.email);
    const password = Password.create(input.password);

    const existing = await this.userRepository.findByEmail(email.toString());
    if (existing) {
      if (existing.emailVerified) {
        return { status: 'already_verified' };
      }

      const { rawToken, expiresAt } = await this.emailTokenService.createVerificationToken({
        platformUserId: existing.id,
      });
      return {
        status: 'resent',
        platformUserId: existing.id,
        email: existing.email.toString(),
        verificationToken: rawToken,
        verificationTokenExpiresAt: expiresAt,
      };
    }

    const user = PlatformUser.create(randomUUID(), email, password);
    await this.userRepository.save(user);

    const { rawToken, expiresAt } = await this.emailTokenService.createVerificationToken({
      platformUserId: user.id,
    });

    return {
      status: 'created',
      platformUserId: user.id,
      email: user.email.toString(),
      verificationToken: rawToken,
      verificationTokenExpiresAt: expiresAt,
    };
  }
}
