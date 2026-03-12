// mockRateLimitOptions est préfixé `mock` → accessible dans la factory jest.mock (hoisting safe)
let mockRateLimitOptions: Record<string, unknown> = {};

jest.mock('express-rate-limit', () =>
  jest.fn().mockImplementation((options: Record<string, unknown>) => {
    mockRateLimitOptions = options;
    return jest.fn((_req: unknown, _res: unknown, next: () => void) => next());
  })
);

jest.mock('rate-limit-redis', () => jest.fn().mockImplementation(() => ({})));

jest.mock('../../../../src/infrastructure/redis/redis-client', () => ({
  redisClientSingleton: {
    getClient: jest.fn().mockResolvedValue({ sendCommand: jest.fn() }),
  },
}));

jest.mock('../../../../src/shared/utils/logger.util', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { Request, Response, NextFunction } from 'express';
import {
  apiRateLimit,
  authRateLimit,
  rateLimitHeaders,
} from '../../../../src/presentation/middleware/rate-limit.middleware';
import { logger } from '../../../../src/shared/utils/logger.util';

function makeReq(overrides: Partial<Request> = {}): Partial<Request> {
  return { ip: '127.0.0.1', path: '/api/data', method: 'GET', ...overrides };
}

function makeRes(): Partial<Response> {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('rateLimitHeaders', () => {
  it('should call next() immediately — placeholder middleware', () => {
    const next = jest.fn() as NextFunction;
    rateLimitHeaders(makeReq() as Request, makeRes() as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('apiRateLimit — lazy init + 429 handler', () => {
  it('should initialize the rate limiter on first call and pass through', async () => {
    const next = jest.fn();
    await apiRateLimit(makeReq() as Request, makeRes() as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it('should respond 429 with RATE_LIMIT_EXCEEDED when the limit is exceeded', async () => {
    // Déclenche l'init pour capturer les options (handler inclus)
    await apiRateLimit(makeReq() as Request, makeRes() as Response, jest.fn());

    const handler = mockRateLimitOptions.handler as (req: Request, res: Response) => void;
    expect(handler).toBeDefined();

    const req = makeReq({ ip: '1.2.3.4', path: '/api/data' }) as Request;
    const res = makeRes() as Response;

    handler(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: expect.stringContaining('Too many'),
      },
    });
  });

  it('should log a warning when the limit is exceeded', async () => {
    await apiRateLimit(makeReq() as Request, makeRes() as Response, jest.fn());

    const handler = mockRateLimitOptions.handler as (req: Request, res: Response) => void;
    handler(makeReq({ ip: '9.9.9.9', path: '/api/data' }) as Request, makeRes() as Response);

    expect(logger.warn).toHaveBeenCalledWith(
      'Rate limit exceeded',
      expect.objectContaining({ ip: '9.9.9.9' })
    );
  });
});

describe('authRateLimit — configuration', () => {
  it('should initialize and pass through on first call', async () => {
    const next = jest.fn();
    await authRateLimit(makeReq() as Request, makeRes() as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it('should use skipSuccessfulRequests=true to count only failed attempts', async () => {
    await authRateLimit(makeReq() as Request, makeRes() as Response, jest.fn());
    // skipSuccessfulRequests=true est la protection anti-brute-force :
    // les logins réussis ne consomment pas le quota, seulement les échecs.
    expect(mockRateLimitOptions.skipSuccessfulRequests).toBe(true);
  });
});
