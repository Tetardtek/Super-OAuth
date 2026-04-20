import { PlatformUser } from '../../../src/domain/entities/platform-user.entity';
import { Email } from '../../../src/domain/value-objects/email.vo';
import { Password } from '../../../src/domain/value-objects/password.vo';

describe('PlatformUser (domain entity)', () => {
  const validEmail = () => Email.create('owner@example.com');
  const validPassword = () => Password.create('StrongPass1!');

  describe('create()', () => {
    it('builds a client with email_verified=false and a hashed password', () => {
      const user = PlatformUser.create('u-1', validEmail(), validPassword());

      expect(user.id).toBe('u-1');
      expect(user.role).toBe('client');
      expect(user.emailVerified).toBe(false);
      expect(user.lastLoginAt).toBeNull();
      expect(user.getPasswordHash()).not.toBeNull();
      expect(user.getPasswordHash()).not.toBe('StrongPass1!');
    });

    it('normalizes email to lowercase via the Email value object', () => {
      const user = PlatformUser.create('u-1', Email.create('MixedCase@Example.COM'), validPassword());
      expect(user.email.toString()).toBe('mixedcase@example.com');
    });
  });

  describe('reconstruct()', () => {
    it('restores state from persistence without re-hashing the password', () => {
      const existingHash = '$2b$12$abcdefghij';
      const user = PlatformUser.reconstruct(
        'u-2',
        'admin@example.com',
        existingHash,
        'suadmin',
        true,
        new Date('2026-01-01'),
        new Date('2025-12-01'),
        new Date('2026-01-02')
      );

      expect(user.getPasswordHash()).toBe(existingHash);
      expect(user.role).toBe('suadmin');
      expect(user.emailVerified).toBe(true);
      expect(user.isSuAdmin()).toBe(true);
    });

    it('accepts null password hash (seed user must reset)', () => {
      const user = PlatformUser.reconstruct(
        'u-3',
        'seed@example.com',
        null,
        'suadmin',
        true,
        null,
        new Date(),
        new Date()
      );
      expect(user.getPasswordHash()).toBeNull();
      expect(user.requiresPasswordReset()).toBe(true);
    });
  });

  describe('verifyEmail()', () => {
    it('sets emailVerified to true', () => {
      const user = PlatformUser.create('u-1', validEmail(), validPassword());
      expect(user.emailVerified).toBe(false);
      user.verifyEmail();
      expect(user.emailVerified).toBe(true);
    });
  });

  describe('updatePassword()', () => {
    it('replaces the password hash', () => {
      const user = PlatformUser.create('u-1', validEmail(), validPassword());
      const originalHash = user.getPasswordHash();

      user.updatePassword(Password.create('NewStrongPass2@'));

      expect(user.getPasswordHash()).not.toBe(originalHash);
      expect(user.getPasswordHash()).not.toBeNull();
    });
  });

  describe('verifyPassword()', () => {
    it('returns true for the correct plaintext', () => {
      const user = PlatformUser.create('u-1', validEmail(), Password.create('MyPass1word!'));
      expect(user.verifyPassword('MyPass1word!')).toBe(true);
    });

    it('returns false for an incorrect plaintext', () => {
      const user = PlatformUser.create('u-1', validEmail(), Password.create('MyPass1word!'));
      expect(user.verifyPassword('WrongPass1!')).toBe(false);
    });

    it('returns false when the user has no password set', () => {
      const user = PlatformUser.reconstruct(
        'u-3',
        'seed@example.com',
        null,
        'suadmin',
        true,
        null,
        new Date(),
        new Date()
      );
      expect(user.verifyPassword('anything')).toBe(false);
    });
  });

  describe('recordLogin()', () => {
    it('stamps lastLoginAt with a fresh Date', () => {
      const user = PlatformUser.create('u-1', validEmail(), validPassword());
      expect(user.lastLoginAt).toBeNull();

      user.recordLogin();
      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('requiresPasswordReset() / isSuAdmin()', () => {
    it('requiresPasswordReset is false when password is set', () => {
      const user = PlatformUser.create('u-1', validEmail(), validPassword());
      expect(user.requiresPasswordReset()).toBe(false);
    });

    it('isSuAdmin is false for default client role', () => {
      const user = PlatformUser.create('u-1', validEmail(), validPassword());
      expect(user.isSuAdmin()).toBe(false);
    });
  });
});
