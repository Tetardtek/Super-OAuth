/**
 * Auth Service - Application layer authentication business logic
 * Handles JWT token generation and validation
 * @version 1.0.0
 */

import { User } from '../../domain/entities/user.entity';
import { tokenService } from '../../infrastructure/services/token.service';
import { logger } from '../../shared/utils/logger.util';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  /**
   * Generate JWT token pair for user
   */
  async generateTokens(user: User): Promise<TokenPair> {
    logger.info('🔑 Generating tokens for user', { userId: user.id });

    const accessToken = tokenService.generateAccessToken(user.id);
    const refreshToken = tokenService.generateRefreshToken();

    logger.info('✅ Tokens generated successfully', { userId: user.id });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<{ userId: string } | null> {
    return tokenService.verifyAccessToken(token);
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<unknown | null> {
    return tokenService.verifyRefreshToken(token);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    logger.info('🔄 Refreshing tokens');

    const payload = tokenService.verifyRefreshToken(refreshToken);

    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    const newAccessToken = tokenService.generateAccessToken(payload.userId || 'unknown');
    const newRefreshToken = tokenService.generateRefreshToken();

    logger.info('✅ Tokens refreshed successfully');

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600,
    };
  }

  /**
   * Revoke refresh token
   */
  async revokeToken(token: string): Promise<void> {
    await tokenService.revokeToken(token);
  }
}

export const authService = new AuthService();

// Auth Service is ready for use
