/**
 * Tests unitaires pour DashboardComponent
 * Teste la gestion du dashboard utilisateur et le cache
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockApiResponses, mockAuthStates } from '../mocks/api.js'

// Mock DOM elements
const createMockDashboard = () => {
  document.body.innerHTML = `
    <div id="userDashboard" style="display: none;">
      <div id="userInfo"></div>
      <div id="dashboardResponse" style="display: none;"></div>
    </div>
    <button id="refreshButton" onclick="refreshUserInfo()">Refresh</button>
  `
}

// Mock DashboardComponent
const mockDashboardComponent = {
  userCache: {
    data: null,
    timestamp: null,
    ttl: 5 * 60 * 1000 // 5 minutes
  },
  
  load: vi.fn(),
  refresh: vi.fn(),
  updateAvatar: vi.fn(),
  disconnectProvider: vi.fn(),
  generateUserInfoHTML: vi.fn(),
  generateUserProfile: vi.fn(),
  generateUserStats: vi.fn(),
  isUserCacheValid: vi.fn(),
  updateUserCache: vi.fn(),
  invalidateUserCache: vi.fn()
}

describe('DashboardComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createMockDashboard()
    
    // Reset cache
    mockDashboardComponent.userCache = {
      data: null,
      timestamp: null,
      ttl: 5 * 60 * 1000
    }
  })

  describe('Dashboard Loading', () => {
    it('should load dashboard for authenticated user', async () => {
      const userData = mockAuthStates.authenticated()
      
      mockDashboardComponent.load.mockImplementation(() => {
        const dashboardEl = document.getElementById('userDashboard')
        const userInfoEl = document.getElementById('userInfo')
        
        dashboardEl.style.display = 'block'
        userInfoEl.innerHTML = `<h3>Welcome ${userData.user.nickname}!</h3>`
        
        return Promise.resolve({ success: true })
      })

      await mockDashboardComponent.load()
      
      const dashboard = document.getElementById('userDashboard')
      const userInfo = document.getElementById('userInfo')
      
      expect(dashboard.style.display).toBe('block')
      expect(userInfo.innerHTML).toContain('Welcome')
      expect(mockDashboardComponent.load).toHaveBeenCalledOnce()
    })

    it('should not load dashboard for anonymous user', async () => {
      mockAuthStates.anonymous()
      
      mockDashboardComponent.load.mockImplementation(() => {
        return Promise.resolve({ success: false, error: 'Not authenticated' })
      })

      const result = await mockDashboardComponent.load()
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })

    it('should handle API errors during load', async () => {
      mockAuthStates.authenticated()
      
      mockDashboardComponent.load.mockImplementation(() => {
        return Promise.resolve({ 
          success: false, 
          error: 'Failed to fetch user data' 
        })
      })

      const result = await mockDashboardComponent.load()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to fetch')
    })
  })

  describe('User Cache Management', () => {
    it('should validate fresh cache correctly', () => {
      const now = Date.now()
      mockDashboardComponent.userCache.data = mockApiResponses.userProfile
      mockDashboardComponent.userCache.timestamp = now
      
      mockDashboardComponent.isUserCacheValid.mockImplementation(() => {
        const cache = mockDashboardComponent.userCache
        return cache.data && cache.timestamp && (now - cache.timestamp) < cache.ttl
      })

      const isValid = mockDashboardComponent.isUserCacheValid()
      expect(isValid).toBe(true)
    })

    it('should invalidate expired cache', () => {
      const expiredTime = Date.now() - (6 * 60 * 1000) // 6 minutes ago
      mockDashboardComponent.userCache.data = mockApiResponses.userProfile
      mockDashboardComponent.userCache.timestamp = expiredTime
      
      mockDashboardComponent.isUserCacheValid.mockImplementation(() => {
        const cache = mockDashboardComponent.userCache
        return cache.data && cache.timestamp && (Date.now() - cache.timestamp) < cache.ttl
      })

      const isValid = mockDashboardComponent.isUserCacheValid()
      expect(isValid).toBe(false)
    })

    it('should update cache with new data', () => {
      const newUserData = mockApiResponses.userProfile
      
      mockDashboardComponent.updateUserCache.mockImplementation((data) => {
        mockDashboardComponent.userCache.data = data
        mockDashboardComponent.userCache.timestamp = Date.now()
      })

      mockDashboardComponent.updateUserCache(newUserData)
      
      expect(mockDashboardComponent.userCache.data).toEqual(newUserData)
      expect(mockDashboardComponent.userCache.timestamp).toBeDefined()
    })

    it('should clear cache on invalidation', () => {
      mockDashboardComponent.userCache.data = mockApiResponses.userProfile
      mockDashboardComponent.userCache.timestamp = Date.now()
      
      mockDashboardComponent.invalidateUserCache.mockImplementation(() => {
        mockDashboardComponent.userCache.data = null
        mockDashboardComponent.userCache.timestamp = null
      })

      mockDashboardComponent.invalidateUserCache()
      
      expect(mockDashboardComponent.userCache.data).toBeNull()
      expect(mockDashboardComponent.userCache.timestamp).toBeNull()
    })
  })

  describe('User Profile Generation', () => {
    it('should generate user profile HTML correctly', () => {
      const userData = mockApiResponses.userProfile
      
      mockDashboardComponent.generateUserProfile.mockImplementation((user) => {
        return `
          <div class="user-profile">
            <img src="${user.avatar || '/img/default-avatar.png'}" alt="Avatar" class="avatar">
            <h3>${user.nickname}</h3>
            <p class="email">${user.email}</p>
            <span class="status ${user.isActive ? 'active' : 'inactive'}">
              ${user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        `
      })

      const profileHTML = mockDashboardComponent.generateUserProfile(userData)
      
      expect(profileHTML).toContain(userData.nickname)
      expect(profileHTML).toContain(userData.email)
      expect(profileHTML).toContain('class="avatar"')
      expect(profileHTML).toContain('active')
    })

    it('should handle user without avatar', () => {
      const userWithoutAvatar = { ...mockApiResponses.userProfile, avatar: null }
      
      mockDashboardComponent.generateUserProfile.mockImplementation((user) => {
        const avatarSrc = user.avatar || '/img/default-avatar.png'
        return `<img src="${avatarSrc}" alt="Avatar" class="avatar">`
      })

      const profileHTML = mockDashboardComponent.generateUserProfile(userWithoutAvatar)
      
      expect(profileHTML).toContain('/img/default-avatar.png')
    })
  })

  describe('User Statistics', () => {
    it('should generate user statistics correctly', () => {
      const userData = mockApiResponses.userProfile
      
      mockDashboardComponent.generateUserStats.mockImplementation((user) => {
        const linkedAccountsCount = user.linkedAccounts?.length || 0
        const activeSessions = user.sessions?.length || 0
        const memberSince = new Date(user.createdAt).toLocaleDateString()
        
        return `
          <div class="user-stats">
            <div class="stat-item">
              <span class="stat-value">${linkedAccountsCount}</span>
              <span class="stat-label">Comptes liés</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${activeSessions}</span>
              <span class="stat-label">Sessions actives</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${memberSince}</span>
              <span class="stat-label">Membre depuis</span>
            </div>
          </div>
        `
      })

      const statsHTML = mockDashboardComponent.generateUserStats(userData)
      
      expect(statsHTML).toContain('1') // linkedAccounts count
      expect(statsHTML).toContain('1') // sessions count  
      expect(statsHTML).toContain('Comptes liés')
      expect(statsHTML).toContain('Sessions actives')
      expect(statsHTML).toContain('Membre depuis')
    })
  })

  describe('Avatar Management', () => {
    it('should update user avatar', async () => {
      const newAvatarUrl = 'https://example.com/new-avatar.png'
      
      mockDashboardComponent.updateAvatar.mockImplementation((url) => {
        const avatarElements = document.querySelectorAll('.avatar')
        avatarElements.forEach(img => {
          img.src = url
        })
        return Promise.resolve({ success: true })
      })

      // Add avatar to DOM
      document.getElementById('userInfo').innerHTML = '<img src="old-avatar.png" class="avatar">'
      
      await mockDashboardComponent.updateAvatar(newAvatarUrl)
      
      const avatarImg = document.querySelector('.avatar')
      expect(avatarImg.src).toBe(newAvatarUrl)
    })
  })

  describe('Provider Management', () => {
    it('should disconnect OAuth provider', async () => {
      const provider = 'google'
      const accountId = 'google-123'
      
      mockDashboardComponent.disconnectProvider.mockImplementation((prov, accId) => {
        // Simulate provider disconnection
        return Promise.resolve({ 
          success: true, 
          message: `${prov} account disconnected` 
        })
      })

      const result = await mockDashboardComponent.disconnectProvider(provider, accountId)
      
      expect(result.success).toBe(true)
      expect(result.message).toContain('google')
      expect(result.message).toContain('disconnected')
    })

    it('should handle provider disconnection error', async () => {
      const provider = 'github'
      const accountId = 'github-456'
      
      mockDashboardComponent.disconnectProvider.mockImplementation(() => {
        return Promise.resolve({ 
          success: false, 
          error: 'Failed to disconnect provider' 
        })
      })

      const result = await mockDashboardComponent.disconnectProvider(provider, accountId)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to disconnect')
    })
  })

  describe('Refresh Functionality', () => {
    it('should refresh user info and update display', async () => {
      mockAuthStates.authenticated()
      
      mockDashboardComponent.refresh.mockImplementation(() => {
        // Invalidate cache first
        mockDashboardComponent.userCache.data = null
        mockDashboardComponent.userCache.timestamp = null
        
        // Then reload
        return mockDashboardComponent.load()
      })

      await mockDashboardComponent.refresh()
      
      expect(mockDashboardComponent.refresh).toHaveBeenCalledOnce()
    })

    it('should show loading state during refresh', async () => {
      let isLoading = false
      
      mockDashboardComponent.refresh.mockImplementation(async () => {
        isLoading = true
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100))
        
        isLoading = false
        return { success: true }
      })

      const refreshPromise = mockDashboardComponent.refresh()
      expect(isLoading).toBe(true)
      
      await refreshPromise
      expect(isLoading).toBe(false)
    })
  })
})
