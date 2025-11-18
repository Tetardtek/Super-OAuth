/**
 * Tests unitaires pour utils/ui.js
 * Teste les helpers de manipulation DOM
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { UI } from '../../../../public/js/utils/ui.js'

describe('UI', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('Element Visibility', () => {
    it('should show element', () => {
      document.body.innerHTML = '<div id="test" style="display: none;"></div>'

      UI.showElement('test')

      const element = document.getElementById('test')
      expect(element.style.display).toBe('block')
    })

    it('should hide element', () => {
      document.body.innerHTML = '<div id="test" style="display: block;"></div>'

      UI.hideElement('test')

      const element = document.getElementById('test')
      expect(element.style.display).toBe('none')
    })

    it('should handle non-existent element gracefully', () => {
      expect(() => UI.showElement('nonExistent')).not.toThrow()
      expect(() => UI.hideElement('nonExistent')).not.toThrow()
    })
  })

  describe('Value Management', () => {
    it('should set input value', () => {
      document.body.innerHTML = '<input id="input" type="text" />'

      UI.setValue('input', 'test value')

      expect(document.getElementById('input').value).toBe('test value')
    })

    it('should get input value', () => {
      document.body.innerHTML = '<input id="input" type="text" value="existing" />'

      const value = UI.getValue('input')

      expect(value).toBe('existing')
    })

    it('should clear input value', () => {
      document.body.innerHTML = '<input id="input" type="text" value="clear me" />'

      UI.clearValue('input')

      expect(document.getElementById('input').value).toBe('')
    })

    it('should return empty string for non-existent element', () => {
      const value = UI.getValue('nonExistent')

      expect(value).toBe('')
    })
  })

  describe('HTML Content', () => {
    it('should set innerHTML', () => {
      document.body.innerHTML = '<div id="container"></div>'

      UI.setHTML('container', '<p>Test content</p>')

      expect(document.getElementById('container').innerHTML).toBe('<p>Test content</p>')
    })

    it('should handle complex HTML', () => {
      document.body.innerHTML = '<div id="container"></div>'
      const complexHTML = '<div class="test"><span>Nested</span></div>'

      UI.setHTML('container', complexHTML)

      expect(document.getElementById('container').innerHTML).toBe(complexHTML)
    })

    it('should handle non-existent element gracefully', () => {
      expect(() => UI.setHTML('nonExistent', 'test')).not.toThrow()
    })
  })

  describe('Border Color', () => {
    it('should set border color', () => {
      document.body.innerHTML = '<input id="input" type="text" />'

      UI.setBorderColor('input', '#ff0000')

      const element = document.getElementById('input')
      // Browser converts hex to rgb, so check if color is set (not empty)
      expect(element.style.borderColor).toBeTruthy()
      expect(element.style.borderColor).not.toBe('')
    })

    it('should add box shadow for non-default colors', () => {
      document.body.innerHTML = '<input id="input" type="text" />'

      UI.setBorderColor('input', '#28a745')

      const element = document.getElementById('input')
      // Browser converts hex to rgb
      expect(element.style.borderColor).toBeTruthy()
      expect(element.style.boxShadow).toBeTruthy()
      expect(element.style.boxShadow).not.toBe('none')
    })

    it('should remove box shadow for default color', () => {
      document.body.innerHTML = '<input id="input" type="text" />'

      UI.setBorderColor('input', '#ddd')

      const element = document.getElementById('input')
      expect(element.style.boxShadow).toBe('none')
    })

    it('should handle non-existent element gracefully', () => {
      expect(() => UI.setBorderColor('nonExistent', '#000')).not.toThrow()
    })
  })
})
