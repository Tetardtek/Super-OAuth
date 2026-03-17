import {
  IUserRepository,
  ITokenService,
  ISessionRepository,
  ITenantTokenService,
  IAuditLogService,
} from '../interfaces/repositories.interface';
import { RefreshTokenDto, AuthResponseDto, UserDto } from '../dto/auth.dto';
import { User } from '../../domain/entities';
import { logger } from '../../shared/utils/logger.util';

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly sessionRepository: ISessionRepository,
    private readonly tenantTokenService: ITenantTokenService,
    private readonly auditLog: IAuditLogService
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

    // 3. Validate device fingerprint if session has one stored
    // Pourquoi ici et pas dans le middleware ? Le fingerprint implique un accès DB (session).
    // Le use case est le seul endroit qui charge la session — c'est la règle métier, pas un contrôle HTTP.
    // Si la session a un fingerprint, le client DOIT en fournir un — l'absence est traitée comme anomalie.
    const fingerprintMismatch =
      !!session.deviceFingerprint &&
      (!dto.deviceFingerprint || session.deviceFingerprint !== dto.deviceFingerprint);

    if (fingerprintMismatch) {
      logger.warn('Device fingerprint mismatch or missing on token refresh', {
        sessionFingerprint: session.deviceFingerprint!.substring(0, 8) + '...',
        requestFingerprint: dto.deviceFingerprint
          ? dto.deviceFingerprint.substring(0, 8) + '...'
          : 'absent',
      });
      // Soft check : on log l'anomalie sans rejeter pour éviter les faux positifs
      // (mobile en roaming, changement de réseau). Passer à hard reject après mesure en prod.
    }

    // 4. Find user
    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      // Clean up orphaned session
      await this.sessionRepository.deleteByRefreshToken(dto.refreshToken);
      throw new Error('User not found');
    }

    // 5. Check if user is still active
    if (!user.isActive) {
      // Clean up session for deactivated user
      await this.sessionRepository.deleteByUserId(user.id);
      throw new Error('Account is deactivated');
    }

    // 6. Generate new tokens — access token signed with tenant secret (Tier 3)
    const accessToken = await this.tenantTokenService.generateAccessToken(user.id, user.tenantId);
    const newRefreshToken = this.tokenService.generateRefreshToken();

    // 7. Update session with new refresh token
    // En cas de mismatch, on conserve le fingerprint original — jamais celui de la requête suspecte.
    // Cela empêche un attaquant de "migrer" le fingerprint vers son device via des refreshes successifs.
    await this.sessionRepository.deleteByRefreshToken(dto.refreshToken);
    const tokenExpiration = this.tokenService.getTokenExpiration();
    const expiresAt = new Date(Date.now() + tokenExpiration.refreshToken);
    const fingerprint = fingerprintMismatch
      ? session.deviceFingerprint
      : (dto.deviceFingerprint ?? session.deviceFingerprint);
    await this.sessionRepository.create(user.id, newRefreshToken, expiresAt, {
      ...(fingerprint && { deviceFingerprint: fingerprint }),
    });

    // 7b. Audit log — fire-and-forget
    this.auditLog.log({ tenantId: user.tenantId, userId: user.id, event: 'token_refresh' }).catch(() => {});

    // 8. Return new authentication response
    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.mapUserToDto(user),
    };
  }

  private mapUserToDto(user: User): UserDto {
    return {
      id: user.id,
      tenantId: user.tenantId,
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
