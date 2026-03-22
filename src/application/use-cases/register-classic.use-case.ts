import { User } from '../../domain/entities';
import { Email, Password, Nickname, UserId } from '../../domain/value-objects';
import {
  IUserRepository,
  IAuditLogService,
  IEmailService,
  IEmailTokenService,
} from '../interfaces/repositories.interface';
import { RegisterClassicDto, RegisterPendingResponseDto } from '../dto/auth.dto';

/**
 * Use Case: Classic User Registration with Email/Password
 *
 * Flow (email sovereign model):
 * 1. Validates input data using Value Objects
 * 2. Checks if email already exists
 * 3. Creates user with emailVerified=false
 * 4. Sends verification email
 * 5. Returns pending response (NO tokens until verified)
 */
export class RegisterClassicUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly auditLog: IAuditLogService,
    private readonly emailService: IEmailService,
    private readonly emailTokenService: IEmailTokenService
  ) {}

  async execute(dto: RegisterClassicDto): Promise<RegisterPendingResponseDto> {
    // 1. Validate input using Value Objects
    const email = Email.create(dto.email);
    const password = Password.create(dto.password);
    const nickname = Nickname.create(dto.nickname);

    // 2. Check if user already exists — scoped by tenant (ADR-008)
    const existingUser = await this.userRepository.findByEmail(dto.email, dto.tenantId);
    if (existingUser) {
      if (!existingUser.emailVerified) {
        // Resend verification email for unverified account
        const { rawToken } = await this.emailTokenService.createVerificationToken({
          userId: existingUser.id,
          tenantId: dto.tenantId,
        });
        await this.emailService.sendVerificationEmail(dto.email, rawToken, dto.tenantId);

        return {
          message: 'VERIFICATION_EMAIL_SENT',
          email: dto.email,
          tenantId: dto.tenantId,
        };
      }
      throw new Error('User with this email already exists');
    }

    // 3. Create new user — emailVerified=false until email confirmation
    const userId = UserId.generate();
    const user = User.createWithEmail(userId.toString(), email, nickname, password, dto.tenantId);

    // 4. Save user to repository
    const savedUser = await this.userRepository.save(user);

    // 5. Create verification token and send email
    const { rawToken } = await this.emailTokenService.createVerificationToken({
      userId: savedUser.id,
      tenantId: dto.tenantId,
    });

    await this.emailService.sendVerificationEmail(dto.email, rawToken, dto.tenantId);

    // 6. Audit log — fire-and-forget
    this.auditLog.log({ tenantId: savedUser.tenantId, userId: savedUser.id, event: 'register' }).catch(() => {});

    // 7. Return pending — NO tokens
    return {
      message: 'VERIFICATION_EMAIL_SENT',
      email: dto.email,
      tenantId: dto.tenantId,
    };
  }
}
