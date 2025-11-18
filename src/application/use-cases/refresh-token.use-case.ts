import {
  IUserRepository,
  ITokenService,
  ISessionRepository,
} from '../interfaces/repositories.interface';
import { RefreshTokenDto, AuthResponseDto, UserDto } from '../dto/auth.dto';
import { User } from '../../domain/entities';

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly sessionRepository: ISessionRepository
  ) {}

  async execute(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    // 1. Find session by refresh token
    const session = await this.sessionRepository.findByRefreshToken(dto.refreshToken);
    if (!session) {
      throw new Error('Invalid refresh token');
    }

    // 2. Check if token has expired
    if (session.expiresAt < new Date()) {
      // Clean up expired token
      await this.sessionRepository.deleteByRefreshToken(dto.refreshToken);
      throw new Error('Refresh token has expired');
    }

    // 3. Find user
    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      // Clean up orphaned session
      await this.sessionRepository.deleteByRefreshToken(dto.refreshToken);
      throw new Error('User not found');
    }

    // 4. Check if user is still active
    if (!user.isActive) {
      // Clean up session for deactivated user
      await this.sessionRepository.deleteByUserId(user.id);
      throw new Error('Account is deactivated');
    }

    // 5. Generate new tokens
    const accessToken = this.tokenService.generateAccessToken(user.id);
    const newRefreshToken = this.tokenService.generateRefreshToken();

    // 6. Update session with new refresh token
    await this.sessionRepository.deleteByRefreshToken(dto.refreshToken);
    const tokenExpiration = this.tokenService.getTokenExpiration();
    const expiresAt = new Date(Date.now() + tokenExpiration.refreshToken);
    await this.sessionRepository.create(user.id, newRefreshToken, expiresAt);

    // 7. Return new authentication response
    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.mapUserToDto(user),
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
      loginCount: user.loginCount,
    };
  }
}
