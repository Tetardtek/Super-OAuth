/**
 * Tests unitaires pour utils/format.js
 * Teste les fonctions de formatage
 */

import { describe, it, expect, vi } from 'vitest'
import { Format } from '../../../../public/js/utils/format.js'

// Mock SharedUtils
vi.mock('../../../../public/js/shared-utils.js', () => ({
  SharedUtils: {
    formatDate: (date) => new Date(date).toLocaleDateString('fr-FR'),
    formatDateTime: (date) => new Date(date).toLocaleString('fr-FR')
  }
}))

describe('Format', () => {
  describe('date()', () => {
    it('should format date correctly', () => {
      const testDate = new Date('2025-07-22T10:30:00.000Z')

      const formatted = Format.date(testDate)

      expect(formatted).toBeDefined()
      expect(typeof formatted).toBe('string')
    })

    it('should handle string date input', () => {
      const dateString = '2025-07-22'

      const formatted = Format.date(dateString)

      expect(formatted).toBeDefined()
    })
  })

  describe('datetime()', () => {
    it('should format datetime correctly', () => {
      const testDate = new Date('2025-07-22T15:45:30.000Z')

      const formatted = Format.datetime(testDate)

      expect(formatted).toBeDefined()
      expect(typeof formatted).toBe('string')
    })
  })

  describe('capitalize()', () => {
    it('should capitalize first letter', () => {
      expect(Format.capitalize('hello')).toBe('Hello')
    })

    it('should handle already capitalized string', () => {
      expect(Format.capitalize('Hello')).toBe('Hello')
    })

    it('should handle all caps', () => {
      expect(Format.capitalize('HELLO')).toBe('Hello')
    })

    it('should handle empty string', () => {
      expect(Format.capitalize('')).toBe('')
    })

    it('should handle single character', () => {
      expect(Format.capitalize('a')).toBe('A')
    })

    it('should handle non-string input', () => {
      expect(Format.capitalize(null)).toBe('')
      expect(Format.capitalize(undefined)).toBe('')
    })
  })

  describe('avatarLetter()', () => {
    it('should return first letter uppercase', () => {
      expect(Format.avatarLetter('john')).toBe('J')
    })

    it('should handle already uppercase', () => {
      expect(Format.avatarLetter('John')).toBe('J')
    })

    it('should return U for empty string', () => {
      expect(Format.avatarLetter('')).toBe('U')
    })

    it('should return U for null', () => {
      expect(Format.avatarLetter(null)).toBe('U')
    })

    it('should handle special characters', () => {
      expect(Format.avatarLetter('@user')).toBe('@')
    })
  })
})
