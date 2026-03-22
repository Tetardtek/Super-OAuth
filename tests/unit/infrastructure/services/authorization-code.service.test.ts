import crypto from 'crypto';

/**
 * Tests for AuthorizationCodeService — PKCE flow core security
 *
 * Tests the authorization code lifecycle:
 *   - Creation (hashed storage, TTL)
 *   - Exchange (PKCE S256 validation, use-once, redirect_uri match, expiry)
 *   - Replay attack detection
 */

// Mock Redis
const mockRedisClient = {
  setEx: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
};
jest.mock('../../../../src/infrastructure/redis/redis-client', () => ({
  redisClientSingleton: {
    getClient: jest.fn().mockResolvedValue(mockRedisClient),
  },
}));

// Mock DatabaseConnection + Repository
const mockSave = jest.fn().mockImplementation((entity: unknown) => Promise.resolve(entity));
const mockFindOne = jest.fn().mockResolvedValue(null);
const mockDelete = jest.fn().mockResolvedValue({ affected: 1 });
const mockCreateQueryBuilder = jest.fn().mockReturnValue({
  delete: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnValue({
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    }),
  }),
});
const mockCreate = jest.fn().mockImplementation((data: unknown) => data);

jest.mock('../../../../src/infrastructure/database/config/database.config', () => ({
  DatabaseConnection: {
    getInstance: jest.fn().mockReturnValue({
      getRepository: jest.fn().mockReturnValue({
        save: mockSave,
        findOne: mockFindOne,
        delete: mockDelete,
        create: mockCreate,
        createQueryBuilder: mockCreateQueryBuilder,
      }),
    }),
  },
}));

// Mock logger
jest.mock('../../../../src/shared/utils/logger.util', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { AuthorizationCodeService } from '../../../../src/infrastructure/services/authorization-code.service';

describe('AuthorizationCodeService', () => {
  let service: AuthorizationCodeService;

  const validCodeData = {
    tenantId: 'test-tenant-id',
    userId: 'test-user-id',
    provider: 'discord',
    redirectUri: 'https://app.example.com/callback',
    codeChallenge: '', // set per test
    codeChallengeMethod: 'S256',
  };

  // Generate a valid PKCE pair
  function generatePkcePair(): { verifier: string; challenge: string } {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
    return { verifier, challenge };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthorizationCodeService();
  });

  describe('create', () => {
    it('should generate an authorization code and return raw code', async () => {
      const pkce = generatePkcePair();
      const data = { ...validCodeData, codeChallenge: pkce.challenge };

      const result = await service.create(data);

      expect(result.code).toBeTruthy();
      expect(result.code).toHaveLength(64); // 32 bytes hex
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should store the hash of the code, not the raw code', async () => {
      const pkce = generatePkcePair();
      const data = { ...validCodeData, codeChallenge: pkce.challenge };

      const result = await service.create(data);

      // The raw code should NOT be what's saved
      const savedEntity = mockCreate.mock.calls[0][0];
      expect(savedEntity.code).not.toBe(result.code);

      // The saved code should be the SHA-256 hash of the raw code
      const expectedHash = crypto.createHash('sha256').update(result.code).digest('hex');
      expect(savedEntity.code).toBe(expectedHash);
    });

    it('should store in Redis for fast lookup', async () => {
      const pkce = generatePkcePair();
      const data = { ...validCodeData, codeChallenge: pkce.challenge };

      await service.create(data);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        expect.stringContaining('oauth:authcode:'),
        300, // 5 minutes
        expect.any(String)
      );
    });
  });

  describe('exchange', () => {
    it('should validate PKCE S256 verifier and return code data', async () => {
      const pkce = generatePkcePair();
      const rawCode = crypto.randomBytes(32).toString('hex');
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

      mockFindOne.mockResolvedValueOnce({
        code: codeHash,
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        provider: 'discord',
        redirectUri: 'https://app.example.com/callback',
        codeChallenge: pkce.challenge,
        codeChallengeMethod: 'S256',
        scope: null,
        expiresAt: new Date(Date.now() + 300000), // 5 min from now
        usedAt: null,
      });

      const result = await service.exchange(
        rawCode,
        'https://app.example.com/callback',
        pkce.verifier
      );

      expect(result).not.toBeNull();
      expect(result!.tenantId).toBe('test-tenant-id');
      expect(result!.userId).toBe('test-user-id');
      expect(result!.provider).toBe('discord');
    });

    it('should reject invalid PKCE verifier', async () => {
      const pkce = generatePkcePair();
      const rawCode = crypto.randomBytes(32).toString('hex');
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

      mockFindOne.mockResolvedValueOnce({
        code: codeHash,
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        provider: 'discord',
        redirectUri: 'https://app.example.com/callback',
        codeChallenge: pkce.challenge,
        codeChallengeMethod: 'S256',
        expiresAt: new Date(Date.now() + 300000),
        usedAt: null,
      });

      const result = await service.exchange(
        rawCode,
        'https://app.example.com/callback',
        'wrong-verifier'
      );

      expect(result).toBeNull();
    });

    it('should reject expired codes', async () => {
      const pkce = generatePkcePair();
      const rawCode = crypto.randomBytes(32).toString('hex');
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

      mockFindOne.mockResolvedValueOnce({
        code: codeHash,
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        provider: 'discord',
        redirectUri: 'https://app.example.com/callback',
        codeChallenge: pkce.challenge,
        codeChallengeMethod: 'S256',
        expiresAt: new Date(Date.now() - 1000), // expired
        usedAt: null,
      });

      const result = await service.exchange(
        rawCode,
        'https://app.example.com/callback',
        pkce.verifier
      );

      expect(result).toBeNull();
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should reject already-used codes (replay attack)', async () => {
      const pkce = generatePkcePair();
      const rawCode = crypto.randomBytes(32).toString('hex');
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

      mockFindOne.mockResolvedValueOnce({
        code: codeHash,
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        provider: 'discord',
        redirectUri: 'https://app.example.com/callback',
        codeChallenge: pkce.challenge,
        codeChallengeMethod: 'S256',
        expiresAt: new Date(Date.now() + 300000),
        usedAt: new Date(), // already used!
      });

      const result = await service.exchange(
        rawCode,
        'https://app.example.com/callback',
        pkce.verifier
      );

      expect(result).toBeNull();
      // Should delete the code on replay attempt
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should reject mismatched redirect_uri', async () => {
      const pkce = generatePkcePair();
      const rawCode = crypto.randomBytes(32).toString('hex');
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

      mockFindOne.mockResolvedValueOnce({
        code: codeHash,
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        provider: 'discord',
        redirectUri: 'https://app.example.com/callback',
        codeChallenge: pkce.challenge,
        codeChallengeMethod: 'S256',
        expiresAt: new Date(Date.now() + 300000),
        usedAt: null,
      });

      const result = await service.exchange(
        rawCode,
        'https://evil.example.com/callback', // different redirect_uri
        pkce.verifier
      );

      expect(result).toBeNull();
    });

    it('should reject non-existent codes', async () => {
      mockFindOne.mockResolvedValueOnce(null);

      const result = await service.exchange(
        'non-existent-code',
        'https://app.example.com/callback',
        'some-verifier'
      );

      expect(result).toBeNull();
    });

    it('should mark code as used after successful exchange', async () => {
      const pkce = generatePkcePair();
      const rawCode = crypto.randomBytes(32).toString('hex');
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

      const entity = {
        code: codeHash,
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        provider: 'discord',
        redirectUri: 'https://app.example.com/callback',
        codeChallenge: pkce.challenge,
        codeChallengeMethod: 'S256',
        scope: null,
        expiresAt: new Date(Date.now() + 300000),
        usedAt: null,
      };

      mockFindOne.mockResolvedValueOnce(entity);

      await service.exchange(
        rawCode,
        'https://app.example.com/callback',
        pkce.verifier
      );

      // usedAt should have been set
      expect(entity.usedAt).toBeInstanceOf(Date);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('PKCE plain method', () => {
    it('should support plain code_challenge_method', async () => {
      const verifier = crypto.randomBytes(32).toString('base64url');
      const rawCode = crypto.randomBytes(32).toString('hex');
      const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

      mockFindOne.mockResolvedValueOnce({
        code: codeHash,
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        provider: 'discord',
        redirectUri: 'https://app.example.com/callback',
        codeChallenge: verifier, // plain = challenge equals verifier
        codeChallengeMethod: 'plain',
        expiresAt: new Date(Date.now() + 300000),
        usedAt: null,
      });

      const result = await service.exchange(
        rawCode,
        'https://app.example.com/callback',
        verifier
      );

      expect(result).not.toBeNull();
    });
  });
});
