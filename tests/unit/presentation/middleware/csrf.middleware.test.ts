// Les variables préfixées `mock` peuvent être référencées dans les factories jest.mock
// (exception à la règle de hoisting — documentée dans Jest).
const mockInvalidCsrfError = new Error('invalid csrf token');
const mockGenerateCsrfToken = jest.fn().mockReturnValue('mock-csrf-token-abc');

jest.mock('csrf-csrf', () => ({
  doubleCsrf: jest.fn(() => ({
    invalidCsrfTokenError: mockInvalidCsrfError,
    generateCsrfToken: mockGenerateCsrfToken,
    doubleCsrfProtection: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
  })),
}));

jest.mock('@shared/utils/logger.util', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { Request, Response, NextFunction } from 'express';
import { csrfErrorHandler, injectCsrfToken } from '../../../../src/presentation/middleware/csrf.middleware';
import { logger } from '@shared/utils/logger.util';

function makeReq(overrides: Partial<Request> = {}): Partial<Request> {
  return { ip: '127.0.0.1', path: '/auth/login', method: 'POST', headers: {}, ...overrides };
}

function makeRes(): Partial<Response> {
  const res: Partial<Response> = { locals: {} };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('csrfErrorHandler', () => {
  it('should respond 403 with CSRF_TOKEN_INVALID for the CSRF error', () => {
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    csrfErrorHandler(
      mockInvalidCsrfError,
      req as Request,
      res as Response,
      next as NextFunction
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid or missing CSRF token',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should log a warning for CSRF errors', () => {
    const req = makeReq({ ip: '10.0.0.1', path: '/auth/register', method: 'POST' });
    const res = makeRes();

    csrfErrorHandler(mockInvalidCsrfError, req as Request, res as Response, jest.fn());

    expect(logger.warn).toHaveBeenCalledWith(
      'CSRF token validation failed',
      expect.objectContaining({ ip: '10.0.0.1', path: '/auth/register' })
    );
  });

  it('should call next(err) for non-CSRF errors', () => {
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();
    const otherError = new Error('something else');

    csrfErrorHandler(otherError, req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(otherError);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('injectCsrfToken', () => {
  it('should set res.locals.csrfToken and call next()', () => {
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    injectCsrfToken(req as Request, res as Response, next);

    expect(res.locals!.csrfToken).toBe('mock-csrf-token-abc');
    expect(next).toHaveBeenCalledWith(); // next() sans argument = pas d'erreur
  });

  it('should call next(error) if token generation throws', () => {
    const genError = new Error('token generation failed');
    mockGenerateCsrfToken.mockImplementationOnce(() => { throw genError; });

    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    injectCsrfToken(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(genError);
  });
});
