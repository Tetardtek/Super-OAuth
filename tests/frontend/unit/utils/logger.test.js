/**
 * Tests unitaires pour utils/logger.js
 * Teste le système de logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Logger } from '../../../../public/js/utils/logger.js'

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('info()', () => {
    it('should log info message with emoji', () => {
      Logger.info('Test info')

      expect(console.log).toHaveBeenCalledWith('ℹ️ Test info')
    })

    it('should log with additional arguments', () => {
      const data = { test: 'value' }

      Logger.info('Test', data)

      expect(console.log).toHaveBeenCalledWith('ℹ️ Test', data)
    })
  })

  describe('success()', () => {
    it('should log success message with emoji', () => {
      Logger.success('Test success')

      expect(console.log).toHaveBeenCalledWith('✅ Test success')
    })

    it('should log with multiple arguments', () => {
      Logger.success('Success', 'arg1', 'arg2')

      expect(console.log).toHaveBeenCalledWith('✅ Success', 'arg1', 'arg2')
    })
  })

  describe('error()', () => {
    it('should log error message with emoji', () => {
      Logger.error('Test error')

      expect(console.error).toHaveBeenCalledWith('❌ Test error')
    })

    it('should use console.error', () => {
      Logger.error('Error message')

      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('warn()', () => {
    it('should log warning message with emoji', () => {
      Logger.warn('Test warning')

      expect(console.warn).toHaveBeenCalledWith('⚠️ Test warning')
    })

    it('should use console.warn', () => {
      Logger.warn('Warning message')

      expect(console.warn).toHaveBeenCalled()
    })
  })

  describe('debug()', () => {
    it('should log debug message with emoji', () => {
      Logger.debug('Test debug')

      expect(console.log).toHaveBeenCalledWith('🔧 Test debug')
    })
  })
})
