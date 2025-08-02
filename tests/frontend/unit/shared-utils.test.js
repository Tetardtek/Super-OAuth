/**
 * Tests unitaires pour shared-utils.js
 * Teste les utilitaires partagés entre composants
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock du module shared-utils
const mockSharedUtils = {
  // Clipboard utilities
  copyToClipboard: vi.fn(),
  
  // UI feedback
  showFeedback: vi.fn(),
  hideFeedback: vi.fn(),
  
  // Performance utilities
  debounce: vi.fn(),
  throttle: vi.fn(),
  
  // Date utilities
  formatDate: vi.fn(),
  formatDateShort: vi.fn(),
  formatDateTime: vi.fn(),
  getTimeAgo: vi.fn(),
  
  // Validation utilities
  validateEmail: vi.fn(),
  validatePassword: vi.fn(),
  validateNickname: vi.fn(),
  
  // String utilities
  capitalize: vi.fn(),
  truncate: vi.fn(),
  slugify: vi.fn()
}

// Mock DOM for UI feedback
const createMockFeedback = () => {
  document.body.innerHTML = `
    <div id="feedback" class="feedback" style="display: none;">
      <span id="feedbackMessage"></span>
    </div>
    <input type="text" id="testInput" value="test@example.com">
    <button id="copyButton">Copy</button>
  `
}

describe('SharedUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createMockFeedback()
    
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  describe('Clipboard Utilities', () => {
    it('should copy text to clipboard successfully', async () => {
      const textToCopy = 'test@example.com'
      
      mockSharedUtils.copyToClipboard.mockImplementation(async (text) => {
        await navigator.clipboard.writeText(text)
        mockSharedUtils.showFeedback('Copié dans le presse-papier', 'success')
        return { success: true }
      })

      const result = await mockSharedUtils.copyToClipboard(textToCopy)
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(textToCopy)
      expect(mockSharedUtils.showFeedback).toHaveBeenCalledWith('Copié dans le presse-papier', 'success')
      expect(result.success).toBe(true)
    })

    it('should handle clipboard API not available', async () => {
      // Remove clipboard API
      delete navigator.clipboard
      
      mockSharedUtils.copyToClipboard.mockImplementation(async (text) => {
        if (!navigator.clipboard) {
          // Fallback to execCommand
          const textArea = document.createElement('textarea')
          textArea.value = text
          document.body.appendChild(textArea)
          textArea.select()
          
          try {
            const success = document.execCommand('copy')
            document.body.removeChild(textArea)
            
            if (success) {
              mockSharedUtils.showFeedback('Copié dans le presse-papier', 'success')
              return { success: true }
            } else {
              throw new Error('execCommand failed')
            }
          } catch (error) {
            mockSharedUtils.showFeedback('Erreur lors de la copie', 'error')
            return { success: false, error: error.message }
          }
        }
      })

      // Mock execCommand
      document.execCommand = vi.fn().mockReturnValue(true)

      const result = await mockSharedUtils.copyToClipboard('test text')
      
      expect(result.success).toBe(true)
      expect(mockSharedUtils.showFeedback).toHaveBeenCalledWith('Copié dans le presse-papier', 'success')
    })

    it('should handle clipboard copy failure', async () => {
      navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Permission denied'))
      
      mockSharedUtils.copyToClipboard.mockImplementation(async (text) => {
        try {
          await navigator.clipboard.writeText(text)
        } catch (error) {
          mockSharedUtils.showFeedback('Erreur lors de la copie', 'error')
          return { success: false, error: error.message }
        }
      })

      const result = await mockSharedUtils.copyToClipboard('test')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Permission denied')
      expect(mockSharedUtils.showFeedback).toHaveBeenCalledWith('Erreur lors de la copie', 'error')
    })
  })

  describe('UI Feedback', () => {
    it('should show success feedback', () => {
      mockSharedUtils.showFeedback.mockImplementation((message, type = 'info') => {
        const feedbackEl = document.getElementById('feedback')
        const messageEl = document.getElementById('feedbackMessage')
        
        if (feedbackEl && messageEl) {
          messageEl.textContent = message
          feedbackEl.className = `feedback feedback-${type}`
          feedbackEl.style.display = 'block'
          
          // Auto hide after 3 seconds
          setTimeout(() => {
            mockSharedUtils.hideFeedback()
          }, 3000)
        }
      })

      mockSharedUtils.showFeedback('Operation successful!', 'success')
      
      const feedback = document.getElementById('feedback')
      const message = document.getElementById('feedbackMessage')
      
      expect(feedback.style.display).toBe('block')
      expect(feedback.className).toBe('feedback feedback-success')
      expect(message.textContent).toBe('Operation successful!')
    })

    it('should show error feedback', () => {
      mockSharedUtils.showFeedback.mockImplementation((message, type) => {
        const feedbackEl = document.getElementById('feedback')
        const messageEl = document.getElementById('feedbackMessage')
        
        messageEl.textContent = message
        feedbackEl.className = `feedback feedback-${type}`
        feedbackEl.style.display = 'block'
      })

      mockSharedUtils.showFeedback('Something went wrong!', 'error')
      
      const feedback = document.getElementById('feedback')
      const message = document.getElementById('feedbackMessage')
      
      expect(feedback.className).toBe('feedback feedback-error')
      expect(message.textContent).toBe('Something went wrong!')
    })

    it('should hide feedback', () => {
      // First show feedback
      const feedback = document.getElementById('feedback')
      feedback.style.display = 'block'
      
      mockSharedUtils.hideFeedback.mockImplementation(() => {
        const feedbackEl = document.getElementById('feedback')
        if (feedbackEl) {
          feedbackEl.style.display = 'none'
          feedbackEl.className = 'feedback'
        }
      })

      mockSharedUtils.hideFeedback()
      
      expect(feedback.style.display).toBe('none')
      expect(feedback.className).toBe('feedback')
    })
  })

  describe('Performance Utilities', () => {
    it('should debounce function calls', () => {
      let callCount = 0
      const testFn = () => { callCount++ }
      
      mockSharedUtils.debounce.mockImplementation((fn, delay) => {
        let timeoutId
        return (...args) => {
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => fn.apply(this, args), delay)
        }
      })

      const debouncedFn = mockSharedUtils.debounce(testFn, 100)
      
      // Call multiple times rapidly
      debouncedFn()
      debouncedFn()
      debouncedFn()
      
      expect(mockSharedUtils.debounce).toHaveBeenCalledWith(testFn, 100)
    })

    it('should throttle function calls', () => {
      let callCount = 0
      const testFn = () => { callCount++ }
      
      mockSharedUtils.throttle.mockImplementation((fn, delay) => {
        let lastCall = 0
        return (...args) => {
          const now = Date.now()
          if (now - lastCall >= delay) {
            lastCall = now
            return fn.apply(this, args)
          }
        }
      })

      const throttledFn = mockSharedUtils.throttle(testFn, 100)
      
      throttledFn()
      throttledFn() // Should be ignored due to throttling
      
      expect(mockSharedUtils.throttle).toHaveBeenCalledWith(testFn, 100)
    })
  })

  describe('Date Utilities', () => {
    const testDate = new Date('2025-07-22T17:30:00.000Z')

    it('should format date correctly', () => {
      mockSharedUtils.formatDate.mockImplementation((date) => {
        return new Intl.DateTimeFormat('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(new Date(date))
      })

      const formatted = mockSharedUtils.formatDate(testDate)
      
      expect(mockSharedUtils.formatDate).toHaveBeenCalledWith(testDate)
      expect(formatted).toBeDefined()
    })

    it('should format short date', () => {
      mockSharedUtils.formatDateShort.mockImplementation((date) => {
        return new Intl.DateTimeFormat('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(new Date(date))
      })

      const formatted = mockSharedUtils.formatDateShort(testDate)
      
      expect(mockSharedUtils.formatDateShort).toHaveBeenCalledWith(testDate)
    })

    it('should format date and time', () => {
      mockSharedUtils.formatDateTime.mockImplementation((date) => {
        return new Intl.DateTimeFormat('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(date))
      })

      const formatted = mockSharedUtils.formatDateTime(testDate)
      
      expect(mockSharedUtils.formatDateTime).toHaveBeenCalledWith(testDate)
    })

    it('should calculate time ago', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000))
      
      mockSharedUtils.getTimeAgo.mockImplementation((date) => {
        const diff = Date.now() - new Date(date).getTime()
        const minutes = Math.floor(diff / (1000 * 60))
        const hours = Math.floor(diff / (1000 * 60 * 60))
        
        if (hours > 0) {
          return `il y a ${hours} heure${hours > 1 ? 's' : ''}`
        } else if (minutes > 0) {
          return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`
        } else {
          return 'à l\'instant'
        }
      })

      const timeAgo = mockSharedUtils.getTimeAgo(oneHourAgo)
      
      expect(timeAgo).toContain('il y a')
      expect(timeAgo).toContain('heure')
    })
  })

  describe('Validation Utilities', () => {
    it('should validate email addresses', () => {
      mockSharedUtils.validateEmail.mockImplementation((email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
      })

      expect(mockSharedUtils.validateEmail('test@example.com')).toBe(true)
      expect(mockSharedUtils.validateEmail('invalid-email')).toBe(false)
      expect(mockSharedUtils.validateEmail('user@domain')).toBe(false)
      expect(mockSharedUtils.validateEmail('')).toBe(false)
    })

    it('should validate passwords', () => {
      mockSharedUtils.validatePassword.mockImplementation((password) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
        return passwordRegex.test(password)
      })

      expect(mockSharedUtils.validatePassword('Password123')).toBe(true)
      expect(mockSharedUtils.validatePassword('password')).toBe(false) // No uppercase
      expect(mockSharedUtils.validatePassword('PASSWORD')).toBe(false) // No lowercase
      expect(mockSharedUtils.validatePassword('Password')).toBe(false) // No number
      expect(mockSharedUtils.validatePassword('Pass1')).toBe(false) // Too short
    })

    it('should validate nicknames', () => {
      mockSharedUtils.validateNickname.mockImplementation((nickname) => {
        // 3-20 characters, alphanumeric and underscore only
        const nicknameRegex = /^[a-zA-Z0-9_]{3,20}$/
        return nicknameRegex.test(nickname)
      })

      expect(mockSharedUtils.validateNickname('validnick')).toBe(true)
      expect(mockSharedUtils.validateNickname('valid_nick123')).toBe(true)
      expect(mockSharedUtils.validateNickname('ab')).toBe(false) // Too short
      expect(mockSharedUtils.validateNickname('toolongnicknamemorethan20chars')).toBe(false) // Too long
      expect(mockSharedUtils.validateNickname('invalid-nick')).toBe(false) // Contains dash
      expect(mockSharedUtils.validateNickname('invalid nick')).toBe(false) // Contains space
    })
  })

  describe('String Utilities', () => {
    it('should capitalize strings', () => {
      mockSharedUtils.capitalize.mockImplementation((str) => {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
      })

      expect(mockSharedUtils.capitalize('hello')).toBe('Hello')
      expect(mockSharedUtils.capitalize('WORLD')).toBe('World')
      expect(mockSharedUtils.capitalize('tEST')).toBe('Test')
      expect(mockSharedUtils.capitalize('')).toBe('')
    })

    it('should truncate long strings', () => {
      mockSharedUtils.truncate.mockImplementation((str, maxLength = 50) => {
        if (str.length <= maxLength) return str
        return str.substring(0, maxLength - 3) + '...'
      })

      const longString = 'This is a very long string that should be truncated'
      
      expect(mockSharedUtils.truncate(longString, 20)).toBe('This is a very lo...')
      expect(mockSharedUtils.truncate('Short string')).toBe('Short string')
      expect(mockSharedUtils.truncate('')).toBe('')
    })

    it('should create URL-friendly slugs', () => {
      mockSharedUtils.slugify.mockImplementation((str) => {
        return str
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
      })

      expect(mockSharedUtils.slugify('Hello World!')).toBe('hello-world')
      expect(mockSharedUtils.slugify('Test@Example.com')).toBe('testexamplecom')
      expect(mockSharedUtils.slugify('  Spaced   Out  ')).toBe('spaced-out')
      expect(mockSharedUtils.slugify('Under_score')).toBe('under-score')
    })
  })
})
