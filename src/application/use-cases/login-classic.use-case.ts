import { User } from '../../domain/entities';
import { Email, Password } from '../../domain/value-objects';
import { IUserRepository, ITokenService, ISessionRepository } from '../interfaces/repositories.interface';
import { LoginClassicDto, AuthResponseDto, UserDto } from '../dto/auth.dto';

export class LoginClassicUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly sessionRepository: ISessionRepository
  ) {}

  async execute(dto: LoginClassicDto): Promise<AuthResponseDto> {
    // 1. Validate input (email format validation)
    Email.create(dto.email);
    
    // 2. Find user by email
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 3. Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // 4. Check if user has a password (not OAuth-only user)
    if (!user.hasPassword) {
      throw new Error('This account was created with OAuth. Please use OAuth login.');
    }

    // 5. Verify password
    const isPasswordValid = Password.verify(dto.password, (user as any)._passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // 6. Record login
    user.recordLogin();
    await this.userRepository.save(user);

    // 7. Generate tokens
    const accessToken = this.tokenService.generateAccessToken(user.id);
    const refreshToken = this.tokenService.generateRefreshToken();

    // 8. Store refresh token in session
    const tokenExpiration = this.tokenService.getTokenExpiration();
    const expiresAt = new Date(Date.now() + tokenExpiration.refreshToken);
    await this.sessionRepository.create(user.id, refreshToken, expiresAt);

    // 9. Return authentication response
    return {
      accessToken,
      refreshToken,
      user: this.mapUserToDto(user)
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
      loginCount: user.loginCount
    };
  }
}
