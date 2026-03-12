import { PasswordService } from '../../../../src/infrastructure/services/password.service';

// Rounds minimum pour que les tests restent rapides sans sacrifier la logique réelle.
// bcrypt à 10 rounds ≈ 100ms par hash — acceptable en test, sécurisé en prod (12).
const ORIGINAL_BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS;

beforeAll(() => { process.env.BCRYPT_ROUNDS = '10'; });
afterAll(() => {
  if (ORIGINAL_BCRYPT_ROUNDS !== undefined) {
    process.env.BCRYPT_ROUNDS = ORIGINAL_BCRYPT_ROUNDS;
  } else {
    delete process.env.BCRYPT_ROUNDS;
  }
});

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  describe('constructor', () => {
    it('should accept valid salt rounds (10–15)', () => {
      expect(() => new PasswordService()).not.toThrow();
    });

    it('should throw if BCRYPT_ROUNDS is below 10', () => {
      process.env.BCRYPT_ROUNDS = '9';
      expect(() => new PasswordService()).toThrow('BCRYPT_ROUNDS must be between 10 and 15');
      process.env.BCRYPT_ROUNDS = '10';
    });

    it('should throw if BCRYPT_ROUNDS is above 15', () => {
      process.env.BCRYPT_ROUNDS = '16';
      expect(() => new PasswordService()).toThrow('BCRYPT_ROUNDS must be between 10 and 15');
      process.env.BCRYPT_ROUNDS = '10';
    });
  });

  describe('hash()', () => {
    it('should return a bcrypt hash (not plaintext)', async () => {
      const hash = await service.hash('MyPassword1!');

      expect(hash).not.toBe('MyPassword1!');
      expect(hash).toMatch(/^\$2[aby]\$\d+\$/); // format bcrypt
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should produce a different hash on each call (random salt)', async () => {
      const [h1, h2] = await Promise.all([
        service.hash('SamePassword1!'),
        service.hash('SamePassword1!'),
      ]);

      expect(h1).not.toBe(h2);
    });

    it('should throw for an empty password', async () => {
      await expect(service.hash('')).rejects.toThrow('Password must be a non-empty string');
    });
  });

  describe('verify()', () => {
    it('should return true for the correct password', async () => {
      const hash = await service.hash('Correct1!');
      expect(await service.verify('Correct1!', hash)).toBe(true);
    });

    it('should return false for a wrong password', async () => {
      const hash = await service.hash('Correct1!');
      expect(await service.verify('Wrong1!', hash)).toBe(false);
    });

    it('should return false when password is empty', async () => {
      const hash = await service.hash('SomePassword1!');
      expect(await service.verify('', hash)).toBe(false);
    });

    it('should return false when hash is empty', async () => {
      expect(await service.verify('SomePassword1!', '')).toBe(false);
    });

    it('should return false (not throw) for a malformed hash', async () => {
      // Sécurité : une exception ici révèlerait de l'information. On absorbe silencieusement.
      expect(await service.verify('password', 'not-a-valid-hash')).toBe(false);
    });
  });
});
