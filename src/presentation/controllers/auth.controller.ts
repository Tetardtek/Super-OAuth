import { Request, Response } from 'express';
import { ValidatedRequest } from '../middleware/validation.middleware';
import { DIContainer } from '../../infrastructure/di/container';
import { RegisterClassicUseCase } from '../../application/use-cases/register-classic.use-case';
import { LoginClassicUseCase } from '../../application/use-cases/login-classic.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { StartOAuthUseCase } from '../../application/use-cases/start-oauth.use-case';
import { CompleteOAuthUseCase } from '../../application/use-cases/complete-oauth.use-case';
import { logger } from '../../shared/utils/logger.util';

export class AuthController {
  private readonly registerUseCase: RegisterClassicUseCase;
  private readonly loginUseCase: LoginClassicUseCase;
  private readonly refreshTokenUseCase: RefreshTokenUseCase;
  private readonly logoutUseCase: LogoutUseCase;
  private readonly startOAuthUseCase: StartOAuthUseCase;
  private readonly completeOAuthUseCase: CompleteOAuthUseCase;

  constructor() {
    const container = DIContainer.getInstance();
    this.registerUseCase = container.getRegisterClassicUseCase();
    this.loginUseCase = container.getLoginClassicUseCase();
    this.refreshTokenUseCase = container.getRefreshTokenUseCase();
    this.logoutUseCase = container.getLogoutUseCase();
    this.startOAuthUseCase = container.getStartOAuthUseCase();
    this.completeOAuthUseCase = container.getCompleteOAuthUseCase();
  }

  /**
   * POST /auth/register
   * Classic email/password registration
   */
  async register(req: ValidatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, nickname } = req.validatedBody!;

      logger.info('User registration attempt', {
        email,
        nickname,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const result = await this.registerUseCase.execute({
        email: email as string,
        password: password as string,
        nickname: nickname as string,
      });

      logger.info('User registered successfully', {
        userId: result.user.id,
        email: result.user.email,
        nickname: result.user.nickname,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            nickname: result.user.nickname,
            emailVerified: result.user.emailVerified,
            isActive: result.user.isActive,
            createdAt: result.user.createdAt,
          },
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          },
        },
      });
    } catch (error) {
      logger.error('Registration failed', error instanceof Error ? error : undefined, {
        email: req.validatedBody?.email,
        ip: req.ip,
      });

      if (error instanceof Error) {
        // Handle specific business errors
        if (error.message.includes('already exists')) {
          res.status(409).json({
            success: false,
            error: 'USER_EXISTS',
            message: 'User with this email already exists',
          });
          return;
        }

        if (error.message.includes('validation') || error.message.includes('invalid')) {
          res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Registration failed',
      });
    }
  }

  /**
   * POST /auth/login
   * Classic email/password login
   */
  async login(req: ValidatedRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.validatedBody!;

      logger.info('User login attempt', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const result = await this.loginUseCase.execute({
        email: email as string,
        password: password as string,
      });

      logger.info('User logged in successfully', {
        userId: result.user.id,
        email: result.user.email,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            nickname: result.user.nickname,
            emailVerified: result.user.emailVerified,
            isActive: result.user.isActive,
            lastLoginAt: result.user.lastLogin,
          },
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          },
        },
      });
    } catch (error) {
      logger.error('Login failed', error instanceof Error ? error : undefined, {
        email: req.validatedBody?.email,
        ip: req.ip,
      });

      if (error instanceof Error) {
        // Handle specific authentication errors
        if (
          error.message.includes('Invalid credentials') ||
          error.message.includes('User not found') ||
          error.message.includes('Invalid password')
        ) {
          res.status(401).json({
            success: false,
            error: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          });
          return;
        }

        if (error.message.includes('inactive') || error.message.includes('disabled')) {
          res.status(403).json({
            success: false,
            error: 'ACCOUNT_DISABLED',
            message: 'Account is disabled',
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Login failed',
      });
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  async refreshToken(req: ValidatedRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.validatedBody!;

      logger.info('Token refresh attempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const result = await this.refreshTokenUseCase.execute({
        refreshToken: refreshToken as string,
      });

      logger.info('Token refreshed successfully', {
        userId: result.user.id,
      });

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error) {
      logger.error('Token refresh failed', error instanceof Error ? error : undefined, {
        ip: req.ip,
      });

      if (error instanceof Error) {
        if (
          error.message.includes('Invalid') ||
          error.message.includes('expired') ||
          error.message.includes('not found')
        ) {
          res.status(401).json({
            success: false,
            error: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid or expired refresh token',
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Token refresh failed',
      });
    }
  }

  /**
   * POST /auth/logout
   * Logout user and invalidate tokens
   */
  async logout(req: ValidatedRequest & { user: { id: string } }, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      logger.info('User logout attempt', {
        userId,
        ip: req.ip,
      });

      // For this implementation, we'll use refreshToken from request body
      // In a more sophisticated setup, you might track refresh tokens differently
      const refreshToken = req.body?.refreshToken;
      if (refreshToken) {
        await this.logoutUseCase.execute(refreshToken);
      } else {
        // If no refresh token provided, logout from all sessions
        await this.logoutUseCase.executeAllSessions(userId);
      }

      logger.info('User logged out successfully', {
        userId,
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout failed', error instanceof Error ? error : undefined, {
        userId: req.user?.id,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Logout failed',
      });
    }
  }

  /**
   * GET /auth/oauth/:provider
   * Start OAuth flow for provider
   */
  async startOAuth(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const redirectUri = req.query.redirect_uri as string;

      logger.info('OAuth flow start', {
        provider,
        redirectUri,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const result = await this.startOAuthUseCase.execute({
        provider: provider as 'discord' | 'twitch' | 'google' | 'github',
        redirectUri,
      });

      logger.info('OAuth URL generated', {
        provider,
        state: result.state,
      });

      res.status(200).json({
        success: true,
        message: 'OAuth flow initiated',
        data: {
          authUrl: result.authUrl,
          state: result.state,
          provider,
        },
      });
    } catch (error) {
      logger.error('OAuth start failed', error instanceof Error ? error : undefined, {
        provider: req.params.provider,
        ip: req.ip,
      });

      if (error instanceof Error && error.message.includes('Unsupported')) {
        res.status(400).json({
          success: false,
          error: 'UNSUPPORTED_PROVIDER',
          message: 'OAuth provider not supported',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'OAuth initialization failed',
      });
    }
  }

  /**
   * GET /auth/callback/:provider
   * Handle OAuth callback from provider
   */
  async oauthCallback(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const { code, state } = req.query;

      logger.info('OAuth callback received', {
        provider,
        state,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const result = await this.completeOAuthUseCase.execute({
        provider: provider as 'discord' | 'twitch' | 'google' | 'github',
        code: code as string,
        state: state as string,
      });

      logger.info('OAuth authentication completed', {
        userId: result.user.id,
        provider: result.user.authProvider,
        isNewUser: result.isNewUser,
      });

      res.status(200).json({
        success: true,
        message: result.isNewUser ? 'User registered via OAuth' : 'OAuth login successful',
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            nickname: result.user.nickname,
            authProvider: result.user.authProvider,
            isActive: result.user.isActive,
            createdAt: result.user.createdAt,
          },
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
          isNewUser: result.isNewUser,
        },
      });
    } catch (error) {
      logger.error('OAuth callback failed', error instanceof Error ? error : undefined, {
        provider: req.params.provider,
        state: req.query.state,
        ip: req.ip,
      });

      if (error instanceof Error) {
        if (error.message.includes('Invalid state') || error.message.includes('CSRF')) {
          res.status(400).json({
            success: false,
            error: 'INVALID_STATE',
            message: 'Invalid OAuth state parameter',
          });
          return;
        }

        if (error.message.includes('Invalid code') || error.message.includes('authorization')) {
          res.status(400).json({
            success: false,
            error: 'INVALID_AUTHORIZATION_CODE',
            message: 'Invalid authorization code',
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'OAuth authentication failed',
      });
    }
  }
}
