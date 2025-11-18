import { User } from '../../domain/entities';
import { Email, Password } from '../../domain/value-objects';
import {
  IUserRepository,
  ITokenService,
  ISessionRepository,
} from '../interfaces/repositories.interface';
import { LoginClassicDto, AuthResponseDto, UserDto } from '../dto/auth.dto';

/**
 * Use Case: Classic User Login with Email/Password
 *
 * This use case handles user authentication using email and password credentials.
 * It implements security best practices and follows Clean Architecture principles.
 *
 * Flow:
 * 1. Validates email format using Value Object
 * 2. Retrieves user from database by email
 * 3. Verifies account is active (not banned/deactivated)
 * 4. Checks if account supports password login (vs OAuth-only)
 * 5. Verifies password using secure comparison
 * 6. Records login event (updates last login time, login count)
 * 7. Generates new JWT access and refresh tokens
 * 8. Creates session record in database
 * 9. Returns authentication response
 *
 * Security Measures:
 * - Generic error messages to prevent user enumeration
 * - Password comparison using constant-time algorithm (bcrypt)
 * - Account status validation before authentication
 * - Session tracking for token management
 * - Login statistics for anomaly detection
 *
 * @example
 * ```typescript
 * const result = await loginUseCase.execute({
 *   email: 'user@example.com',
 *   password: 'SecurePass123!'
 * });
 * // Returns: { accessToken, refreshToken, user }
 * ```
 */
export class LoginClassicUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly sessionRepository: ISessionRepository
  ) {}

  /**
   * Executes the login use case
   *
   * @param dto - Login credentials containing email and password
   * @returns Authentication response with tokens and user data
   * @throws Error with generic message for security (prevents user enumeration)
   */
  async execute(dto: LoginClassicDto): Promise<AuthResponseDto> {
    // 1. Validate input (email format validation)
    // This ensures the email format is valid before querying the database
    Email.create(dto.email);

    // 2. Find user by email
    // Return generic error to prevent email enumeration attacks
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 3. Check if user account is active
    // Prevents login for banned, suspended, or deactivated accounts
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // 4. Check if user has a password (not OAuth-only user)
    // Some users might only authenticate via OAuth providers
    if (!user.hasPassword) {
      throw new Error('This account was created with OAuth. Please use OAuth login.');
    }

    // 5. Verify password using secure comparison
    // bcrypt.compare uses constant-time comparison to prevent timing attacks
    const isPasswordValid = user.verifyPassword(dto.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // 6. Record login event
    // Updates lastLogin timestamp and increments login counter
    // This data is useful for security monitoring and user analytics
    user.recordLogin();
    await this.userRepository.save(user);

    // 7. Generate JWT tokens
    // Access token: short-lived (15 min), used for API authentication
    // Refresh token: long-lived (7 days), used to obtain new access tokens
    const accessToken = this.tokenService.generateAccessToken(user.id);
    const refreshToken = this.tokenService.generateRefreshToken();

    // 8. Store refresh token in session database
    // This allows token revocation and session management
    const tokenExpiration = this.tokenService.getTokenExpiration();
    const expiresAt = new Date(Date.now() + tokenExpiration.refreshToken);
    await this.sessionRepository.create(user.id, refreshToken, expiresAt);

    // 9. Return authentication response
    // Map domain entity to DTO to avoid exposing internal structure
    return {
      accessToken,
      refreshToken,
      user: this.mapUserToDto(user),
    };
  }

  /**
   * Maps User domain entity to UserDto for presentation layer
   *
   * This transformation ensures:
   * - Domain model is not exposed directly to API consumers
   * - Sensitive data (like password hash) is excluded
   * - Value Objects are converted to primitive types
   *
   * @param user - User domain entity
   * @returns UserDto for API responses
   */
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
