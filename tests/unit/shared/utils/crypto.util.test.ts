import { CryptoUtil } from '@shared/utils/crypto.util';

describe('CryptoUtil', () => {
  describe('generateRandomString', () => {
    it('should generate random string of default length (32 bytes = 64 chars)', () => {
      const result = CryptoUtil.generateRandomString();
      expect(result).toHaveLength(64); // 32 bytes * 2 (hex)
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate random string of custom length', () => {
      const result = CryptoUtil.generateRandomString(16);
      expect(result).toHaveLength(32); // 16 bytes * 2 (hex)
    });

    it('should generate different strings on each call', () => {
      const str1 = CryptoUtil.generateRandomString();
      const str2 = CryptoUtil.generateRandomString();
      expect(str1).not.toBe(str2);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID v4', () => {
      const uuid = CryptoUtil.generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = CryptoUtil.generateUUID();
      const uuid2 = CryptoUtil.generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('hash', () => {
    it('should hash data with SHA-256 by default', () => {
      const data = 'test data';
      const hashed = CryptoUtil.hash(data);
      expect(hashed).toHaveLength(64); // SHA-256 = 32 bytes = 64 hex chars
      expect(hashed).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce consistent hashes for same input', () => {
      const data = 'test data';
      const hash1 = CryptoUtil.hash(data);
      const hash2 = CryptoUtil.hash(data);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = CryptoUtil.hash('data1');
      const hash2 = CryptoUtil.hash('data2');
      expect(hash1).not.toBe(hash2);
    });

    it('should support different algorithms', () => {
      const data = 'test data';
      const sha256 = CryptoUtil.hash(data, 'sha256');
      const sha512 = CryptoUtil.hash(data, 'sha512');
      expect(sha256).toHaveLength(64);
      expect(sha512).toHaveLength(128); // SHA-512 = 64 bytes
    });
  });

  describe('generateKey', () => {
    it('should generate 32 bytes key (64 hex chars)', () => {
      const key = CryptoUtil.generateKey();
      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique keys', () => {
      const key1 = CryptoUtil.generateKey();
      const key2 = CryptoUtil.generateKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('encrypt and decrypt', () => {
    const testKey = CryptoUtil.generateKey();

    it('should encrypt and decrypt text correctly (round-trip)', () => {
      const original = 'Secret message that needs encryption';
      const encrypted = CryptoUtil.encrypt(original, testKey);
      const decrypted = CryptoUtil.decrypt(encrypted, testKey);

      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertext on each encryption (random IV)', () => {
      const original = 'Same message';
      const encrypted1 = CryptoUtil.encrypt(original, testKey);
      const encrypted2 = CryptoUtil.encrypt(original, testKey);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
      expect(CryptoUtil.decrypt(encrypted1, testKey)).toBe(original);
      expect(CryptoUtil.decrypt(encrypted2, testKey)).toBe(original);
    });

    it('should encrypt with correct format (iv:authTag:encrypted)', () => {
      const original = 'Test';
      const encrypted = CryptoUtil.encrypt(original, testKey);
      const parts = encrypted.split(':');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toMatch(/^[0-9a-f]{32}$/); // IV = 16 bytes = 32 hex
      expect(parts[1]).toMatch(/^[0-9a-f]{32}$/); // Auth tag = 16 bytes = 32 hex
      expect(parts[2]).toMatch(/^[0-9a-f]+$/); // Encrypted data (variable length)
    });

    it('should fail decryption with wrong key', () => {
      const original = 'Secret';
      const encrypted = CryptoUtil.encrypt(original, testKey);
      const wrongKey = CryptoUtil.generateKey();

      expect(() => {
        CryptoUtil.decrypt(encrypted, wrongKey);
      }).toThrow();
    });

    it('should detect tampering (modified ciphertext)', () => {
      const original = 'Secret';
      const encrypted = CryptoUtil.encrypt(original, testKey);

      // Tamper with last character
      const tampered = encrypted.slice(0, -1) + '0';

      expect(() => {
        CryptoUtil.decrypt(tampered, testKey);
      }).toThrow();
    });

    it('should detect tampering (modified auth tag)', () => {
      const original = 'Secret';
      const encrypted = CryptoUtil.encrypt(original, testKey);
      const parts = encrypted.split(':');

      // Tamper with auth tag
      const tamperedAuthTag = parts[1].slice(0, -1) + '0';
      const tampered = [parts[0], tamperedAuthTag, parts[2]].join(':');

      expect(() => {
        CryptoUtil.decrypt(tampered, testKey);
      }).toThrow();
    });

    it('should throw error for invalid format', () => {
      expect(() => {
        CryptoUtil.decrypt('invalid-format', testKey);
      }).toThrow('Invalid encrypted text format');

      expect(() => {
        CryptoUtil.decrypt('only:two', testKey);
      }).toThrow('Invalid encrypted text format');
    });

    it('should handle empty string', () => {
      const encrypted = CryptoUtil.encrypt('', testKey);
      const decrypted = CryptoUtil.decrypt(encrypted, testKey);
      expect(decrypted).toBe('');
    });

    it('should handle long text', () => {
      const original = 'A'.repeat(10000); // 10KB
      const encrypted = CryptoUtil.encrypt(original, testKey);
      const decrypted = CryptoUtil.decrypt(encrypted, testKey);
      expect(decrypted).toBe(original);
    });

    it('should handle special characters and unicode', () => {
      const original = 'Héllo 世界 🔒 \n\t\r Special: !@#$%^&*()';
      const encrypted = CryptoUtil.encrypt(original, testKey);
      const decrypted = CryptoUtil.decrypt(encrypted, testKey);
      expect(decrypted).toBe(original);
    });

    it('should work with string key (automatic derivation)', () => {
      const stringKey = 'my-secret-passphrase';
      const original = 'Test message';

      const encrypted = CryptoUtil.encrypt(original, stringKey);
      const decrypted = CryptoUtil.decrypt(encrypted, stringKey);

      expect(decrypted).toBe(original);
    });

    it('should work with 64-char hex key (direct use)', () => {
      const hexKey = '0'.repeat(64); // Valid 64-char hex
      const original = 'Test message';

      const encrypted = CryptoUtil.encrypt(original, hexKey);
      const decrypted = CryptoUtil.decrypt(encrypted, hexKey);

      expect(decrypted).toBe(original);
    });
  });

  describe('generateSalt', () => {
    it('should generate salt of default size (12 bytes = 24 hex chars)', () => {
      const salt = CryptoUtil.generateSalt();
      expect(salt).toHaveLength(24);
      expect(salt).toMatch(/^[0-9a-f]{24}$/);
    });

    it('should generate salt of custom size', () => {
      const salt = CryptoUtil.generateSalt(16);
      expect(salt).toHaveLength(32); // 16 bytes * 2
    });

    it('should generate unique salts', () => {
      const salt1 = CryptoUtil.generateSalt();
      const salt2 = CryptoUtil.generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('createHmac and verifyHmac', () => {
    const secret = 'my-secret-key';

    it('should create HMAC signature', () => {
      const data = 'important data';
      const signature = CryptoUtil.createHmac(data, secret);

      expect(signature).toHaveLength(64); // SHA-256 = 64 hex chars
      expect(signature).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should create consistent signatures', () => {
      const data = 'data';
      const sig1 = CryptoUtil.createHmac(data, secret);
      const sig2 = CryptoUtil.createHmac(data, secret);
      expect(sig1).toBe(sig2);
    });

    it('should verify valid HMAC', () => {
      const data = 'important data';
      const signature = CryptoUtil.createHmac(data, secret);
      const isValid = CryptoUtil.verifyHmac(data, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC (wrong signature)', () => {
      const data = 'important data';
      const signature = CryptoUtil.createHmac(data, secret);
      const wrongSignature = signature.slice(0, -2) + '00';

      const isValid = CryptoUtil.verifyHmac(data, wrongSignature, secret);
      expect(isValid).toBe(false);
    });

    it('should reject HMAC with wrong secret', () => {
      const data = 'important data';
      const signature = CryptoUtil.createHmac(data, secret);

      const isValid = CryptoUtil.verifyHmac(data, signature, 'wrong-secret');
      expect(isValid).toBe(false);
    });

    it('should reject HMAC with tampered data', () => {
      const data = 'important data';
      const signature = CryptoUtil.createHmac(data, secret);

      const isValid = CryptoUtil.verifyHmac('tampered data', signature, secret);
      expect(isValid).toBe(false);
    });

    it('should support different HMAC algorithms', () => {
      const data = 'data';
      const sha256Sig = CryptoUtil.createHmac(data, secret, 'sha256');
      const sha512Sig = CryptoUtil.createHmac(data, secret, 'sha512');

      expect(sha256Sig).toHaveLength(64);
      expect(sha512Sig).toHaveLength(128);

      expect(CryptoUtil.verifyHmac(data, sha256Sig, secret, 'sha256')).toBe(true);
      expect(CryptoUtil.verifyHmac(data, sha512Sig, secret, 'sha512')).toBe(true);
    });
  });
});
