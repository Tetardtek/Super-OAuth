import { UserId } from '../../src/domain/value-objects/user-id';
import { Email } from '../../src/domain/value-objects/email.vo';
import { Password } from '../../src/domain/value-objects/password.vo';
import { Nickname } from '../../src/domain/value-objects/nickname.vo';
import { ValidationError } from '../../src/domain/errors/domain-error';

describe('Domain Value Objects Tests', () => {
  describe('UserId', () => {
    test('should generate valid UUID', () => {
      const userId = UserId.generate();
      expect(userId.getValue()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should accept valid UUID', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'; // UUID v4 format
      const userId = new UserId(validUuid);
      expect(userId.getValue()).toBe(validUuid);
    });

    test('should reject invalid UUID', () => {
      expect(() => new UserId('invalid-uuid')).toThrow(ValidationError);
    });

    test('should handle equality correctly', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'; // UUID v4 format
      const userId1 = new UserId(uuid);
      const userId2 = new UserId(uuid);
      expect(userId1.equals(userId2)).toBe(true);
    });
  });

  describe('Email', () => {
    test('should accept valid email', () => {
      const email = Email.create('test@example.com');
      expect(email.toString()).toBe('test@example.com');
    });

    test('should reject invalid email', () => {
      expect(() => Email.create('invalid-email')).toThrow();
    });

    test('should normalize email to lowercase', () => {
      const email = Email.create('TEST@EXAMPLE.COM');
      expect(email.toString()).toBe('test@example.com');
    });

    test('should handle domain extraction', () => {
      const email = Email.create('user@example.com');
      expect(email.domain).toBe('example.com');
    });
  });

  describe('Password', () => {
    test('should create password and generate hash', () => {
      const password = Password.create('MyS3cur3P@ssw0rd!');
      const hash = password.hash();
      expect(hash).not.toBe('MyS3cur3P@ssw0rd!');
      expect(hash.length).toBeGreaterThan(50); // bcrypt hash length
    });

    test('should verify correct password', () => {
      const password = Password.create('MyS3cur3P@ssw0rd!');
      const hash = password.hash();
      const isValid = Password.verify('MyS3cur3P@ssw0rd!', hash);
      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', () => {
      const password = Password.create('MyS3cur3P@ssw0rd!');
      const hash = password.hash();
      const isValid = Password.verify('WrongPassword', hash);
      expect(isValid).toBe(false);
    });

    test('should reject weak password', () => {
      expect(() => Password.create('weak')).toThrow();
    });
  });

  describe('Nickname', () => {
    test('should accept valid nickname', () => {
      const nickname = Nickname.create('validUser123');
      expect(nickname.toString()).toBe('validUser123');
    });

    test('should reject empty nickname', () => {
      expect(() => Nickname.create('')).toThrow();
    });

    test('should reject nickname with special characters', () => {
      expect(() => Nickname.create('user@#$')).toThrow();
    });

    test('should reject nickname too long', () => {
      const longNickname = 'a'.repeat(33); // Max is 32
      expect(() => Nickname.create(longNickname)).toThrow();
    });
  });
});
