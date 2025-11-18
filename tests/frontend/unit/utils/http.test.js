/**
 * Tests unitaires pour utils/http.js
 * Teste le client HTTP pour les requêtes API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HTTP } from '../../../../public/js/utils/http.js'

describe('HTTP', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('request()', () => {
    it('should make a basic request with default headers', async () => {
      const mockResponse = { success: true, data: 'test' }
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await HTTP.request('http://api.example.com/test')

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/test', {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(result.ok).toBe(true)
      expect(result.status).toBe(200)
      expect(result.data).toEqual(mockResponse)
    })

    it('should merge custom headers with default headers', async () => {
      const mockResponse = { data: 'test' }
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })

      await HTTP.request('http://api.example.com/test', {
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value'
        }
      })

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value'
        }
      })
    })

    it('should handle custom options', async () => {
      const mockResponse = { data: 'test' }
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })

      await HTTP.request('http://api.example.com/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' })
      })

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    it('should handle error responses', async () => {
      const mockError = { error: 'Not Found' }
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve(mockError)
      })

      const result = await HTTP.request('http://api.example.com/notfound')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(404)
      expect(result.data).toEqual(mockError)
    })

    it('should handle network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'))

      await expect(HTTP.request('http://api.example.com/test'))
        .rejects.toThrow('Network error')
    })
  })

  describe('get()', () => {
    it('should make GET request without token', async () => {
      const mockResponse = { users: [] }
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await HTTP.get('http://api.example.com/users')

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(result.data).toEqual(mockResponse)
    })

    it('should make GET request with authorization token', async () => {
      const mockResponse = { user: { id: 1 } }
      const token = 'access-token-123'
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })

      await HTTP.get('http://api.example.com/profile', token)

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
    })

    it('should handle GET with null token', async () => {
      const mockResponse = { data: 'test' }
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })

      await HTTP.get('http://api.example.com/public', null)

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/public', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })
  })

  describe('post()', () => {
    it('should make POST request without token', async () => {
      const mockResponse = { success: true, id: 'new-id' }
      const postData = { name: 'Test', value: 123 }
      global.fetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await HTTP.post('http://api.example.com/items', postData)

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      })
      expect(result.data).toEqual(mockResponse)
    })

    it('should make POST request with authorization token', async () => {
      const mockResponse = { success: true }
      const postData = { content: 'New post' }
      const token = 'user-token-456'
      global.fetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse)
      })

      await HTTP.post('http://api.example.com/posts', postData, token)

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postData)
      })
    })

    it('should handle empty body', async () => {
      const mockResponse = { success: true }
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })

      await HTTP.post('http://api.example.com/action', {})

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })
    })

    it('should handle complex nested objects', async () => {
      const mockResponse = { success: true }
      const complexData = {
        user: {
          name: 'John',
          settings: {
            theme: 'dark',
            notifications: ['email', 'sms']
          }
        }
      }
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })

      await HTTP.post('http://api.example.com/update', complexData)

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(complexData)
      })
    })
  })

  describe('put()', () => {
    it('should make PUT request without token', async () => {
      const mockResponse = { success: true, updated: true }
      const updateData = { name: 'Updated Name' }
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await HTTP.put('http://api.example.com/items/123', updateData)

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/items/123', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })
      expect(result.data).toEqual(mockResponse)
    })

    it('should make PUT request with authorization token', async () => {
      const mockResponse = { success: true }
      const updateData = { status: 'active' }
      const token = 'admin-token-789'
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })

      await HTTP.put('http://api.example.com/users/456', updateData, token)

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/users/456', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })
    })
  })

  describe('delete()', () => {
    it('should make DELETE request without token', async () => {
      const mockResponse = { success: true, deleted: true }
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await HTTP.delete('http://api.example.com/items/123')

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/items/123', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      expect(result.data).toEqual(mockResponse)
    })

    it('should make DELETE request with authorization token', async () => {
      const mockResponse = { success: true }
      const token = 'delete-token-000'
      global.fetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.resolve(mockResponse)
      })

      await HTTP.delete('http://api.example.com/posts/789', token)

      expect(global.fetch).toHaveBeenCalledWith('http://api.example.com/posts/789', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle 401 Unauthorized', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      })

      const result = await HTTP.get('http://api.example.com/protected', 'invalid-token')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(401)
      expect(result.data.error).toBe('Unauthorized')
    })

    it('should handle 403 Forbidden', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Forbidden' })
      })

      const result = await HTTP.get('http://api.example.com/admin')

      expect(result.ok).toBe(false)
      expect(result.status).toBe(403)
    })

    it('should handle 500 Internal Server Error', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal Server Error' })
      })

      const result = await HTTP.post('http://api.example.com/action', {})

      expect(result.ok).toBe(false)
      expect(result.status).toBe(500)
    })

    it('should handle malformed JSON response', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })

      await expect(HTTP.get('http://api.example.com/bad-json'))
        .rejects.toThrow('Invalid JSON')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete authentication flow', async () => {
      // Login request
      const loginData = { email: 'user@example.com', password: 'password123' }
      const loginResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(loginResponse)
      })

      const login = await HTTP.post('http://api.example.com/login', loginData)

      expect(login.ok).toBe(true)
      expect(login.data.accessToken).toBe('new-access-token')

      // Protected request with token
      const profileResponse = { user: { id: '123', name: 'John' } }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profileResponse)
      })

      const profile = await HTTP.get('http://api.example.com/profile', loginResponse.accessToken)

      expect(profile.ok).toBe(true)
      expect(profile.data.user.name).toBe('John')
    })

    it('should handle CRUD operations sequence', async () => {
      // CREATE
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 'new-id', name: 'Item' })
      })

      const created = await HTTP.post('http://api.example.com/items', { name: 'Item' })
      expect(created.data.id).toBe('new-id')

      // READ
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'new-id', name: 'Item' })
      })

      const read = await HTTP.get('http://api.example.com/items/new-id')
      expect(read.data.name).toBe('Item')

      // UPDATE
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'new-id', name: 'Updated Item' })
      })

      const updated = await HTTP.put('http://api.example.com/items/new-id', { name: 'Updated Item' })
      expect(updated.data.name).toBe('Updated Item')

      // DELETE
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve({ success: true })
      })

      const deleted = await HTTP.delete('http://api.example.com/items/new-id')
      expect(deleted.ok).toBe(true)
    })
  })
})
