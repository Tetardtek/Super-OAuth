/**
 * Tests unitaires pour managers/token-manager.js
 * Teste la gestion des tokens JWT et des informations utilisateur
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TokenManager, tokenManager } from '../../../../public/js/managers/token-manager.js'

describe('TokenManager', () => {
  let manager

  beforeEach(() => {
    // Create a fresh instance for each test
    manager = new TokenManager()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Constructor', () => {
    it('should initialize with correct key names', () => {
      expect(manager.ACCESS_TOKEN_KEY).toBe('accessToken')
      expect(manager.REFRESH_TOKEN_KEY).toBe('refreshToken')
      expect(manager.USER_INFO_KEY).toBe('userInfo')
    })
  })

  describe('Access Token Management', () => {
    describe('getAccessToken()', () => {
      it('should return null when no token exists', () => {
        expect(manager.getAccessToken()).toBeNull()
      })

      it('should retrieve stored access token', () => {
        const token = 'mock-access-token-abc123'
        localStorage.setItem('accessToken', token)

        expect(manager.getAccessToken()).toBe(token)
      })

      it('should handle empty string token', () => {
        localStorage.setItem('accessToken', '')

        expect(manager.getAccessToken()).toBe('')
      })
    })

    describe('setAccessToken()', () => {
      it('should store access token', () => {
        const token = 'new-access-token-xyz'

        manager.setAccessToken(token)

        expect(localStorage.getItem('accessToken')).toBe(token)
        expect(manager.getAccessToken()).toBe(token)
      })

      it('should overwrite existing token', () => {
        manager.setAccessToken('old-token')
        manager.setAccessToken('new-token')

        expect(manager.getAccessToken()).toBe('new-token')
      })
    })
  })

  describe('Refresh Token Management', () => {
    describe('getRefreshToken()', () => {
      it('should return null when no token exists', () => {
        expect(manager.getRefreshToken()).toBeNull()
      })

      it('should retrieve stored refresh token', () => {
        const token = 'mock-refresh-token-def456'
        localStorage.setItem('refreshToken', token)

        expect(manager.getRefreshToken()).toBe(token)
      })
    })

    describe('setRefreshToken()', () => {
      it('should store refresh token', () => {
        const token = 'new-refresh-token-789'

        manager.setRefreshToken(token)

        expect(localStorage.getItem('refreshToken')).toBe(token)
        expect(manager.getRefreshToken()).toBe(token)
      })

      it('should overwrite existing refresh token', () => {
        manager.setRefreshToken('old-refresh')
        manager.setRefreshToken('new-refresh')

        expect(manager.getRefreshToken()).toBe('new-refresh')
      })
    })
  })

  describe('Both Tokens Management', () => {
    describe('setTokens()', () => {
      it('should store both tokens', () => {
        const accessToken = 'access-token-123'
        const refreshToken = 'refresh-token-456'

        manager.setTokens(accessToken, refreshToken)

        expect(manager.getAccessToken()).toBe(accessToken)
        expect(manager.getRefreshToken()).toBe(refreshToken)
      })

      it('should store only access token when refresh is null', () => {
        const accessToken = 'access-only-token'

        manager.setTokens(accessToken, null)

        expect(manager.getAccessToken()).toBe(accessToken)
        expect(manager.getRefreshToken()).toBeNull()
      })

      it('should store only access token when refresh is undefined', () => {
        const accessToken = 'access-only-token'

        manager.setTokens(accessToken, undefined)

        expect(manager.getAccessToken()).toBe(accessToken)
        expect(manager.getRefreshToken()).toBeNull()
      })

      it('should store only access token when refresh is empty string', () => {
        const accessToken = 'access-token'

        manager.setTokens(accessToken, '')

        expect(manager.getAccessToken()).toBe(accessToken)
        // Empty string is falsy, so shouldn't be stored
        expect(manager.getRefreshToken()).toBeNull()
      })
    })
  })

  describe('User Info Management', () => {
    describe('getUserInfo()', () => {
      it('should return null when no user info exists', () => {
        expect(manager.getUserInfo()).toBeNull()
      })

      it('should retrieve and parse stored user info', () => {
        const userInfo = {
          id: 'user-123',
          email: 'test@example.com',
          nickname: 'testuser'
        }
        localStorage.setItem('userInfo', JSON.stringify(userInfo))

        const retrieved = manager.getUserInfo()

        expect(retrieved).toEqual(userInfo)
        expect(retrieved.id).toBe('user-123')
        expect(retrieved.email).toBe('test@example.com')
      })

      it('should handle complex user objects', () => {
        const userInfo = {
          id: 'user-456',
          email: 'user@example.com',
          nickname: 'user',
          profile: {
            firstName: 'John',
            lastName: 'Doe'
          },
          roles: ['user', 'admin'],
          createdAt: '2025-01-01T00:00:00.000Z'
        }
        localStorage.setItem('userInfo', JSON.stringify(userInfo))

        const retrieved = manager.getUserInfo()

        expect(retrieved).toEqual(userInfo)
        expect(retrieved.profile.firstName).toBe('John')
        expect(retrieved.roles).toEqual(['user', 'admin'])
      })

      it('should return null for invalid JSON', () => {
        localStorage.setItem('userInfo', 'invalid-json{]')

        const retrieved = manager.getUserInfo()

        // Should handle parse error gracefully
        expect(retrieved).toBeNull()
      })
    })

    describe('setUserInfo()', () => {
      it('should store user info as JSON string', () => {
        const userInfo = {
          id: 'new-user',
          email: 'new@example.com',
          nickname: 'newuser'
        }

        manager.setUserInfo(userInfo)

        const stored = localStorage.getItem('userInfo')
        expect(stored).toBe(JSON.stringify(userInfo))

        const retrieved = manager.getUserInfo()
        expect(retrieved).toEqual(userInfo)
      })

      it('should overwrite existing user info', () => {
        manager.setUserInfo({ id: 'old-user' })
        manager.setUserInfo({ id: 'new-user', email: 'new@test.com' })

        const retrieved = manager.getUserInfo()
        expect(retrieved.id).toBe('new-user')
        expect(retrieved.email).toBe('new@test.com')
      })

      it('should handle nested objects', () => {
        const userInfo = {
          id: 'user-789',
          preferences: {
            theme: 'dark',
            language: 'fr'
          }
        }

        manager.setUserInfo(userInfo)

        const retrieved = manager.getUserInfo()
        expect(retrieved.preferences.theme).toBe('dark')
      })
    })
  })

  describe('Clear Operations', () => {
    describe('clearTokens()', () => {
      it('should remove both tokens and user info', () => {
        // Setup
        manager.setTokens('access-token', 'refresh-token')
        manager.setUserInfo({ id: 'user-123' })

        // Clear
        manager.clearTokens()

        // Verify all removed
        expect(manager.getAccessToken()).toBeNull()
        expect(manager.getRefreshToken()).toBeNull()
        expect(manager.getUserInfo()).toBeNull()
      })

      it('should handle clearing when nothing is stored', () => {
        // Should not throw error
        expect(() => manager.clearTokens()).not.toThrow()

        expect(manager.getAccessToken()).toBeNull()
        expect(manager.getRefreshToken()).toBeNull()
        expect(manager.getUserInfo()).toBeNull()
      })
    })

    describe('clearAll()', () => {
      it('should be alias of clearTokens()', () => {
        // Setup
        manager.setTokens('access', 'refresh')
        manager.setUserInfo({ id: 'user' })

        // Clear
        manager.clearAll()

        // Verify
        expect(manager.getAccessToken()).toBeNull()
        expect(manager.getRefreshToken()).toBeNull()
        expect(manager.getUserInfo()).toBeNull()
      })
    })
  })

  describe('Validation Methods', () => {
    describe('hasValidToken()', () => {
      it('should return true when access token exists', () => {
        manager.setAccessToken('valid-token')

        expect(manager.hasValidToken()).toBe(true)
      })

      it('should return false when no access token', () => {
        expect(manager.hasValidToken()).toBe(false)
      })

      it('should return false after clearing tokens', () => {
        manager.setAccessToken('token')
        manager.clearTokens()

        expect(manager.hasValidToken()).toBe(false)
      })

      it('should use truthy check (empty string is falsy)', () => {
        manager.setAccessToken('')

        // Empty string should be considered invalid
        expect(manager.hasValidToken()).toBe(false)
      })
    })

    describe('isAuthenticated()', () => {
      it('should return true when user is authenticated', () => {
        manager.setAccessToken('auth-token')

        expect(manager.isAuthenticated()).toBe(true)
      })

      it('should return false when user is not authenticated', () => {
        expect(manager.isAuthenticated()).toBe(false)
      })

      it('should be alias of hasValidToken()', () => {
        manager.setAccessToken('token')

        expect(manager.isAuthenticated()).toBe(manager.hasValidToken())
      })
    })
  })

  describe('Global Instance', () => {
    it('should export a singleton instance', () => {
      expect(tokenManager).toBeInstanceOf(TokenManager)
    })

    it('should be the same instance across imports', () => {
      // This tests that tokenManager is a singleton
      tokenManager.setAccessToken('singleton-test')

      expect(tokenManager.getAccessToken()).toBe('singleton-test')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete login flow', () => {
      // Simulate login response
      const tokens = {
        accessToken: 'login-access-token',
        refreshToken: 'login-refresh-token'
      }
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        nickname: 'testuser'
      }

      // Store tokens and user
      manager.setTokens(tokens.accessToken, tokens.refreshToken)
      manager.setUserInfo(user)

      // Verify authentication state
      expect(manager.isAuthenticated()).toBe(true)
      expect(manager.getAccessToken()).toBe(tokens.accessToken)
      expect(manager.getRefreshToken()).toBe(tokens.refreshToken)
      expect(manager.getUserInfo()).toEqual(user)
    })

    it('should handle complete logout flow', () => {
      // Setup authenticated state
      manager.setTokens('access', 'refresh')
      manager.setUserInfo({ id: 'user' })

      expect(manager.isAuthenticated()).toBe(true)

      // Logout
      manager.clearTokens()

      // Verify cleared state
      expect(manager.isAuthenticated()).toBe(false)
      expect(manager.getAccessToken()).toBeNull()
      expect(manager.getRefreshToken()).toBeNull()
      expect(manager.getUserInfo()).toBeNull()
    })

    it('should handle token refresh flow', () => {
      // Initial tokens
      manager.setTokens('old-access', 'old-refresh')

      // Refresh tokens
      manager.setTokens('new-access', 'new-refresh')

      // Verify updated
      expect(manager.getAccessToken()).toBe('new-access')
      expect(manager.getRefreshToken()).toBe('new-refresh')
    })
  })
})
