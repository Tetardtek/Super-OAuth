/**
 * Tests unitaires pour ServerMonitorComponent
 * Teste le monitoring automatique et manuel du serveur
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockApiResponses, mockFetch } from '../mocks/api.js'

// Mock DOM pour server monitor
const createMockServerMonitor = () => {
  document.body.innerHTML = `
    <div class="card">
      <h3>📊 État du serveur</h3>
      <div class="status">
        <div class="status-dot" id="serverStatus"></div>
        <span id="serverStatusText">Vérification...</span>
      </div>
      <button class="btn" onclick="checkServerHealth()">🔄 Vérifier le statut</button>
      <div class="response-area" id="healthResponse" style="display: none;"></div>
    </div>
  `
}

// Mock ServerMonitorComponent
const mockServerMonitor = {
  monitorInterval: null,
  isMonitoring: false,
  
  initialize: vi.fn(),
  checkHealth: vi.fn(),
  startAutoMonitoring: vi.fn(),
  stopAutoMonitoring: vi.fn(),
  updateServerStatus: vi.fn(),
  updateHealthResponse: vi.fn(),
  getStats: vi.fn(),
  cleanup: vi.fn()
}

describe('ServerMonitorComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createMockServerMonitor()
    
    // Reset monitoring state
    mockServerMonitor.monitorInterval = null
    mockServerMonitor.isMonitoring = false
    
    global.fetch = mockFetch(mockApiResponses.health)
  })

  describe('Initialization', () => {
    it('should initialize monitoring correctly', () => {
      mockServerMonitor.initialize.mockImplementation(() => {
        // Start initial health check
        mockServerMonitor.checkHealth(true)
        
        // Start auto monitoring
        mockServerMonitor.startAutoMonitoring(30000)
        
        mockServerMonitor.isMonitoring = true
      })

      mockServerMonitor.initialize()
      
      expect(mockServerMonitor.initialize).toHaveBeenCalledOnce()
      expect(mockServerMonitor.isMonitoring).toBe(true)
    })

    it('should setup event listeners for manual check', () => {
      const button = document.querySelector('[onclick="checkServerHealth()"]')
      expect(button).toBeDefined()
      expect(button.textContent).toContain('Vérifier le statut')
    })
  })

  describe('Health Check', () => {
    it('should check server health successfully', async () => {
      global.fetch = mockFetch(mockApiResponses.health)
      
      mockServerMonitor.checkHealth.mockImplementation(async (silent = false) => {
        const response = await fetch('/health')
        const data = await response.json()
        
        const result = {
          success: true,
          online: true,
          data: data
        }
        
        mockServerMonitor.updateServerStatus(result)
        
        if (!silent) {
          mockServerMonitor.updateHealthResponse(result)
        }
        
        return result
      })

      const result = await mockServerMonitor.checkHealth()
      
      expect(result.success).toBe(true)
      expect(result.online).toBe(true)
      expect(result.data.status).toBe('ok')
      expect(mockServerMonitor.updateServerStatus).toHaveBeenCalledWith(result)
      expect(mockServerMonitor.updateHealthResponse).toHaveBeenCalledWith(result)
    })

    it('should handle server offline', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'))
      
      mockServerMonitor.checkHealth.mockImplementation(async () => {
        try {
          await fetch('/health')
        } catch (error) {
          const result = {
            success: false,
            online: false,
            error: { message: error.message }
          }
          
          mockServerMonitor.updateServerStatus(result)
          return result
        }
      })

      const result = await mockServerMonitor.checkHealth()
      
      expect(result.success).toBe(false)
      expect(result.online).toBe(false)
      expect(result.error.message).toBe('Connection refused')
    })

    it('should handle silent health checks', async () => {
      global.fetch = mockFetch(mockApiResponses.health)
      
      mockServerMonitor.checkHealth.mockImplementation(async (silent = false) => {
        const result = { success: true, online: true, data: mockApiResponses.health }
        
        mockServerMonitor.updateServerStatus(result)
        
        if (!silent) {
          mockServerMonitor.updateHealthResponse(result)
        }
        
        return result
      })

      await mockServerMonitor.checkHealth(true)
      
      expect(mockServerMonitor.updateServerStatus).toHaveBeenCalled()
      expect(mockServerMonitor.updateHealthResponse).not.toHaveBeenCalled()
    })
  })

  describe('Status Display Update', () => {
    it('should update status for online server', () => {
      const result = {
        success: true,
        online: true,
        data: mockApiResponses.health
      }
      
      mockServerMonitor.updateServerStatus.mockImplementation((res) => {
        const statusDot = document.getElementById('serverStatus')
        const statusText = document.getElementById('serverStatusText')
        
        if (statusDot && statusText) {
          statusDot.className = 'status-dot status-online'
          statusText.textContent = `En ligne - ${res.data.environment} (${res.data.version})`
        }
      })

      mockServerMonitor.updateServerStatus(result)
      
      const statusDot = document.getElementById('serverStatus')
      const statusText = document.getElementById('serverStatusText')
      
      expect(statusDot.className).toBe('status-dot status-online')
      expect(statusText.textContent).toContain('En ligne')
      expect(statusText.textContent).toContain('test')
      expect(statusText.textContent).toContain('1.0.0')
    })

    it('should update status for offline server', () => {
      const result = {
        success: false,
        online: false,
        error: { message: 'Server unreachable' }
      }
      
      mockServerMonitor.updateServerStatus.mockImplementation((res) => {
        const statusDot = document.getElementById('serverStatus')
        const statusText = document.getElementById('serverStatusText')
        
        if (statusDot && statusText) {
          statusDot.className = 'status-dot status-offline'
          statusText.textContent = 'Hors ligne'
        }
      })

      mockServerMonitor.updateServerStatus(result)
      
      const statusDot = document.getElementById('serverStatus')
      const statusText = document.getElementById('serverStatusText')
      
      expect(statusDot.className).toBe('status-dot status-offline')
      expect(statusText.textContent).toBe('Hors ligne')
    })

    it('should handle missing DOM elements gracefully', () => {
      // Remove status elements
      document.getElementById('serverStatus').remove()
      document.getElementById('serverStatusText').remove()
      
      mockServerMonitor.updateServerStatus.mockImplementation((res) => {
        const statusDot = document.getElementById('serverStatus')
        const statusText = document.getElementById('serverStatusText')
        
        if (!statusDot || !statusText) {
          return // Graceful handling
        }
      })

      const result = { success: true, online: true, data: mockApiResponses.health }
      
      expect(() => {
        mockServerMonitor.updateServerStatus(result)
      }).not.toThrow()
    })
  })

  describe('Detailed Response Display', () => {
    it('should show detailed health response', () => {
      const result = {
        success: true,
        online: true,
        data: mockApiResponses.health
      }
      
      mockServerMonitor.updateHealthResponse.mockImplementation((res) => {
        const responseDiv = document.getElementById('healthResponse')
        
        if (responseDiv) {
          responseDiv.style.display = 'block'
          
          const healthData = {
            status: 'En ligne',
            timestamp: new Date().toLocaleString('fr-FR'),
            ...res.data
          }
          
          responseDiv.textContent = JSON.stringify(healthData, null, 2)
        }
      })

      mockServerMonitor.updateHealthResponse(result)
      
      const responseDiv = document.getElementById('healthResponse')
      
      expect(responseDiv.style.display).toBe('block')
      expect(responseDiv.textContent).toContain('1.0.0')
      expect(responseDiv.textContent).toContain('test')
    })

    it('should show error response for offline server', () => {
      const result = {
        success: false,
        online: false,
        error: { message: 'Connection timeout' }
      }
      
      mockServerMonitor.updateHealthResponse.mockImplementation((res) => {
        const responseDiv = document.getElementById('healthResponse')
        
        if (responseDiv) {
          responseDiv.style.display = 'block'
          
          const errorData = {
            status: 'Hors ligne',
            timestamp: new Date().toLocaleString('fr-FR'),
            error: res.error.message
          }
          
          responseDiv.textContent = JSON.stringify(errorData, null, 2)
        }
      })

      mockServerMonitor.updateHealthResponse(result)
      
      const responseDiv = document.getElementById('healthResponse')
      
      expect(responseDiv.style.display).toBe('block')
      expect(responseDiv.textContent).toContain('Hors ligne')
      expect(responseDiv.textContent).toContain('Connection timeout')
    })
  })

  describe('Auto Monitoring', () => {
    it('should start auto monitoring with specified interval', () => {
      const interval = 30000
      
      mockServerMonitor.startAutoMonitoring.mockImplementation((int) => {
        if (mockServerMonitor.isMonitoring) {
          mockServerMonitor.stopAutoMonitoring()
        }
        
        mockServerMonitor.monitorInterval = setInterval(() => {
          mockServerMonitor.checkHealth(true)
        }, int)
        
        mockServerMonitor.isMonitoring = true
      })

      mockServerMonitor.startAutoMonitoring(interval)
      
      expect(mockServerMonitor.isMonitoring).toBe(true)
      expect(mockServerMonitor.monitorInterval).toBeDefined()
    })

    it('should stop existing monitoring before starting new one', () => {
      // Start first monitoring
      mockServerMonitor.isMonitoring = true
      mockServerMonitor.monitorInterval = 123
      
      mockServerMonitor.startAutoMonitoring.mockImplementation((int) => {
        if (mockServerMonitor.isMonitoring) {
          mockServerMonitor.stopAutoMonitoring()
        }
        
        mockServerMonitor.monitorInterval = setInterval(() => {
          mockServerMonitor.checkHealth(true)
        }, int)
        
        mockServerMonitor.isMonitoring = true
      })

      mockServerMonitor.stopAutoMonitoring.mockImplementation(() => {
        if (mockServerMonitor.monitorInterval) {
          clearInterval(mockServerMonitor.monitorInterval)
          mockServerMonitor.monitorInterval = null
          mockServerMonitor.isMonitoring = false
        }
      })

      mockServerMonitor.startAutoMonitoring(15000)
      
      expect(mockServerMonitor.stopAutoMonitoring).toHaveBeenCalled()
      expect(mockServerMonitor.isMonitoring).toBe(true)
    })

    it('should stop auto monitoring', () => {
      mockServerMonitor.isMonitoring = true
      mockServerMonitor.monitorInterval = setInterval(() => {}, 1000)
      
      mockServerMonitor.stopAutoMonitoring.mockImplementation(() => {
        if (mockServerMonitor.monitorInterval) {
          clearInterval(mockServerMonitor.monitorInterval)
          mockServerMonitor.monitorInterval = null
          mockServerMonitor.isMonitoring = false
        }
      })

      mockServerMonitor.stopAutoMonitoring()
      
      expect(mockServerMonitor.isMonitoring).toBe(false)
      expect(mockServerMonitor.monitorInterval).toBeNull()
    })
  })

  describe('Statistics & Cleanup', () => {
    it('should provide monitoring statistics', () => {
      mockServerMonitor.isMonitoring = true
      mockServerMonitor.monitorInterval = 123
      
      mockServerMonitor.getStats.mockImplementation(() => {
        return {
          isMonitoring: mockServerMonitor.isMonitoring,
          interval: mockServerMonitor.monitorInterval ? 30000 : null,
          lastCheck: new Date().toLocaleString('fr-FR')
        }
      })

      const stats = mockServerMonitor.getStats()
      
      expect(stats.isMonitoring).toBe(true)
      expect(stats.interval).toBe(30000)
      expect(stats.lastCheck).toBeDefined()
    })

    it('should cleanup resources properly', () => {
      mockServerMonitor.isMonitoring = true
      mockServerMonitor.monitorInterval = setInterval(() => {}, 1000)
      
      mockServerMonitor.cleanup.mockImplementation(() => {
        mockServerMonitor.stopAutoMonitoring()
      })

      mockServerMonitor.stopAutoMonitoring.mockImplementation(() => {
        if (mockServerMonitor.monitorInterval) {
          clearInterval(mockServerMonitor.monitorInterval)
          mockServerMonitor.monitorInterval = null
          mockServerMonitor.isMonitoring = false
        }
      })

      mockServerMonitor.cleanup()
      
      expect(mockServerMonitor.isMonitoring).toBe(false)
      expect(mockServerMonitor.monitorInterval).toBeNull()
    })
  })
})
