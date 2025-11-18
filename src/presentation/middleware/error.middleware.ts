import { Request, Response, NextFunction } from 'express';
import { logger } from '../../shared/utils/logger.util';

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Unhandled error', error, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  const response: ErrorResponse = {
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };

  if (isDevelopment) {
    response.details = {
      message: error.message,
      stack: error.stack,
    };
  }

  res.status(500).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
};

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log request completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  });

  next();
};
