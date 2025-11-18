import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../../shared/utils/logger.util';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidatedRequest<T = any> extends Request {
  validatedBody: T;
  validatedParams?: any;
  validatedQuery?: any;
}

/**
 * Middleware to validate request body against Joi schema
 */
export const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.warn('Validation failed for request body', {
        path: req.path,
        method: req.method,
        errors: validationErrors,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: validationErrors,
      });
      return;
    }

    // Attach validated data to request
    (req as ValidatedRequest).validatedBody = value;
    next();
  };
};

/**
 * Middleware to validate request parameters against Joi schema
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.warn('Validation failed for request parameters', {
        path: req.path,
        method: req.method,
        errors: validationErrors,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Parameter validation failed',
        details: validationErrors,
      });
      return;
    }

    (req as ValidatedRequest).validatedParams = value;
    next();
  };
};

/**
 * Middleware to validate request query parameters against Joi schema
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const validationErrors: ValidationError[] = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.warn('Validation failed for request query', {
        path: req.path,
        method: req.method,
        errors: validationErrors,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Query validation failed',
        details: validationErrors,
      });
      return;
    }

    (req as ValidatedRequest).validatedQuery = value;
    next();
  };
};
