import { TenantTokenService } from '../../../../src/infrastructure/services/tenant-token.service';
import { TenantRepository } from '../../../../src/infrastructure/services/tenant.repository';
import jwt from 'jsonwebtoken';

describe('TenantTokenService', () => {
  let service: TenantTokenService;
  let mockTenantRepository: jest.Mocked<Pick<TenantRepository, 'getJwtSecret'>>;

  const TENANT_SECRET = 'a'.repeat(64); // 64 hex = valid tenant secret
  const FALLBACK_SECRET = 'fallback-secret-for-tests-that-is-long-enough-32chars';

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = FALLBACK_SECRET;
    process.env.JWT_ACCESS_EXPIRATION = '15m';

    mockTenantRepository = {
      getJwtSecret: jest.fn(),
    };

    service = new TenantTokenService(mockTenantRepository as unknown as TenantRepository);
  });

  afterEach(() => {
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_ACCESS_EXPIRATION;
  });

  describe('generateAccessToken', () => {
    it('signs with tenant secret when available', async () => {
      mockTenantRepository.getJwtSecret.mockResolvedValue(TENANT_SECRET);

      const token = await service.generateAccessToken('user-123', 'tenant-abc');
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.userId).toBe('user-123');
      expect(decoded.tenantId).toBe('tenant-abc');
      expect(decoded.type).toBe('access');
      expect(typeof decoded.jti).toBe('string');
    });

    it('falls back to global secret when tenant not found', async () => {
      mockTenantRepository.getJwtSecret.mockResolvedValue(null);

      const token = await service.generateAccessToken('user-123', 'unknown-tenant');
      // Verify with fallback secret — should not throw
      expect(() =>
        jwt.verify(token, FALLBACK_SECRET, { issuer: 'superoauth', audience: 'superoauth-users' })
      ).not.toThrow();
    });

    it('falls back gracefully if repository throws', async () => {
      mockTenantRepository.getJwtSecret.mockRejectedValue(new Error('DB error'));

      const token = await service.generateAccessToken('user-123', 'tenant-abc');
      expect(() =>
        jwt.verify(token, FALLBACK_SECRET, { issuer: 'superoauth', audience: 'superoauth-users' })
      ).not.toThrow();
    });
  });

  describe('verifyAccessToken', () => {
    it('verifies a token signed with tenant secret', async () => {
      mockTenantRepository.getJwtSecret.mockResolvedValue(TENANT_SECRET);

      const token = await service.generateAccessToken('user-456', 'tenant-xyz');
      const result = await service.verifyAccessToken(token, 'tenant-xyz');

      expect(result).not.toBeNull();
      expect(result!.userId).toBe('user-456');
      expect(result!.tenantId).toBe('tenant-xyz');
      expect(result!.jti).toBeTruthy();
    });

    it('returns null for invalid token', async () => {
      mockTenantRepository.getJwtSecret.mockResolvedValue(TENANT_SECRET);
      const result = await service.verifyAccessToken('not.a.valid.token', 'tenant-xyz');
      expect(result).toBeNull();
    });

    it('returns null for token signed with different secret', async () => {
      // Token signed with fallback
      mockTenantRepository.getJwtSecret.mockResolvedValue(null);
      const token = await service.generateAccessToken('user-1', 'tenant-1');

      // Verify with a different tenant secret
      mockTenantRepository.getJwtSecret.mockResolvedValue('b'.repeat(64));
      const result = await service.verifyAccessToken(token, 'tenant-1');
      expect(result).toBeNull();
    });
  });
});
