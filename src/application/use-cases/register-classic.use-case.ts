import { User } from '../../domain/entities';
import { Email, Password, Nickname, UserId } from '../../domain/value-objects';
import { IUserRepository, ITokenService } from '../interfaces/repositories.interface';
import { RegisterClassicDto, AuthResponseDto, UserDto } from '../dto/auth.dto';

export class RegisterClassicUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService
  ) {}

  async execute(dto: RegisterClassicDto): Promise<AuthResponseDto> {
    // 1. Validate input
    const email = Email.create(dto.email);
    const password = Password.create(dto.password);
    const nickname = Nickname.create(dto.nickname);

    // 2. Check if user already exists
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // 3. Create new user
    const userId = UserId.generate();
    const user = User.createWithEmail(
      userId.toString(),
      email,
      nickname,
      password
    );

    // 4. Save user to repository
    const savedUser = await this.userRepository.save(user);

    // 5. Generate tokens
    const accessToken = this.tokenService.generateAccessToken(savedUser.id);
    const refreshToken = this.tokenService.generateRefreshToken();

    // 6. Return authentication response
    return {
      accessToken,
      refreshToken,
      user: this.mapUserToDto(savedUser)
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
