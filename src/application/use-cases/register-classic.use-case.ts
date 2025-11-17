import { User } from '../../domain/entities';
import { Email, Password, Nickname, UserId } from '../../domain/value-objects';
import { IUserRepository, ITokenService } from '../interfaces/repositories.interface';
import { RegisterClassicDto, AuthResponseDto, UserDto } from '../dto/auth.dto';

/**
 * Use Case: Classic User Registration with Email/Password
 *
 * This use case handles the registration of a new user using email and password authentication.
 * It follows the Clean Architecture pattern and Domain-Driven Design principles.
 *
 * Flow:
 * 1. Validates input data using Value Objects (Email, Password, Nickname)
 * 2. Checks if a user with the same email already exists
 * 3. Creates a new User entity with validated data
 * 4. Persists the user to the database via repository
 * 5. Generates JWT access and refresh tokens
 * 6. Returns authentication response with user data and tokens
 *
 * Security:
 * - Password is automatically hashed by the Password value object
 * - Email format is validated by the Email value object
 * - Duplicate emails are prevented before database insertion
 *
 * @example
 * ```typescript
 * const result = await registerUseCase.execute({
 *   email: 'user@example.com',
 *   password: 'SecurePass123!',
 *   nickname: 'JohnDoe'
 * });
 * // Returns: { accessToken, refreshToken, user }
 * ```
 */
export class RegisterClassicUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService
  ) {}

  /**
   * Executes the registration use case
   *
   * @param dto - Registration data containing email, password, and nickname
   * @returns Authentication response with tokens and user data
   * @throws Error if user already exists or validation fails
   */
  async execute(dto: RegisterClassicDto): Promise<AuthResponseDto> {
    // 1. Validate input using Value Objects
    // Value Objects ensure data integrity and validation at domain level
    const email = Email.create(dto.email);
    const password = Password.create(dto.password);
    const nickname = Nickname.create(dto.nickname);

    // 2. Check if user already exists (business rule)
    // This prevents duplicate accounts with the same email
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // 3. Create new user entity
    // The User entity encapsulates all business logic related to users
    const userId = UserId.generate();
    const user = User.createWithEmail(
      userId.toString(),
      email,
      nickname,
      password
    );

    // 4. Save user to repository (persistence layer)
    // Repository abstracts database operations
    const savedUser = await this.userRepository.save(user);

    // 5. Generate JWT tokens for authentication
    // Access token: short-lived (15 min) for API requests
    // Refresh token: long-lived (7 days) for renewing access tokens
    const accessToken = this.tokenService.generateAccessToken(savedUser.id);
    const refreshToken = this.tokenService.generateRefreshToken();

    // 6. Return authentication response
    // Map domain entity to DTO for presentation layer
    return {
      accessToken,
      refreshToken,
      user: this.mapUserToDto(savedUser)
    };
  }

  /**
   * Maps User domain entity to UserDto for presentation layer
   *
   * This ensures the domain model is not exposed directly to the presentation layer,
   * following the principle of separation of concerns.
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
      loginCount: user.loginCount
    };
  }
}
