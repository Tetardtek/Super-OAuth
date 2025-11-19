/**
 * SuperOAuth - Main Application Entry Point
 *
 * This file is the entry point of the SuperOAuth application.
 * It initializes the Express server with all necessary middleware,
 * routes, and error handling following Clean Architecture principles.
 *
 * Architecture Overview:
 * - Presentation Layer: Controllers, Routes, Middleware
 * - Application Layer: Use Cases, Services
 * - Domain Layer: Entities, Value Objects, Business Rules
 * - Infrastructure Layer: Database, OAuth Providers, External Services
 *
 * Server Initialization Flow:
 * 1. Load environment variables from .env file
 * 2. Set up security middleware (Helmet, CORS)
 * 3. Configure rate limiting and request logging
 * 4. Register API routes
 * 5. Set up error handling
 * 6. Validate environment configuration
 * 7. Initialize database connection
 * 8. Start HTTP server
 * 9. Set up graceful shutdown handlers
 *
 * @module main
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { DatabaseConnection } from './infrastructure/database/config/database.config';
import { getAppConfig, EnvironmentValidator } from './shared/config';
import { logger } from './shared/utils/logger.util';
import { authRoutes, oauthRoutes } from './presentation/routes';
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  apiRateLimit,
} from './presentation/middleware';
import { PROJECT_INFO, ENDPOINT_STATUS } from './shared/constants/project-info';

/**
 * SuperOAuth Server Class
 *
 * Main server class that encapsulates Express application setup and lifecycle.
 * Implements dependency injection and follows SOLID principles.
 */
class SuperOAuthServer {
  private app: express.Application;
  private readonly config = getAppConfig();

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Configure security, parsing, and utility middleware
   *
   * Middleware execution order is critical for security and functionality:
   * 1. Security headers (Helmet, CORS)
   * 2. Rate limiting (DDoS protection)
   * 3. Request logging
   * 4. Static file serving
   * 5. Body parsing
   * 6. Session management
   */
  private setupMiddleware(): void {
    // Security middleware - Helmet sets various HTTP headers for security
    // Content Security Policy (CSP) prevents XSS attacks
    // See: https://helmetjs.github.io/
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"], // Only load resources from same origin
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (needed for frontend)
            scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts (needed for frontend)
            imgSrc: ["'self'", 'data:', 'https:'], // Allow images from self, data URIs, and HTTPS
          },
        },
      })
    );

    // CORS (Cross-Origin Resource Sharing) configuration
    // Allows requests from specified origins with credentials
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true, // Allow cookies and authentication headers
      })
    );

    // Rate limiting middleware - Protection against DDoS and brute force attacks
    // Applied to all /api/* routes
    this.app.use('/api/', apiRateLimit);

    // Request logging middleware - Logs all incoming HTTP requests
    // Useful for debugging and security monitoring
    this.app.use(requestLogger);

    // Static files middleware - Serves frontend assets (HTML, CSS, JS)
    // Files from /public directory are accessible at root path
    this.app.use(express.static(path.join(__dirname, '..', 'public')));

    // Body parsing middleware - Parses JSON and URL-encoded request bodies
    // Limit set to 10mb to prevent memory exhaustion attacks
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Simple session middleware for OAuth state management
    // Stores temporary OAuth state tokens to prevent CSRF attacks
    this.app.use((req: express.Request, _res, next) => {
      // Extend Request with session property (temporary OAuth state storage)
      (req as express.Request & { session?: Record<string, unknown> }).session =
        (req as express.Request & { session?: Record<string, unknown> }).session || {};
      next();
    });
  }

  /**
   * Configure application routes
   *
   * Routes are organized by feature:
   * - Static HTML pages (/, /docs)
   * - Health check endpoint (/health)
   * - Authentication API (/api/v1/auth/*)
   * - OAuth API (/api/v1/oauth/*)
   * - 404 handler (catch-all)
   */
  private setupRoutes(): void {
    // Serve the main page - Landing page with login/register options
    this.app.get('/', (_req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    // API Documentation page - Interactive API documentation
    this.app.get('/docs', (_req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'docs.html'));
    });

    // Health check endpoint - Used by load balancers and monitoring systems
    // Returns server status, version, and environment information
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: this.config.appVersion,
        environment: this.config.nodeEnv,
        message: 'SuperOAuth API is running',
      });
    });

    // API routes - RESTful endpoints for authentication and OAuth
    // Authentication routes: register, login, refresh, logout
    this.app.use('/api/v1/auth', authRoutes);

    // OAuth routes (separate from auth routes to avoid conflicts)
    // Handles OAuth flows: start, callback, link, unlink
    this.app.use('/api/v1/oauth', oauthRoutes);

    // API status endpoint
    this.app.get('/api/v1', (_req, res) => {
      res.json({
        message: `${PROJECT_INFO.name} API ${PROJECT_INFO.apiVersion}.0.0`,
        status: 'ready',
        phase: PROJECT_INFO.currentPhase,
        nextPhase: PROJECT_INFO.nextPhase,
        endpoints: {
          health: '/health',
          docs: '/docs',
          auth: {
            auth: ENDPOINT_STATUS.auth,
            oauth: ENDPOINT_STATUS.oauth,
          },
          user: ENDPOINT_STATUS.user,
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
        logger.warn('Database connection failed (running without DB for demo)', {
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
        });
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
          phase: PROJECT_INFO.currentPhase,
          nextPhase: PROJECT_INFO.nextPhase,
        });
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
          void DatabaseConnection.close()
            .catch(() => {
              logger.debug('Database was not connected');
            })
            .finally(() => {
              process.exit(0);
            });
        });
      });

      process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully');
        server.close(() => {
          void DatabaseConnection.close()
            .catch(() => {
              logger.debug('Database was not connected');
            })
            .finally(() => {
              process.exit(0);
            });
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
