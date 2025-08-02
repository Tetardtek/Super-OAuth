/**
 * Mocks pour les services API SuperOAuth
 */

// Mock des réponses API typiques
export const mockApiResponses = {
  health: {
    status: 'ok',
    timestamp: '2025-07-22T17:30:00.000Z',
    version: '1.0.0',
    environment: 'test',
    message: 'SuperOAuth API is running'
  },
  
  login: {
    success: true,
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      nickname: 'testuser',
      avatar: 'https://example.com/avatar.png',
      isActive: true,
      createdAt: '2025-01-01T00:00:00.000Z'
    },
    tokens: {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 900
    }
  },
  
  register: {
    success: true,
    user: {
      id: 'new-user-456',
      email: 'newuser@example.com',
      nickname: 'newuser',
      avatar: null,
      isActive: true,
      createdAt: '2025-07-22T17:30:00.000Z'
    },
    tokens: {
      accessToken: 'mock-access-token-new',
      refreshToken: 'mock-refresh-token-new',
      expiresIn: 900
    }
  },
  
  refreshToken: {
    success: true,
    tokens: {
      accessToken: 'mock-refreshed-access-token',
      refreshToken: 'mock-refreshed-refresh-token',
      expiresIn: 900
    }
  },
  
  userProfile: {
    id: 'test-user-123',
    email: 'test@example.com',
    nickname: 'testuser',
    avatar: 'https://example.com/avatar.png',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    linkedAccounts: [
      {
        provider: 'google',
        providerId: 'google-123',
        email: 'test@gmail.com',
        linkedAt: '2025-01-15T10:00:00.000Z'
      }
    ],
    sessions: [
      {
        id: 'session-789',
        deviceInfo: 'Chrome on Windows',
        ipAddress: '127.0.0.1',
        lastActivity: '2025-07-22T17:25:00.000Z'
      }
    ]
  }
}

// Mock des erreurs API
export const mockApiErrors = {
  unauthorized: {
    error: 'Unauthorized',
    message: 'Invalid credentials',
    statusCode: 401
  },
  
  validation: {
    error: 'Validation Error',
    message: 'Invalid email format',
    statusCode: 400,
    details: ['Email must be valid']
  },
  
  serverError: {
    error: 'Internal Server Error',
    message: 'Something went wrong',
    statusCode: 500
  },
  
  notFound: {
    error: 'Not Found',
    message: 'Resource not found',
    statusCode: 404
  }
}

// Helper pour mocker fetch responses
export const mockFetch = (response, options = {}) => {
  const { status = 200, ok = true, delay = 0 } = options
  
  return vi.fn().mockImplementation(() => 
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ok,
          status,
          json: () => Promise.resolve(response),
          text: () => Promise.resolve(JSON.stringify(response))
        })
      }, delay)
    })
  )
}

// Mock pour localStorage avec données utilisateur
export const mockLocalStorageWithUser = () => {
  const userData = {
    accessToken: 'mock-stored-token',
    refreshToken: 'mock-stored-refresh',
    user: mockApiResponses.login.user
  }
  
  localStorage.setItem('auth_token', userData.accessToken)
  localStorage.setItem('refresh_token', userData.refreshToken)
  localStorage.setItem('user_data', JSON.stringify(userData.user))
  
  return userData
}

// Mock pour états d'authentification
export const mockAuthStates = {
  anonymous: () => {
    localStorage.clear()
  },
  
  authenticated: () => {
    return mockLocalStorageWithUser()
  },
  
  expired: () => {
    localStorage.setItem('auth_token', 'expired-token')
    localStorage.setItem('refresh_token', 'expired-refresh')
  }
}
