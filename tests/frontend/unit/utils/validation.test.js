/**
 * Tests unitaires pour utils/validation.js
 * Teste les fonctions de validation d'email, mot de passe, etc.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Validation } from '../../../../public/js/utils/validation.js'

// Mock SharedUtils
vi.mock('../../../../public/js/shared-utils.js', () => ({
  SharedUtils: {
    isValidEmail: (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }
  }
}))

describe('Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Email Validation', () => {
    describe('email() / isEmail()', () => {
      it('should validate correct email addresses', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'first.last@subdomain.example.com',
          'user+tag@example.com',
          'test_123@test-domain.com',
          'a@b.c'
        ]

        validEmails.forEach(email => {
          expect(Validation.email(email)).toBe(true)
          expect(Validation.isEmail(email)).toBe(true)
        })
      })

      it('should reject invalid email addresses', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'user@',
          'user @example.com',
          'user@domain',
          'user@.com',
          '@',
          '',
          'user@@example.com',
          'user@exam ple.com',
          'user.example.com'
        ]

        invalidEmails.forEach(email => {
          expect(Validation.email(email)).toBe(false)
          expect(Validation.isEmail(email)).toBe(false)
        })
      })

      it('should reject emails without TLD', () => {
        expect(Validation.email('user@domain')).toBe(false)
      })

      it('should reject emails with spaces', () => {
        expect(Validation.email('user name@example.com')).toBe(false)
        expect(Validation.email('user@exam ple.com')).toBe(false)
      })

      it('should handle edge cases', () => {
        expect(Validation.email(null)).toBe(false)
        expect(Validation.email(undefined)).toBe(false)
        expect(Validation.email('')).toBe(false)
        expect(Validation.email('   ')).toBe(false)
      })
    })
  })

  describe('Password Validation', () => {
    describe('isPasswordStrong()', () => {
      it('should validate strong passwords', () => {
        const strongPasswords = [
          'Password123!',
          'MyP@ssw0rd',
          'Str0ng!Pass',
          'Test1234@',
          'P@ssW0rd',
          'Abcdef1@',
          'MySecure123!',
          'C0mpl3x@Pass'
        ]

        strongPasswords.forEach(password => {
          expect(Validation.isPasswordStrong(password)).toBe(true)
        })
      })

      it('should reject passwords without uppercase', () => {
        const passwords = [
          'password123!',
          'myp@ssw0rd',
          'test1234@'
        ]

        passwords.forEach(password => {
          expect(Validation.isPasswordStrong(password)).toBe(false)
        })
      })

      it('should reject passwords without lowercase', () => {
        const passwords = [
          'PASSWORD123!',
          'MYP@SSW0RD',
          'TEST1234@'
        ]

        passwords.forEach(password => {
          expect(Validation.isPasswordStrong(password)).toBe(false)
        })
      })

      it('should reject passwords without numbers', () => {
        const passwords = [
          'Password!',
          'MyP@ssword',
          'Test@Pass'
        ]

        passwords.forEach(password => {
          expect(Validation.isPasswordStrong(password)).toBe(false)
        })
      })

      it('should reject passwords without special characters', () => {
        const passwords = [
          'Password123',
          'MyPassw0rd',
          'Test1234Pass'
        ]

        passwords.forEach(password => {
          expect(Validation.isPasswordStrong(password)).toBe(false)
        })
      })

      it('should reject passwords shorter than 8 characters', () => {
        const shortPasswords = [
          'Pass1!',
          'Ab1@',
          'Test1@',
          'Pw1!'
        ]

        shortPasswords.forEach(password => {
          expect(Validation.isPasswordStrong(password)).toBe(false)
        })
      })

      it('should accept exactly 8 characters if strong', () => {
        expect(Validation.isPasswordStrong('Abcd123@')).toBe(true)
      })

      it('should accept long strong passwords', () => {
        const longPassword = 'MyVeryL0ng@SecurePassword123!'
        expect(Validation.isPasswordStrong(longPassword)).toBe(true)
      })

      it('should handle edge cases', () => {
        expect(Validation.isPasswordStrong('')).toBe(false)
        expect(Validation.isPasswordStrong(null)).toBe(false)
        expect(Validation.isPasswordStrong(undefined)).toBe(false)
      })

      it('should accept various special characters', () => {
        const specialChars = ['@', '$', '!', '%', '*', '?', '&']

        specialChars.forEach(char => {
          const password = `Password123${char}`
          expect(Validation.isPasswordStrong(password)).toBe(true)
        })
      })
    })
  })

  describe('Password Matching', () => {
    describe('passwordsMatch()', () => {
      it('should return true for identical non-empty passwords', () => {
        const password = 'MyPassword123!'

        expect(Validation.passwordsMatch(password, password)).toBe(true)
      })

      it('should return false for different passwords', () => {
        expect(Validation.passwordsMatch('Password1', 'Password2')).toBe(false)
        expect(Validation.passwordsMatch('Test123', 'test123')).toBe(false)
      })

      it('should return false for empty strings', () => {
        expect(Validation.passwordsMatch('', '')).toBe(false)
      })

      it('should return false if one password is empty', () => {
        expect(Validation.passwordsMatch('Password123', '')).toBe(false)
        expect(Validation.passwordsMatch('', 'Password123')).toBe(false)
      })

      it('should be case-sensitive', () => {
        expect(Validation.passwordsMatch('Password', 'password')).toBe(false)
        expect(Validation.passwordsMatch('TEST', 'test')).toBe(false)
      })

      it('should handle whitespace differences', () => {
        expect(Validation.passwordsMatch('Password123', ' Password123')).toBe(false)
        expect(Validation.passwordsMatch('Password123', 'Password123 ')).toBe(false)
        expect(Validation.passwordsMatch('Pass word', 'Password')).toBe(false)
      })

      it('should handle special characters correctly', () => {
        const password = 'P@ssw0rd!#$%'
        expect(Validation.passwordsMatch(password, password)).toBe(true)
      })

      it('should handle very long passwords', () => {
        const longPassword = 'a'.repeat(1000)
        expect(Validation.passwordsMatch(longPassword, longPassword)).toBe(true)
      })

      it('should handle edge cases', () => {
        expect(Validation.passwordsMatch(null, null)).toBe(false)
        expect(Validation.passwordsMatch(undefined, undefined)).toBe(false)
        expect(Validation.passwordsMatch('test', null)).toBe(false)
        expect(Validation.passwordsMatch(null, 'test')).toBe(false)
      })
    })
  })

  describe('Integration Tests', () => {
    it('should validate complete registration flow', () => {
      const email = 'newuser@example.com'
      const password = 'SecurePass123!'
      const passwordConfirm = 'SecurePass123!'

      // All validations should pass
      expect(Validation.isEmail(email)).toBe(true)
      expect(Validation.isPasswordStrong(password)).toBe(true)
      expect(Validation.passwordsMatch(password, passwordConfirm)).toBe(true)
    })

    it('should catch mismatched passwords in registration', () => {
      const email = 'user@example.com'
      const password = 'SecurePass123!'
      const passwordConfirm = 'SecurePass456!'

      expect(Validation.isEmail(email)).toBe(true)
      expect(Validation.isPasswordStrong(password)).toBe(true)
      expect(Validation.isPasswordStrong(passwordConfirm)).toBe(true)
      expect(Validation.passwordsMatch(password, passwordConfirm)).toBe(false)
    })

    it('should catch weak password in registration', () => {
      const email = 'user@example.com'
      const password = 'weakpass'
      const passwordConfirm = 'weakpass'

      expect(Validation.isEmail(email)).toBe(true)
      expect(Validation.isPasswordStrong(password)).toBe(false)
      expect(Validation.passwordsMatch(password, passwordConfirm)).toBe(true)
    })

    it('should catch invalid email in registration', () => {
      const email = 'invalid-email'
      const password = 'SecurePass123!'
      const passwordConfirm = 'SecurePass123!'

      expect(Validation.isEmail(email)).toBe(false)
      expect(Validation.isPasswordStrong(password)).toBe(true)
      expect(Validation.passwordsMatch(password, passwordConfirm)).toBe(true)
    })
  })
})
