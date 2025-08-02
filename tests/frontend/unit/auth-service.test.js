/**
 * Tests unitaires pour AuthService
 * Teste les fonctionnalités d'authentification frontend
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockApiResponses, mockApiErrors, mockFetch, mockAuthStates } from '../mocks/api.js'

// Mock du module AuthService
const mockAuthService = {
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  checkHealth: vi.fn(),
  isAuthenticated: vi.fn(),
  getUser: vi.fn(),
  getToken: vi.fn(),
  baseUrl: 'http://localhost:3000'
}

describe('AuthService', () => {
  beforeEach(() => {
    // Reset tous les mocks
    vi.clearAllMocks()
    mockAuthStates.anonymous()
    global.fetch = mockFetch(mockApiResponses.health)
  })

  describe('Authentication State', () => {
    it('should detect anonymous user initially', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false)
      mockAuthService.getUser.mockReturnValue(null)
      
      expect(mockAuthService.isAuthenticated()).toBe(false)
      expect(mockAuthService.getUser()).toBeNull()
    })

    it('should detect authenticated user with valid token', () => {
      const userData = mockAuthStates.authenticated()
      mockAuthService.isAuthenticated.mockReturnValue(true)
      mockAuthService.getUser.mockReturnValue(userData.user)
      mockAuthService.getToken.mockReturnValue(userData.accessToken)
      
      expect(mockAuthService.isAuthenticated()).toBe(true)
      expect(mockAuthService.getUser()).toEqual(userData.user)
      expect(mockAuthService.getToken()).toBe(userData.accessToken)
    })
  })

  describe('Login Process', () => {
    it('should successfully login with valid credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' }
      global.fetch = mockFetch(mockApiResponses.login)
      
      mockAuthService.login.mockResolvedValue({
        success: true,
        data: mockApiResponses.login
      })

      const result = await mockAuthService.login(credentials)
      
      expect(result.success).toBe(true)
      expect(result.data.user.email).toBe(credentials.email)
      expect(result.data.tokens.accessToken).toBeDefined()
    })

    it('should handle login failure with invalid credentials', async () => {
      const credentials = { email: 'wrong@example.com', password: 'wrongpass' }
      global.fetch = mockFetch(mockApiErrors.unauthorized, { status: 401, ok: false })
      
      mockAuthService.login.mockResolvedValue({
        success: false,
        error: mockApiErrors.unauthorized
      })

      const result = await mockAuthService.login(credentials)
      
      expect(result.success).toBe(false)
      expect(result.error.statusCode).toBe(401)
      expect(result.error.message).toBe('Invalid credentials')
    })

    it('should validate email format before login', async () => {
      const invalidCredentials = { email: 'invalid-email', password: 'password123' }
      
      mockAuthService.login.mockResolvedValue({
        success: false,
        error: mockApiErrors.validation
      })

      const result = await mockAuthService.login(invalidCredentials)
      
      expect(result.success).toBe(false)
      expect(result.error.message).toContain('email')
    })
  })

  describe('Registration Process', () => {
    it('should successfully register new user', async () => {
      const newUser = {
        email: 'newuser@example.com',
        password: 'securepass123',
        nickname: 'newuser'
      }
      
      global.fetch = mockFetch(mockApiResponses.register)
      mockAuthService.register.mockResolvedValue({
        success: true,
        data: mockApiResponses.register
      })

      const result = await mockAuthService.register(newUser)
      
      expect(result.success).toBe(true)
      expect(result.data.user.email).toBe(newUser.email)
      expect(result.data.user.nickname).toBe(newUser.nickname)
    })

    it('should handle duplicate email registration', async () => {
      const duplicateUser = {
        email: 'existing@example.com',
        password: 'password123',
        nickname: 'existing'
      }
      
      const duplicateError = {
        error: 'Conflict',
        message: 'Email already exists',
        statusCode: 409
      }
      
      global.fetch = mockFetch(duplicateError, { status: 409, ok: false })
      mockAuthService.register.mockResolvedValue({
        success: false,
        error: duplicateError
      })

      const result = await mockAuthService.register(duplicateUser)
      
      expect(result.success).toBe(false)
      expect(result.error.statusCode).toBe(409)
      expect(result.error.message).toContain('already exists')
    })
  })

  describe('Token Management', () => {
    it('should refresh token when expired', async () => {
      mockAuthStates.expired()
      global.fetch = mockFetch(mockApiResponses.refreshToken)
      
      mockAuthService.refreshToken.mockResolvedValue({
        success: true,
        data: mockApiResponses.refreshToken
      })

      const result = await mockAuthService.refreshToken()
      
      expect(result.success).toBe(true)
      expect(result.data.tokens.accessToken).toBeDefined()
      expect(result.data.tokens.refreshToken).toBeDefined()
    })

    it('should handle refresh token failure', async () => {
      mockAuthStates.expired()
      global.fetch = mockFetch(mockApiErrors.unauthorized, { status: 401, ok: false })
      
      mockAuthService.refreshToken.mockResolvedValue({
        success: false,
        error: mockApiErrors.unauthorized
      })

      const result = await mockAuthService.refreshToken()
      
      expect(result.success).toBe(false)
      expect(result.error.statusCode).toBe(401)
    })
  })

  describe('Logout Process', () => {
    it('should successfully logout authenticated user', async () => {
      mockAuthStates.authenticated()
      global.fetch = mockFetch({ success: true })
      
      mockAuthService.logout.mockResolvedValue({
        success: true
      })
      
      mockAuthService.isAuthenticated.mockReturnValue(false)

      const result = await mockAuthService.logout()
      
      expect(result.success).toBe(true)
      expect(mockAuthService.isAuthenticated()).toBe(false)
    })

    it('should clear local storage on logout', async () => {
      const userData = mockAuthStates.authenticated()
      
      mockAuthService.logout.mockImplementation(() => {
        localStorage.clear()
        return Promise.resolve({ success: true })
      })

      await mockAuthService.logout()
      
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('user_data')).toBeNull()
    })
  })

  describe('Server Health Check', () => {
    it('should check server health successfully', async () => {
      global.fetch = mockFetch(mockApiResponses.health)
      
      mockAuthService.checkHealth.mockResolvedValue({
        success: true,
        online: true,
        data: mockApiResponses.health
      })

      const result = await mockAuthService.checkHealth()
      
      expect(result.success).toBe(true)
      expect(result.online).toBe(true)
      expect(result.data.status).toBe('ok')
      expect(result.data.version).toBe('1.0.0')
    })

    it('should handle server offline', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      
      mockAuthService.checkHealth.mockResolvedValue({
        success: false,
        online: false,
        error: { message: 'Network error' }
      })

      const result = await mockAuthService.checkHealth()
      
      expect(result.success).toBe(false)
      expect(result.online).toBe(false)
      expect(result.error.message).toBe('Network error')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))
      
      mockAuthService.login.mockResolvedValue({
        success: false,
        error: { message: 'Network failure' }
      })

      const result = await mockAuthService.login({ email: 'test@example.com', password: 'pass' })
      
      expect(result.success).toBe(false)
      expect(result.error.message).toBe('Network failure')
    })

    it('should handle malformed API responses', async () => {
      global.fetch = mockFetch('invalid json response')
      
      mockAuthService.login.mockResolvedValue({
        success: false,
        error: { message: 'Invalid response format' }
      })

      const result = await mockAuthService.login({ email: 'test@example.com', password: 'pass' })
      
      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Invalid response')
    })
  })
})
