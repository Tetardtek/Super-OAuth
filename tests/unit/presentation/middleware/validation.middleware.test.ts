import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { validateBody, validateParams, validateQuery } from '../../../../src/presentation/middleware/validation.middleware';
import { logger } from '../../../../src/shared/utils/logger.util';

// Mock logger
jest.mock('../../../../src/shared/utils/logger.util', () => ({
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Validation Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    req = {
      body: {},
      params: {},
      query: {},
      path: '/api/test',
      method: 'POST',
      ip: '127.0.0.1',
    };

    res = {
      status: statusMock,
      json: jsonMock,
    };

    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateBody', () => {
    const testSchema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      nickname: Joi.string().optional(),
    });

    it('should validate valid request body and call next()', () => {
      // Arrange
      req.body = {
        email: 'test@example.com',
        password: 'Test123!@#',
        nickname: 'testuser',
      };

      const middleware = validateBody(testSchema);

      // Act
      middleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
      expect((req as Request & { validatedBody: unknown }).validatedBody).toEqual({
        email: 'test@example.com',
        password: 'Test123!@#',
        nickname: 'testuser',
      });
    });

    it('should return 400 if email is missing', () => {
      // Arrange
      req.body = {
        password: 'Test123!@#',
      };

      const middleware = validateBody(testSchema);

      // Act
      middleware(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('required'),
          }),
        ]),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if email format is invalid', () => {
      // Arrange
      req.body = {
        email: 'invalid-email',
        password: 'Test123!@#',
      };

      const middleware = validateBody(testSchema);

      // Act
      middleware(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: expect.stringContaining('valid email'),
          }),
        ]),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if password is too short', () => {
      // Arrange
      req.body = {
        email: 'test@example.com',
        password: 'short',
      };

      const middleware = validateBody(testSchema);

      // Act
      middleware(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: expect.stringContaining('8'),
          }),
        ]),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should strip unknown fields', () => {
      // Arrange
      req.body = {
        email: 'test@example.com',
        password: 'Test123!@#',
        unknownField: 'should be removed',
      };

      const middleware = validateBody(testSchema);

      // Act
      middleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      const validatedBody = (req as Request & { validatedBody: Record<string, unknown> }).validatedBody;
      expect(validatedBody).not.toHaveProperty('unknownField');
    });

    it('should log validation errors', () => {
      // Arrange
      req.body = {
        email: 'invalid-email',
        password: 'short',
      };

      const middleware = validateBody(testSchema);

      // Act
      middleware(req as Request, res as Response, next);

      // Assert
      expect(logger.warn).toHaveBeenCalledWith(
        'Validation failed for request body',
        expect.objectContaining({
          path: '/api/test',
          method: 'POST',
          ip: '127.0.0.1',
          errors: expect.any(Array),
        })
      );
    });
  });

  describe('validateParams', () => {
    const testSchema = Joi.object({
      id: Joi.string().uuid().required(),
    });

    it('should validate valid request params and call next()', () => {
      // Arrange
      req.params = {
        id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const middleware = validateParams(testSchema);

      // Act
      middleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 400 if param is missing', () => {
      // Arrange
      req.params = {};

      const middleware = validateParams(testSchema);

      // Act
      middleware(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Parameter validation failed',
        details: expect.any(Array),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if UUID format is invalid', () => {
      // Arrange
      req.params = {
        id: 'not-a-uuid',
      };

      const middleware = validateParams(testSchema);

      // Act
      middleware(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Parameter validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'id',
            message: expect.stringContaining('valid GUID'),
          }),
        ]),
      });
    });
  });

  describe('validateQuery', () => {
    const testSchema = Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      search: Joi.string().optional(),
    });

    it('should validate valid query params and call next()', () => {
      // Arrange
      req.query = {
        page: '1',
        limit: '10',
        search: 'test',
      };

      const middleware = validateQuery(testSchema);

      // Act
      middleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should return 400 if query param type is invalid', () => {
      // Arrange
      req.query = {
        page: 'not-a-number',
      };

      const middleware = validateQuery(testSchema);

      // Act
      middleware(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Query validation failed',
        details: expect.any(Array),
      });
    });

    it('should return 400 if query param exceeds max value', () => {
      // Arrange
      req.query = {
        limit: '200', // Max is 100
      };

      const middleware = validateQuery(testSchema);

      // Act
      middleware(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Query validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'limit',
            message: expect.stringContaining('100'),
          }),
        ]),
      });
    });
  });
});
