import { Request, Response, NextFunction } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import { logger } from '@shared/utils/logger.util';

/**
 * CSRF Protection Middleware
 *
 * Utilise csrf-csrf (moderne, non déprécié) pour protéger contre CSRF
 * Double submit cookie pattern avec tokens signés
 *
 * Endpoints protégés :
 * - POST /auth/register
 * - POST /auth/login
 * - POST /auth/logout
 */

const CSRF_SECRET = process.env.CSRF_SECRET || 'superoauth-csrf-secret-change-in-production';

if (process.env.NODE_ENV === 'production' && CSRF_SECRET === 'superoauth-csrf-secret-change-in-production') {
  logger.warn('⚠️ CSRF_SECRET not configured in production! Using default (INSECURE)');
}

// Configuration CSRF
const {
  invalidCsrfTokenError,
  generateCsrfToken: csrfGenerate,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  cookieName: '__Host-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getSessionIdentifier: (req) => {
    // Utiliser l'IP + user agent comme identifiant de session
    // En production, utiliser req.session.id si session management actif
    return `${req.ip || 'unknown'}-${req.headers['user-agent'] || 'unknown'}`;
  },
});

/**
 * Middleware de protection CSRF
 * À appliquer sur les routes sensibles (POST, PUT, DELETE)
 */
export const csrfProtection = doubleCsrfProtection;

/**
 * Génère un token CSRF pour le client
 * Utilisé par l'endpoint GET /csrf-token
 */
export const generateCsrfToken = (req: Request, res: Response): string => {
  return csrfGenerate(req, res);
};

/**
 * Middleware pour injecter le token CSRF dans res.locals
 * Utile pour les templates HTML si nécessaire
 */
export const injectCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    res.locals.csrfToken = csrfGenerate(req, res);
    next();
  } catch (error) {
    logger.error('Failed to inject CSRF token', error instanceof Error ? error : undefined);
    next(error);
  }
};

/**
 * Error handler pour erreurs CSRF
 * Retourne une réponse JSON appropriée
 */
export const csrfErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err === invalidCsrfTokenError) {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid or missing CSRF token',
      },
    });
    return;
  }

  // Autres erreurs
  next(err);
};
