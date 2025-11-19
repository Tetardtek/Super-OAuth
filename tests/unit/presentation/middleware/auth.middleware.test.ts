import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, optionalAuth, AuthenticatedUser } from '../../../../src/presentation/middleware/auth.middleware';
import { getSecurityConfig } from '../../../../src/shared/config/security.config';
import { DIContainer } from '../../../../src/infrastructure/di/container';
import type { IUserRepository } from '../../../../src/application/interfaces/repositories.interface';
import { User } from '../../../../src/domain/entities';
import { Email } from '../../../../src/domain/value-objects/email.vo';
import { Nickname } from '../../../../src/domain/value-objects/nickname.vo';
import { Password } from '../../../../src/domain/value-objects/password.vo';

// Mock dependencies
jest.mock('../../../../src/shared/config/security.config');
jest.mock('../../../../src/shared/utils/logger.util', () => ({
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));
jest.mock('../../../../src/infrastructure/di/container');
jest.mock('jsonwebtoken');

describe('authenticateToken Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockUser: User;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    // Setup request and response mocks
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    req = {
      headers: {},
      path: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
    };

    res = {
      status: statusMock,
      json: jsonMock,
    };

    next = jest.fn();

    // Mock security config
    (getSecurityConfig as jest.Mock).mockReturnValue({
      jwt: {
        accessTokenSecret: 'test-secret',
        refreshTokenSecret: 'test-refresh-secret',
      },
    });

    // Mock user repository
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByProvider: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    // Mock DI Container
    (DIContainer.getInstance as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue(mockUserRepository),
    });

    // Create mock user
    const email = Email.create('test@example.com');
    const nickname = Nickname.create('testuser');
    const password = Password.create('Test123!@#');
    mockUser = User.createWithEmail('user-id-123', email, nickname, password);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should authenticate valid token and attach user to request', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer valid-token';

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-id-123',
        type: 'access',
        email: 'test@example.com',
        nickname: 'testuser',
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-id-123');
      expect(next).toHaveBeenCalled();
      expect((req as Request & { user: AuthenticatedUser }).user).toEqual({
        id: 'user-id-123',
        email: 'test@example.com',
        nickname: 'testuser',
        isActive: true,
      });
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should call next() without errors for valid authenticated user', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer valid-token';

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-id-123',
        type: 'access',
      });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('Error Cases - Missing Token', () => {
    it('should return 401 if no authorization header', async () => {
      // Arrange
      req.headers = {};

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Access token is required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header has no Bearer token', async () => {
      // Arrange
      req.headers!.authorization = 'Basic credentials';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid access token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header is "Bearer " (no token)', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer ';

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Error Cases - Invalid Token', () => {
    it('should return 401 if token has wrong type (refresh instead of access)', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer refresh-token';

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-id-123',
        type: 'refresh', // Wrong type
      });

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid token type',
      });
      expect(next).not.toHaveBeenCalled();
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should return 401 if token verification fails (JsonWebTokenError)', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid access token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token has expired (TokenExpiredError)', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer expired-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Access token has expired',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Error Cases - User Validation', () => {
    it('should return 401 if user not found in database', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer valid-token';

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'non-existent-user',
        type: 'access',
      });

      mockUserRepository.findById.mockResolvedValue(null);

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid access token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if user account is inactive', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer valid-token';

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-id-123',
        type: 'access',
      });

      // Deactivate user
      mockUser.deactivate('Account suspended');
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid access token',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Error Cases - Server Errors', () => {
    it('should return 500 if unexpected error occurs', async () => {
      // Arrange
      req.headers!.authorization = 'Bearer valid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      // Act
      await authenticateToken(req as Request, res as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('optionalAuth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    req = {
      headers: {},
      path: '/api/public',
      method: 'GET',
      ip: '127.0.0.1',
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();

    (getSecurityConfig as jest.Mock).mockReturnValue({
      jwt: {
        accessTokenSecret: 'test-secret',
        refreshTokenSecret: 'test-refresh-secret',
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should call next() without error if no token provided', () => {
      // Arrange
      req.headers = {};

      // Act
      optionalAuth(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect((req as Request & { user?: AuthenticatedUser }).user).toBeUndefined();
    });

    it('should attach user to request if valid token provided', () => {
      // Arrange
      req.headers!.authorization = 'Bearer valid-token';

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-id-123',
        type: 'access',
        email: 'test@example.com',
        nickname: 'testuser',
        isActive: true,
      });

      // Act
      optionalAuth(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect((req as Request & { user: AuthenticatedUser }).user).toEqual({
        id: 'user-id-123',
        email: 'test@example.com',
        nickname: 'testuser',
        isActive: true,
      });
    });

    it('should continue without attaching user if token is invalid', () => {
      // Arrange
      req.headers!.authorization = 'Bearer invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      // Act
      optionalAuth(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect((req as Request & { user?: AuthenticatedUser }).user).toBeUndefined();
    });

    it('should not attach user if token type is not access', () => {
      // Arrange
      req.headers!.authorization = 'Bearer refresh-token';

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-id-123',
        type: 'refresh',
      });

      // Act
      optionalAuth(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect((req as Request & { user?: AuthenticatedUser }).user).toBeUndefined();
    });
  });
});
