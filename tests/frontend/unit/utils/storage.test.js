/**
 * Tests unitaires pour utils/storage.js
 * Teste la gestion du localStorage pour l'application
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Storage } from '../../../../public/js/utils/storage.js'

// Mock STORAGE_KEYS depuis config.js
vi.mock('../../../../public/js/config.js', () => ({
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER_AVATAR: 'userAvatar',
    USER_PREFERENCES: 'userPreferences'
  }
}))

describe('Storage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Basic Operations', () => {
    it('should store and retrieve a value', () => {
      const key = 'testKey'
      const value = 'testValue'

      Storage.set(key, value)
      const retrieved = Storage.get(key)

      expect(retrieved).toBe(value)
    })

    it('should return null for non-existent key', () => {
      const result = Storage.get('nonExistentKey')

      expect(result).toBeNull()
    })

    it('should remove a value', () => {
      const key = 'testKey'
      const value = 'testValue'

      Storage.set(key, value)
      Storage.remove(key)
      const retrieved = Storage.get(key)

      expect(retrieved).toBeNull()
    })

    it('should handle empty string values', () => {
      const key = 'emptyKey'
      const value = ''

      Storage.set(key, value)
      const retrieved = Storage.get(key)

      expect(retrieved).toBe(value)
    })

    it('should handle numeric values as strings', () => {
      const key = 'numKey'
      const value = '12345'

      Storage.set(key, value)
      const retrieved = Storage.get(key)

      expect(retrieved).toBe(value)
    })
  })

  describe('Clear Operations', () => {
    it('should clear all STORAGE_KEYS values', () => {
      // Setup: add multiple items
      Storage.set('accessToken', 'token1')
      Storage.set('refreshToken', 'token2')
      Storage.set('userAvatar', 'avatar.png')
      Storage.set('otherKey', 'shouldStay')

      // Clear only STORAGE_KEYS
      Storage.clear()

      // STORAGE_KEYS should be removed
      expect(Storage.get('accessToken')).toBeNull()
      expect(Storage.get('refreshToken')).toBeNull()
      expect(Storage.get('userAvatar')).toBeNull()

      // Other keys might still exist (depends on implementation)
      // This test verifies that clear() targets STORAGE_KEYS
    })
  })

  describe('Token Management', () => {
    describe('getAccessToken', () => {
      it('should retrieve access token', () => {
        const token = 'mock-access-token-123'
        Storage.set('accessToken', token)

        const retrieved = Storage.getAccessToken()

        expect(retrieved).toBe(token)
      })

      it('should return null if no access token', () => {
        const retrieved = Storage.getAccessToken()

        expect(retrieved).toBeNull()
      })
    })

    describe('getRefreshToken', () => {
      it('should retrieve refresh token', () => {
        const token = 'mock-refresh-token-456'
        Storage.set('refreshToken', token)

        const retrieved = Storage.getRefreshToken()

        expect(retrieved).toBe(token)
      })

      it('should return null if no refresh token', () => {
        const retrieved = Storage.getRefreshToken()

        expect(retrieved).toBeNull()
      })
    })

    describe('setTokens', () => {
      it('should store both access and refresh tokens', () => {
        const accessToken = 'access-token-abc'
        const refreshToken = 'refresh-token-xyz'

        Storage.setTokens(accessToken, refreshToken)

        expect(Storage.getAccessToken()).toBe(accessToken)
        expect(Storage.getRefreshToken()).toBe(refreshToken)
      })

      it('should store access token even if refresh is missing', () => {
        const accessToken = 'access-only-token'

        Storage.setTokens(accessToken, null)

        expect(Storage.getAccessToken()).toBe(accessToken)
        expect(Storage.getRefreshToken()).toBeNull()
      })
    })

    describe('clearTokens', () => {
      it('should remove both access and refresh tokens', () => {
        // Setup
        Storage.setTokens('access-token', 'refresh-token')

        // Clear
        Storage.clearTokens()

        // Verify
        expect(Storage.getAccessToken()).toBeNull()
        expect(Storage.getRefreshToken()).toBeNull()
      })

      it('should handle clearing when no tokens exist', () => {
        // Should not throw error
        expect(() => Storage.clearTokens()).not.toThrow()

        expect(Storage.getAccessToken()).toBeNull()
        expect(Storage.getRefreshToken()).toBeNull()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined values gracefully', () => {
      const key = 'undefinedKey'

      Storage.set(key, undefined)
      const retrieved = Storage.get(key)

      // localStorage converts undefined to string "undefined"
      expect(retrieved).toBe('undefined')
    })

    it('should handle null values gracefully', () => {
      const key = 'nullKey'

      Storage.set(key, null)
      const retrieved = Storage.get(key)

      // localStorage converts null to string "null"
      expect(retrieved).toBe('null')
    })

    it('should handle special characters in keys', () => {
      const key = 'key-with-special_chars.123'
      const value = 'specialValue'

      Storage.set(key, value)
      const retrieved = Storage.get(key)

      expect(retrieved).toBe(value)
    })

    it('should handle very long values', () => {
      const key = 'longValueKey'
      const value = 'x'.repeat(10000)

      Storage.set(key, value)
      const retrieved = Storage.get(key)

      expect(retrieved).toBe(value)
      expect(retrieved.length).toBe(10000)
    })

    it('should handle JSON-like strings', () => {
      const key = 'jsonKey'
      const value = '{"name":"test","value":123}'

      Storage.set(key, value)
      const retrieved = Storage.get(key)

      expect(retrieved).toBe(value)
      // Verify it's still a string
      expect(typeof retrieved).toBe('string')
    })
  })

  describe('Multiple Operations', () => {
    it('should handle multiple concurrent operations', () => {
      const data = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3'
      }

      // Set multiple values
      Object.entries(data).forEach(([key, value]) => {
        Storage.set(key, value)
      })

      // Verify all values
      Object.entries(data).forEach(([key, value]) => {
        expect(Storage.get(key)).toBe(value)
      })
    })

    it('should overwrite existing values', () => {
      const key = 'overwriteKey'

      Storage.set(key, 'oldValue')
      Storage.set(key, 'newValue')

      expect(Storage.get(key)).toBe('newValue')
    })
  })
})
