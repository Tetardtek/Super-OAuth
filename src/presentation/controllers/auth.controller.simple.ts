import { Request, Response } from 'express';
import { DIContainer } from '../../infrastructure/di/container';
import { logger } from '../../shared/utils/logger.util';

interface ValidatedRequest extends Request {
  validatedBody?: Record<string, unknown>;
  validatedParams?: Record<string, unknown>;
  validatedQuery?: Record<string, unknown>;
  user?: { id: string };
}

export class AuthController {
  private container: DIContainer;

  constructor() {
    this.container = DIContainer.getInstance();
  }

  /**
   * POST /auth/register
   */
  async register(req: ValidatedRequest, res: Response): Promise<void> {
    try {
      const { email, password, nickname } = req.validatedBody || req.body;

      logger.info('User registration attempt', {
        email,
        nickname,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const registerUseCase = this.container.getRegisterClassicUseCase();
      const result = await registerUseCase.execute({
        email,
        password,
        nickname,
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Registration failed', error as Error, {
        email: req.validatedBody?.email || req.body?.email,
        ip: req.ip,
      });

      if (errorMessage.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'USER_EXISTS',
          message: 'User with this email already exists',
        });
        return;
      }

      if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: errorMessage,
        });
        return;
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
   */
  async login(req: ValidatedRequest, res: Response): Promise<void> {
    try {
      const { email, password } = req.validatedBody || req.body;

      logger.info('User login attempt', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const loginUseCase = this.container.getLoginClassicUseCase();
      const result = await loginUseCase.execute({
        email,
        password,
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Login failed', error instanceof Error ? error : undefined, {
        email: req.validatedBody?.email || req.body?.email,
        ip: req.ip,
      });

      if (
        errorMessage.includes('Invalid credentials') ||
        errorMessage.includes('User not found') ||
        errorMessage.includes('Invalid password')
      ) {
        void res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        });
        return;
      }

      if (errorMessage.includes('inactive') || errorMessage.includes('disabled')) {
        res.status(403).json({
          success: false,
          error: 'ACCOUNT_DISABLED',
          message: 'Account is disabled',
        });
        return;
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
   */
  async refreshToken(req: ValidatedRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.validatedBody || req.body;

      logger.info('Token refresh attempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const refreshUseCase = this.container.getRefreshTokenUseCase();
      const result = await refreshUseCase.execute({
        refreshToken,
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Token refresh failed', error instanceof Error ? error : undefined, {
        ip: req.ip,
      });

      if (
        errorMessage.includes('Invalid') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('not found')
      ) {
        res.status(401).json({
          success: false,
          error: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        });
        return;
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
   */
  async logout(req: ValidatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
        return;
      }

      logger.info('User logout attempt', {
        userId,
        ip: req.ip,
      });

      const logoutUseCase = this.container.getLogoutUseCase();
      const refreshToken = req.body?.refreshToken;

      if (refreshToken) {
        await logoutUseCase.execute(refreshToken);
      } else {
        await logoutUseCase.executeAllSessions(userId);
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

      const startOAuthUseCase = this.container.getStartOAuthUseCase();
      const result = await startOAuthUseCase.execute({
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('OAuth start failed', error instanceof Error ? error : undefined, {
        provider: req.params.provider,
        ip: req.ip,
      });

      if (errorMessage.includes('Unsupported')) {
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

      const completeOAuthUseCase = this.container.getCompleteOAuthUseCase();
      const result = await completeOAuthUseCase.execute({
        provider: provider as 'discord' | 'twitch' | 'google' | 'github',
        code: code as string,
        state: state as string,
      });

      // Note: We'll need to determine if this is a new user based on the result
      // For now, we'll assume the result includes this information
      const isNewUser = false; // This should come from the use case

      logger.info('OAuth authentication completed', {
        userId: result.user.id,
        isNewUser,
      });

      res.status(200).json({
        success: true,
        message: isNewUser ? 'User registered via OAuth' : 'OAuth login successful',
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
          isNewUser,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('OAuth callback failed', error instanceof Error ? error : undefined, {
        provider: req.params.provider,
        state: req.query.state,
        ip: req.ip,
      });

      if (errorMessage.includes('Invalid state') || errorMessage.includes('CSRF')) {
        res.status(400).json({
          success: false,
          error: 'INVALID_STATE',
          message: 'Invalid OAuth state parameter',
        });
        return;
      }

      if (errorMessage.includes('Invalid code') || errorMessage.includes('authorization')) {
        res.status(400).json({
          success: false,
          error: 'INVALID_AUTHORIZATION_CODE',
          message: 'Invalid authorization code',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'OAuth authentication failed',
      });
    }
  }
}
