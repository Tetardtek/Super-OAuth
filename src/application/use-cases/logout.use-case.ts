import { ISessionRepository } from '../interfaces/repositories.interface';

export class LogoutUseCase {
  constructor(private readonly sessionRepository: ISessionRepository) {}

  async execute(refreshToken: string): Promise<void> {
    // 1. Delete the specific session by refresh token
    await this.sessionRepository.deleteByRefreshToken(refreshToken);

    // Note: Access tokens are stateless JWTs and will expire naturally
    // The client should also discard the access token locally
  }

  async executeAllSessions(userId: string): Promise<void> {
    // 1. Delete all sessions for the user (logout from all devices)
    await this.sessionRepository.deleteByUserId(userId);
  }
}
