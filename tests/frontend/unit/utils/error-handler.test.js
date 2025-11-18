/**
 * Tests unitaires pour utils/error-handler.js
 * Teste la gestion des erreurs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ErrorHandler } from '../../../../public/js/utils/error-handler.js'

// Mock UI module
vi.mock('../../../../public/js/utils/ui.js', () => ({
  UI: {
    showElement: vi.fn(),
    setHTML: vi.fn()
  }
}))

import { UI } from '../../../../public/js/utils/ui.js'

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handle()', () => {
    it('should log error to console', () => {
      const error = new Error('Test error')

      ErrorHandler.handle(error)

      expect(console.error).toHaveBeenCalledWith('❌ Error:', error)
    })

    it('should display error in responseDiv if provided', () => {
      const error = new Error('Display error')

      ErrorHandler.handle(error, 'errorDiv')

      expect(UI.showElement).toHaveBeenCalledWith('errorDiv')
      expect(UI.setHTML).toHaveBeenCalledWith('errorDiv', expect.stringContaining('Display error'))
    })

    it('should handle error without responseDiv', () => {
      const error = new Error('No div error')

      expect(() => ErrorHandler.handle(error, null)).not.toThrow()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('handleAPIError()', () => {
    it('should return false for error response', () => {
      const response = {
        ok: false,
        data: {
          message: 'API Error'
        }
      }

      const result = ErrorHandler.handleAPIError(response, 'apiErrorDiv')

      expect(result).toBe(false)
      expect(UI.showElement).toHaveBeenCalledWith('apiErrorDiv')
      expect(UI.setHTML).toHaveBeenCalled()
    })

    it('should return true for success response', () => {
      const response = {
        ok: true,
        data: {
          success: true
        }
      }

      const result = ErrorHandler.handleAPIError(response, 'div')

      expect(result).toBe(true)
      expect(UI.showElement).not.toHaveBeenCalled()
    })

    it('should handle missing error message', () => {
      const response = {
        ok: false,
        data: {}
      }

      const result = ErrorHandler.handleAPIError(response, 'div')

      expect(result).toBe(false)
      expect(UI.setHTML).toHaveBeenCalledWith('div', expect.stringContaining('Erreur inconnue'))
    })

    it('should display error details as JSON', () => {
      const response = {
        ok: false,
        data: {
          message: 'Detailed error',
          details: { field: 'email', issue: 'invalid' }
        }
      }

      ErrorHandler.handleAPIError(response, 'div')

      expect(UI.setHTML).toHaveBeenCalledWith('div', expect.stringContaining('Detailed error'))
      expect(UI.setHTML).toHaveBeenCalledWith('div', expect.stringContaining('details'))
    })
  })
})
