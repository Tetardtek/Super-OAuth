import { TenantCryptoService } from '../../../../src/infrastructure/services/tenant-crypto.service';

const VALID_KEY = 'a'.repeat(64); // 64 hex chars = valid test key

describe('TenantCryptoService', () => {
  let service: TenantCryptoService;

  beforeEach(() => {
    process.env.TENANT_ENCRYPTION_KEY = VALID_KEY;
    service = new TenantCryptoService();
  });

  afterEach(() => {
    delete process.env.TENANT_ENCRYPTION_KEY;
  });

  describe('constructor', () => {
    it('throws if TENANT_ENCRYPTION_KEY is missing', () => {
      delete process.env.TENANT_ENCRYPTION_KEY;
      expect(() => new TenantCryptoService()).toThrow('TENANT_ENCRYPTION_KEY is required');
    });

    it('throws if TENANT_ENCRYPTION_KEY is wrong length', () => {
      process.env.TENANT_ENCRYPTION_KEY = 'short';
      expect(() => new TenantCryptoService()).toThrow('64 hex characters');
    });

    it('throws if TENANT_ENCRYPTION_KEY contains non-hex chars', () => {
      process.env.TENANT_ENCRYPTION_KEY = 'z'.repeat(64);
      expect(() => new TenantCryptoService()).toThrow('64 hex characters');
    });

    it('constructs successfully with valid key', () => {
      expect(() => new TenantCryptoService()).not.toThrow();
    });
  });

  describe('hashClientSecret / verifyClientSecret', () => {
    it('produces consistent hash for same secret + salt', () => {
      const salt = service.generateSalt();
      const hash1 = service.hashClientSecret('my-secret', salt);
      const hash2 = service.hashClientSecret('my-secret', salt);
      expect(hash1).toBe(hash2);
    });

    it('verifies matching secret correctly', () => {
      const salt = service.generateSalt();
      const hash = service.hashClientSecret('correct-secret', salt);
      expect(service.verifyClientSecret('correct-secret', salt, hash)).toBe(true);
    });

    it('rejects wrong secret', () => {
      const salt = service.generateSalt();
      const hash = service.hashClientSecret('correct-secret', salt);
      expect(service.verifyClientSecret('wrong-secret', salt, hash)).toBe(false);
    });

    it('rejects correct secret with wrong salt', () => {
      const salt1 = service.generateSalt();
      const salt2 = service.generateSalt();
      const hash = service.hashClientSecret('secret', salt1);
      expect(service.verifyClientSecret('secret', salt2, hash)).toBe(false);
    });

    it('different salts produce different hashes for same secret', () => {
      const salt1 = service.generateSalt();
      const salt2 = service.generateSalt();
      expect(service.hashClientSecret('secret', salt1)).not.toBe(
        service.hashClientSecret('secret', salt2)
      );
    });
  });

  describe('encryptValue / decryptValue', () => {
    it('round-trip: encrypt then decrypt returns original', () => {
      const plain = 'my-provider-secret-abc123';
      const { encrypted, iv } = service.encryptValue(plain);
      expect(service.decryptValue(encrypted, iv)).toBe(plain);
    });

    it('produces different ciphertext each time (random IV)', () => {
      const plain = 'same-value';
      const result1 = service.encryptValue(plain);
      const result2 = service.encryptValue(plain);
      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.encrypted).not.toBe(result2.encrypted);
    });

    it('throws on tampered ciphertext', () => {
      const { encrypted, iv } = service.encryptValue('sensitive');
      const tampered = encrypted.slice(0, -4) + 'dead'; // corrupt last bytes
      expect(() => service.decryptValue(tampered, iv)).toThrow();
    });

    it('throws on tampered IV', () => {
      const { encrypted, iv } = service.encryptValue('sensitive');
      const tamperedIv = '0'.repeat(iv.length);
      expect(() => service.decryptValue(encrypted, tamperedIv)).toThrow();
    });

    it('throws on malformed encrypted format', () => {
      expect(() => service.decryptValue('notavalidformat', '0'.repeat(32))).toThrow(
        'Invalid encrypted format'
      );
    });

    it('encrypts JWT secret (32 bytes hex = 64 chars)', () => {
      const jwtSecret = 'a'.repeat(64); // simulated 32-byte hex secret
      const { encrypted, iv } = service.encryptValue(jwtSecret);
      expect(service.decryptValue(encrypted, iv)).toBe(jwtSecret);
    });
  });

  describe('generateSalt', () => {
    it('generates 64-char hex string (32 bytes)', () => {
      const salt = service.generateSalt();
      expect(salt).toHaveLength(64);
      expect(salt).toMatch(/^[0-9a-f]{64}$/);
    });

    it('generates unique salts', () => {
      expect(service.generateSalt()).not.toBe(service.generateSalt());
    });
  });
});
