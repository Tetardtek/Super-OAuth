import { Request, Response, NextFunction } from 'express';
import { createAuthenticateTenant } from '../../../../src/presentation/middleware/authenticate-tenant.middleware';
import { TenantRepository } from '../../../../src/infrastructure/services/tenant.repository';

describe('authenticateTenant middleware', () => {
  let mockTenantRepository: jest.Mocked<Pick<TenantRepository, 'verifyCredentials'>>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockTenantRepository = {
      verifyCredentials: jest.fn(),
    };

    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('returns 401 when headers are missing', async () => {
    const middleware = createAuthenticateTenant(mockTenantRepository as unknown as TenantRepository);
    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when client_id is missing', async () => {
    req.headers = { 'x-client-secret': 'some-secret' };
    const middleware = createAuthenticateTenant(mockTenantRepository as unknown as TenantRepository);
    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when credentials are invalid', async () => {
    req.headers = { 'x-client-id': 'bad-id', 'x-client-secret': 'bad-secret' };
    mockTenantRepository.verifyCredentials.mockResolvedValue(null);

    const middleware = createAuthenticateTenant(mockTenantRepository as unknown as TenantRepository);
    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid tenant credentials' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('injects tenantId and calls next on valid credentials', async () => {
    const tenantId = 'tenant-uuid-123';
    req.headers = { 'x-client-id': 'valid-id', 'x-client-secret': 'valid-secret' };
    mockTenantRepository.verifyCredentials.mockResolvedValue(tenantId);

    const middleware = createAuthenticateTenant(mockTenantRepository as unknown as TenantRepository);
    await middleware(req as Request, res as Response, next);

    expect((req as Request & { tenantId: string }).tenantId).toBe(tenantId);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes clientId to verifyCredentials', async () => {
    req.headers = { 'x-client-id': 'my-client-id', 'x-client-secret': 'my-secret' };
    mockTenantRepository.verifyCredentials.mockResolvedValue('tenant-id');

    const middleware = createAuthenticateTenant(mockTenantRepository as unknown as TenantRepository);
    await middleware(req as Request, res as Response, next);

    expect(mockTenantRepository.verifyCredentials).toHaveBeenCalledWith('my-client-id', 'my-secret');
  });
});
