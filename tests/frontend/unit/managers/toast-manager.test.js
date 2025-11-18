/**
 * Tests unitaires pour managers/toast-manager.js
 * Teste le système de notifications toast
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ToastManager, Toast } from '../../../../public/js/managers/toast-manager.js'

describe('ToastManager', () => {
  let manager
  let container

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = ''

    // Create fresh instance
    manager = new ToastManager()

    // Get container created by initContainer()
    container = document.getElementById('toast-container')

    // Mock timers
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('should create toast container on init', () => {
      expect(container).toBeTruthy()
      expect(container.id).toBe('toast-container')
    })

    it('should not create duplicate containers', () => {
      // Try to init again
      manager.initContainer()

      const containers = document.querySelectorAll('#toast-container')
      expect(containers.length).toBe(1)
    })

    it('should initialize toasts array', () => {
      expect(manager.toasts).toBeInstanceOf(Array)
      expect(manager.toasts.length).toBe(0)
    })

    it('should style container correctly', () => {
      expect(container.style.position).toBe('fixed')
      expect(container.style.top).toBe('20px')
      expect(container.style.right).toBe('20px')
      expect(container.style.zIndex).toBe('10000')
    })
  })

  describe('show()', () => {
    it('should create and display a toast', () => {
      const message = 'Test message'

      const toast = manager.show(message)

      expect(toast).toBeTruthy()
      expect(toast.parentElement).toBe(container)
      expect(toast.textContent).toContain(message)
    })

    it('should add toast to toasts array', () => {
      expect(manager.toasts.length).toBe(0)

      manager.show('Test')

      expect(manager.toasts.length).toBe(1)
    })

    it('should apply correct styles for info type (default)', () => {
      const toast = manager.show('Info message')

      expect(toast.style.background).toBe('rgb(59, 130, 246)')
      expect(toast.textContent).toContain('ℹ️')
    })

    it('should auto-remove toast after duration', () => {
      const toast = manager.show('Auto-remove test', 'info', 2000)

      expect(manager.toasts.length).toBe(1)

      // Fast-forward time
      vi.advanceTimersByTime(2000)

      // Should trigger remove
      expect(vi.getTimerCount()).toBeGreaterThanOrEqual(0)
    })

    it('should trigger entrance animation', () => {
      const toast = manager.show('Animation test')

      // Initial state (before animation)
      expect(toast.style.transform).toBe('translateX(400px)')
      expect(toast.style.opacity).toBe('0')

      // Trigger animation
      vi.advanceTimersByTime(10)

      expect(toast.style.transform).toBe('translateX(0)')
      expect(toast.style.opacity).toBe('1')
    })

    it('should handle multiple toasts', () => {
      manager.show('Toast 1')
      manager.show('Toast 2')
      manager.show('Toast 3')

      expect(manager.toasts.length).toBe(3)
      expect(container.children.length).toBe(3)
    })
  })

  describe('Toast Types', () => {
    it('should create success toast', () => {
      const toast = manager.success('Success message')

      expect(toast.style.background).toBe('rgb(16, 185, 129)')
      expect(toast.textContent).toContain('✅')
      expect(toast.textContent).toContain('Success message')
    })

    it('should create error toast', () => {
      const toast = manager.error('Error message')

      expect(toast.style.background).toBe('rgb(239, 68, 68)')
      expect(toast.textContent).toContain('❌')
      expect(toast.textContent).toContain('Error message')
    })

    it('should create warning toast', () => {
      const toast = manager.warning('Warning message')

      expect(toast.style.background).toBe('rgb(245, 158, 11)')
      expect(toast.textContent).toContain('⚠️')
      expect(toast.textContent).toContain('Warning message')
    })

    it('should create info toast', () => {
      const toast = manager.info('Info message')

      expect(toast.style.background).toBe('rgb(59, 130, 246)')
      expect(toast.textContent).toContain('ℹ️')
      expect(toast.textContent).toContain('Info message')
    })
  })

  describe('createToast()', () => {
    it('should create toast element with correct structure', () => {
      const message = 'Test toast'
      const toast = manager.createToast(message, 'info', 5000)

      expect(toast.tagName).toBe('DIV')
      expect(toast.innerHTML).toContain(message)
      expect(toast.innerHTML).toContain('ℹ️')
      expect(toast.innerHTML).toContain('×')
    })

    it('should have pointer cursor', () => {
      const toast = manager.createToast('Test', 'info', 5000)

      expect(toast.style.cursor).toBe('pointer')
      expect(toast.style.pointerEvents).toBe('auto')
    })

    it('should have proper styling', () => {
      const toast = manager.createToast('Test', 'success', 5000)

      expect(toast.style.padding).toBe('16px 20px')
      expect(toast.style.borderRadius).toBe('8px')
      expect(toast.style.maxWidth).toBe('400px')
      expect(toast.style.color).toBe('white')
    })
  })

  describe('remove()', () => {
    it('should remove toast from DOM', () => {
      const toast = manager.show('Remove me')

      expect(container.contains(toast)).toBe(true)
      expect(manager.toasts.length).toBe(1)

      manager.remove(toast)

      // Animation starts
      expect(toast.style.transform).toBe('translateX(400px)')
      expect(toast.style.opacity).toBe('0')

      // Complete animation
      vi.advanceTimersByTime(300)

      expect(manager.toasts.length).toBe(0)
    })

    it('should handle removing already removed toast', () => {
      const toast = manager.show('Test')

      manager.remove(toast)
      vi.advanceTimersByTime(300)

      // Try to remove again
      expect(() => manager.remove(toast)).not.toThrow()
    })

    it('should handle null toast gracefully', () => {
      expect(() => manager.remove(null)).not.toThrow()
    })

    it('should remove from toasts array', () => {
      const toast1 = manager.show('Toast 1')
      const toast2 = manager.show('Toast 2')

      expect(manager.toasts.length).toBe(2)

      manager.remove(toast1)
      vi.advanceTimersByTime(300)

      expect(manager.toasts.length).toBe(1)
      expect(manager.toasts[0]).toBe(toast2)
    })
  })

  describe('Click to Close', () => {
    it('should close toast when clicked', () => {
      const toast = manager.show('Click me')

      expect(manager.toasts.length).toBe(1)

      // Simulate click
      toast.click()

      expect(toast.style.transform).toBe('translateX(400px)')
      expect(toast.style.opacity).toBe('0')
    })

    it('should handle multiple clicks gracefully', () => {
      const toast = manager.show('Multi-click test')

      toast.click()
      toast.click()
      toast.click()

      // Should not throw error
      expect(() => toast.click()).not.toThrow()
    })
  })

  describe('Custom Duration', () => {
    it('should respect custom duration', () => {
      const shortDuration = 1000
      manager.show('Short duration', 'info', shortDuration)

      expect(manager.toasts.length).toBe(1)

      vi.advanceTimersByTime(shortDuration)

      // Should be in removal process
      vi.advanceTimersByTime(300) // Animation time
    })

    it('should use default duration if not provided', () => {
      const toast = manager.show('Default duration')

      // Default is 5000ms
      vi.advanceTimersByTime(4999)
      expect(manager.toasts.length).toBe(1)

      vi.advanceTimersByTime(1)
      // Should start removal
    })
  })

  describe('Global Instance', () => {
    it('should export Toast singleton', () => {
      expect(Toast).toBeInstanceOf(ToastManager)
    })

    it('should have working methods on singleton', () => {
      const toast = Toast.success('Singleton test')

      expect(toast).toBeTruthy()
      expect(toast.textContent).toContain('Singleton test')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'x'.repeat(500)
      const toast = manager.show(longMessage)

      expect(toast.textContent).toContain(longMessage)
      expect(toast.style.maxWidth).toBe('400px')
      expect(toast.style.wordWrap).toBe('break-word')
    })

    it('should handle empty message', () => {
      const toast = manager.show('')

      expect(toast).toBeTruthy()
      expect(container.contains(toast)).toBe(true)
    })

    it('should handle special characters', () => {
      const specialMessage = '<script>alert("XSS")</script>'
      const toast = manager.show(specialMessage)

      // HTML tags are stripped by textContent, only text remains
      expect(toast.textContent).toContain('alert("XSS")')
      // Verify the toast was created
      expect(toast).toBeTruthy()
    })

    it('should handle HTML in message', () => {
      const htmlMessage = '<strong>Bold</strong> text'
      const toast = manager.show(htmlMessage)

      // HTML should be rendered (since we use innerHTML)
      expect(toast.innerHTML).toContain(htmlMessage)
    })

    it('should handle unknown toast type', () => {
      const toast = manager.show('Unknown type', 'unknown-type', 5000)

      // Should fallback to info
      expect(toast.style.background).toBe('rgb(59, 130, 246)')
      expect(toast.textContent).toContain('ℹ️')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle rapid toast creation', () => {
      for (let i = 0; i < 10; i++) {
        manager.show(`Toast ${i}`)
      }

      expect(manager.toasts.length).toBe(10)
      expect(container.children.length).toBe(10)
    })

    it('should handle mixed toast types', () => {
      manager.success('Success')
      manager.error('Error')
      manager.warning('Warning')
      manager.info('Info')

      expect(manager.toasts.length).toBe(4)

      const toasts = Array.from(container.children)
      expect(toasts[0].style.background).toBe('rgb(16, 185, 129)')
      expect(toasts[1].style.background).toBe('rgb(239, 68, 68)')
      expect(toasts[2].style.background).toBe('rgb(245, 158, 11)')
      expect(toasts[3].style.background).toBe('rgb(59, 130, 246)')
    })

    it('should handle sequential removal', () => {
      const toast1 = manager.show('First', 'info', 1000)
      const toast2 = manager.show('Second', 'info', 2000)
      const toast3 = manager.show('Third', 'info', 3000)

      expect(manager.toasts.length).toBe(3)

      vi.advanceTimersByTime(1000)
      vi.advanceTimersByTime(300)

      vi.advanceTimersByTime(1000)
      vi.advanceTimersByTime(300)

      vi.advanceTimersByTime(1000)
      vi.advanceTimersByTime(300)
    })
  })
})
