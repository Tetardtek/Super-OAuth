import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { DatabaseConnection } from './infrastructure/database/config/database.config';
import { getAppConfig, EnvironmentValidator } from './shared/config';
import { logger } from './shared/utils/logger.util';
import { authRoutes, oauthRoutes } from './presentation/routes';
import { errorHandler, notFoundHandler, requestLogger, apiRateLimit } from './presentation/middleware';

class SuperOAuthServer {
  private app: express.Application;
  private readonly config = getAppConfig();

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    this.app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    }));

    // Rate limiting
    this.app.use('/api/', apiRateLimit);

    // Request logging
    this.app.use(requestLogger);

    // Static files middleware
    this.app.use(express.static(path.join(__dirname, '..', 'public')));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Simple session middleware for OAuth state management
    this.app.use((req: any, _res, next) => {
      req.session = req.session || {};
      next();
    });
  }

  private setupRoutes(): void {
    // Serve the main page
    this.app.get('/', (_req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    // API Documentation page
    this.app.get('/docs', (_req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'docs.html'));
    });

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: this.config.appVersion,
        environment: this.config.nodeEnv,
        message: 'SuperOAuth API is running',
      });
    });

    // API routes
    this.app.use('/api/v1/auth', authRoutes);
    // OAuth routes (separate from auth routes to avoid conflicts)
    this.app.use('/api/v1/oauth', oauthRoutes);

    // API status endpoint
    this.app.get('/api/v1', (_req, res) => {
      res.json({
        message: 'SuperOAuth API v1.0.0',
        status: 'ready',
        phase: 'Phase 5 in progress - API Controllers (REST)',
        nextPhase: 'Phase 6 - Testing & Documentation',
        endpoints: {
          health: '/health',
          docs: '/docs',
          auth: {
            auth: {
          register: 'POST /api/v1/auth/register ✅',
          login: 'POST /api/v1/auth/login ✅',
          refresh: 'POST /api/v1/auth/refresh ✅',
          logout: 'POST /api/v1/auth/logout ✅',
          me: 'GET /api/v1/auth/me ✅',
        },
        oauth: {
          providers: 'GET /api/v1/oauth/providers ✅',
          start: 'GET /api/v1/oauth/{provider} ✅',
          callback: 'GET /api/v1/oauth/{provider}/callback ✅',
          linked: 'GET /api/v1/oauth/linked ✅',
          unlink: 'DELETE /api/v1/oauth/{provider}/unlink ✅',
        },
          },
          user: {
            profile: 'GET /api/v1/user/profile (Phase 6)',
            accounts: 'GET /api/v1/user/linked-accounts (Phase 6)',
          },
        },
      });
    });

    // 404 handler
    this.app.use('*', notFoundHandler);
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  async start(): Promise<void> {
    try {
      // Validate environment variables first
      EnvironmentValidator.validate();

      // Try to initialize database connection (optional for demo)
      try {
        await DatabaseConnection.initialize();
        logger.info('Database connected successfully');
      } catch (dbError) {
        logger.warn('Database connection failed (running without DB for demo)', dbError as Error);
        logger.info('Configure MySQL to enable full functionality');
      }

      // Start HTTP server
      const server = this.app.listen(this.config.port, () => {
        logger.info('SuperOAuth server started', {
          port: this.config.port,
          environment: this.config.nodeEnv,
          webInterface: `http://localhost:${this.config.port}`,
          healthCheck: `http://localhost:${this.config.port}/health`,
          apiBase: `http://localhost:${this.config.port}${this.config.apiBasePath}`,
          phase: 'Phase 4.2.B.1 OAuth Integration - COMPLETE ✅',
          nextPhase: 'Phase 4.3 - Web Documentation'
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(async () => {
          try {
            await DatabaseConnection.close();
          } catch (error) {
            logger.debug('Database was not connected');
          }
          process.exit(0);
        });
      });

      process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down gracefully');
        server.close(async () => {
          try {
            await DatabaseConnection.close();
          } catch (error) {
            logger.debug('Database was not connected');
          }
          process.exit(0);
        });
      });

    } catch (error) {
      logger.error('Failed to start server', error as Error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new SuperOAuthServer();
server.start().catch((error) => {
  logger.error('Server startup failed', error);
  process.exit(1);
});
