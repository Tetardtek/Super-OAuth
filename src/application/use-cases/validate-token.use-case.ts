import {
  IUserRepository,
  ITokenService,
  ITokenBlacklist,
  ITenantTokenService,
} from '../interfaces/repositories.interface';
import { ValidateTokenDto, TokenValidationResponseDto } from '../dto/auth.dto';

/**
 * Use Case: Validate Access Token (Token Introspection)
 *
 * Designed for service-to-service authentication.
 * Allows external apps (e.g. OriginsDigital) to verify a SuperOAuth-issued token
 * without sharing the JWT secret.
 *
 * Flow:
 * 1. Verify JWT signature + expiry
 * 2. Check token is not blacklisted (post-logout revocation)
 * 3. Verify user exists and is active
 * 4. Return user payload
 *
 * @example
 * ```typescript
 * const result = await validateTokenUseCase.execute({ token: 'eyJ...' });
 * // Returns: { user: { id, email, nickname, ... } }
 * // Throws:  'INVALID_TOKEN' | 'TOKEN_REVOKED' | 'USER_NOT_FOUND'
 * ```
 */
export class ValidateTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly tokenBlacklist: ITokenBlacklist,
    private readonly tenantTokenService: ITenantTokenService
  ) {}

  async execute(dto: ValidateTokenDto): Promise<TokenValidationResponseDto> {
    // 1. Decode without verification to extract tenantId (no signature check yet)
    const unverified = this.tokenService.decodeAccessToken(dto.token);
    if (!unverified) {
      throw new Error('INVALID_TOKEN');
    }

    // 1b. Verify JWT signature with the tenant's secret
    const decoded = await this.tenantTokenService.verifyAccessToken(dto.token, unverified.tenantId);
    if (!decoded) {
      throw new Error('INVALID_TOKEN');
    }

    // 2. Check token revocation (Redis blacklist — handles post-logout tokens)
    const revoked = await this.tokenBlacklist.isRevoked(decoded.jti);
    if (revoked) {
      throw new Error('TOKEN_REVOKED');
    }

    // 3. Verify user still exists and is active
    const user = await this.userRepository.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new Error('USER_NOT_FOUND');
    }

    return {
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email?.toString() ?? null,
        nickname: user.nickname.toString(),
        isActive: user.isActive,
        linkedProviders: user.linkedProviders,
      },
    };
  }
}
