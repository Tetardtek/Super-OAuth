# SuperOAuth SDK Integration Guide

Complete guide for integrating SuperOAuth into your applications.

## Table of Contents

1. [JavaScript/TypeScript SDK](#javascripttypescript-sdk)
2. [React Integration](#react-integration)
3. [Vue.js Integration](#vuejs-integration)
4. [Python Integration](#python-integration)
5. [cURL Examples](#curl-examples)

---

## JavaScript/TypeScript SDK

### Installation

```bash
npm install superoauth
# or
yarn add superoauth
```

### Basic Setup

```typescript
import { SuperOAuthClient } from 'superoauth';

const oauthClient = new SuperOAuthClient({
  baseURL: 'http://localhost:3000/api/v1',
  tokenStorage: 'localStorage', // or 'sessionStorage'
  autoRefreshTokens: true,
  tokenRefreshThreshold: 60000, // Refresh 1 min before expiry
});

// Optional: Set up token refresh on app startup
await oauthClient.ensureValidToken();
```

### Authentication Methods

#### Email/Password Registration

```typescript
try {
  const response = await oauthClient.register({
    email: 'user@example.com',
    password: 'SecurePass123!',
    nickname: 'john_doe'
  });

  console.log('Registration successful:', response.data.user);
  console.log('Tokens:', response.data.tokens);
} catch (error) {
  if (error.code === 'USER_EXISTS') {
    console.error('Email already registered');
  } else if (error.code === 'VALIDATION_ERROR') {
    console.error('Invalid input:', error.message);
  } else {
    console.error('Registration failed:', error.message);
  }
}
```

#### Email/Password Login

```typescript
try {
  const response = await oauthClient.login({
    email: 'user@example.com',
    password: 'SecurePass123!'
  });

  console.log('Login successful:', response.data.user);
} catch (error) {
  if (error.code === 'INVALID_CREDENTIALS') {
    console.error('Invalid email or password');
  } else if (error.code === 'ACCOUNT_DISABLED') {
    console.error('Account is disabled');
  } else {
    console.error('Login failed:', error.message);
  }
}
```

#### OAuth Login

```typescript
// Get available providers
const providers = await oauthClient.getOAuthProviders();
console.log('Available providers:', providers);

// Start OAuth flow with Discord
try {
  const { authUrl, state } = await oauthClient.startOAuth('discord');

  // Redirect user to authUrl
  window.location.href = authUrl;

  // Handle callback automatically if on redirect page
  const result = await oauthClient.handleOAuthCallback();
  console.log('OAuth login successful:', result.data.user);

} catch (error) {
  console.error('OAuth flow failed:', error.message);
}
```

#### Token Refresh

```typescript
try {
  const newTokens = await oauthClient.refreshToken();
  console.log('Token refreshed successfully');
} catch (error) {
  console.error('Token refresh failed:', error.message);
  // Redirect to login
  window.location.href = '/login';
}
```

#### Get Current User

```typescript
try {
  const user = await oauthClient.getCurrentUser();
  console.log('Current user:', user);
} catch (error) {
  console.error('Failed to get user:', error.message);
}
```

#### Logout

```typescript
try {
  await oauthClient.logout();
  console.log('Logged out successfully');
  window.location.href = '/login';
} catch (error) {
  console.error('Logout failed:', error.message);
}
```

### Linked Accounts Management

```typescript
// Get linked OAuth accounts
try {
  const linkedAccounts = await oauthClient.getLinkedAccounts();
  console.log('Linked accounts:', linkedAccounts);
} catch (error) {
  console.error('Failed to get linked accounts:', error.message);
}

// Unlink an OAuth provider
try {
  await oauthClient.unlinkOAuth('discord');
  console.log('Discord account unlinked successfully');
} catch (error) {
  if (error.code === 'CANNOT_UNLINK_LAST_AUTH') {
    console.error('Cannot unlink last authentication method');
  } else {
    console.error('Unlink failed:', error.message);
  }
}
```

### Making Authenticated Requests

```typescript
// SDK automatically adds Authorization header
const response = await oauthClient.request('/user/profile', {
  method: 'GET'
});

// Or use the fetch-like API
const data = await oauthClient.get('/user/profile');
```

---

## React Integration

### Setup with Context API

```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { SuperOAuthClient } from 'superoauth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  startOAuth: (provider: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const client = new SuperOAuthClient({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1',
    autoRefreshTokens: true,
  });

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        await client.ensureValidToken();
        const user = await client.getCurrentUser();
        setUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.login({ email, password });
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, nickname: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.register({ email, password, nickname });
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await client.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startOAuth = async (provider: string) => {
    try {
      const { authUrl } = await client.startOAuth(provider);
      window.location.href = authUrl;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      error,
      login,
      register,
      logout,
      startOAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Login Component

```typescript
// components/LoginForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, startOAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: string) => {
    try {
      setError(null);
      await startOAuth(provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {error && <div className="error">{error}</div>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>

      <div className="oauth-buttons">
        <button
          type="button"
          onClick={() => handleOAuthLogin('discord')}
          disabled={loading}
        >
          Login with Discord
        </button>
        <button
          type="button"
          onClick={() => handleOAuthLogin('github')}
          disabled={loading}
        >
          Login with GitHub
        </button>
      </div>
    </form>
  );
};
```

### Protected Route Component

```typescript
// components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

### Usage in App

```typescript
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

---

## Vue.js Integration

### Composable Setup

```typescript
// composables/useAuth.ts
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { SuperOAuthClient } from 'superoauth';

const client = new SuperOAuthClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  autoRefreshTokens: true,
});

const user = ref(null);
const isAuthenticated = ref(false);
const loading = ref(true);
const error = ref<string | null>(null);

export function useAuth() {
  const router = useRouter();

  const init = async () => {
    try {
      await client.ensureValidToken();
      user.value = await client.getCurrentUser();
      isAuthenticated.value = true;
    } catch {
      isAuthenticated.value = false;
      user.value = null;
    } finally {
      loading.value = false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      loading.value = true;
      error.value = null;
      const response = await client.login({ email, password });
      user.value = response.data.user;
      isAuthenticated.value = true;
      await router.push('/dashboard');
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const register = async (email: string, password: string, nickname: string) => {
    try {
      loading.value = true;
      error.value = null;
      const response = await client.register({ email, password, nickname });
      user.value = response.data.user;
      isAuthenticated.value = true;
      await router.push('/dashboard');
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    try {
      loading.value = true;
      await client.logout();
      user.value = null;
      isAuthenticated.value = false;
      await router.push('/login');
    } catch (err: any) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const startOAuth = async (provider: string) => {
    try {
      const { authUrl } = await client.startOAuth(provider);
      window.location.href = authUrl;
    } catch (err: any) {
      error.value = err.message;
      throw err;
    }
  };

  return {
    user: computed(() => user.value),
    isAuthenticated: computed(() => isAuthenticated.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    init,
    login,
    register,
    logout,
    startOAuth,
  };
}
```

### Login Component

```vue
<!-- LoginForm.vue -->
<template>
  <div class="login-form">
    <div v-if="error" class="error">{{ error }}</div>

    <form @submit.prevent="handleLogin">
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        required
      />
      <input
        v-model="password"
        type="password"
        placeholder="Password"
        required
      />
      <button :disabled="loading">
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
    </form>

    <div class="oauth-buttons">
      <button @click="handleOAuth('discord')" :disabled="loading">
        Login with Discord
      </button>
      <button @click="handleOAuth('github')" :disabled="loading">
        Login with GitHub
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';

const { login, startOAuth } = useAuth();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const handleLogin = async () => {
  try {
    loading.value = true;
    error.value = null;
    await login(email.value, password.value);
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const handleOAuth = async (provider: string) => {
  try {
    error.value = null;
    await startOAuth(provider);
  } catch (err: any) {
    error.value = err.message;
  }
};
</script>
```

### Router Guard

```typescript
// router/guards.ts
import { useAuth } from '@/composables/useAuth';
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';

export async function requireAuth(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const { isAuthenticated, loading, init } = useAuth();

  if (loading.value) {
    await init();
  }

  if (isAuthenticated.value) {
    next();
  } else {
    next('/login');
  }
}
```

---

## Python Integration

### Using Requests Library

```python
import requests
import json
from typing import Optional, Dict, Any

class SuperOAuthClient:
    def __init__(self, base_url: str = 'http://localhost:3000/api/v1'):
        self.base_url = base_url
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None

    def _get_headers(self) -> Dict[str, str]:
        headers = {'Content-Type': 'application/json'}
        if self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        return headers

    def register(self, email: str, password: str, nickname: str) -> Dict[str, Any]:
        """Register a new user"""
        response = requests.post(
            f'{self.base_url}/auth/register',
            headers=self._get_headers(),
            json={
                'email': email,
                'password': password,
                'nickname': nickname
            }
        )

        if response.status_code == 201:
            data = response.json()
            self.access_token = data['data']['tokens']['accessToken']
            self.refresh_token = data['data']['tokens']['refreshToken']
            return data['data']
        else:
            raise Exception(f"Registration failed: {response.json()['message']}")

    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Login with email and password"""
        response = requests.post(
            f'{self.base_url}/auth/login',
            headers=self._get_headers(),
            json={
                'email': email,
                'password': password
            }
        )

        if response.status_code == 200:
            data = response.json()
            self.access_token = data['data']['tokens']['accessToken']
            self.refresh_token = data['data']['tokens']['refreshToken']
            return data['data']
        else:
            raise Exception(f"Login failed: {response.json()['message']}")

    def refresh_token(self) -> Dict[str, str]:
        """Get new access token"""
        response = requests.post(
            f'{self.base_url}/auth/refresh',
            headers=self._get_headers(),
            json={'refreshToken': self.refresh_token}
        )

        if response.status_code == 200:
            data = response.json()
            self.access_token = data['data']['accessToken']
            self.refresh_token = data['data']['refreshToken']
            return data['data']
        else:
            raise Exception(f"Token refresh failed: {response.json()['message']}")

    def get_current_user(self) -> Dict[str, Any]:
        """Get current user profile"""
        response = requests.get(
            f'{self.base_url}/auth/me',
            headers=self._get_headers()
        )

        if response.status_code == 200:
            return response.json()['data']['user']
        else:
            raise Exception(f"Failed to get user: {response.json()['message']}")

    def get_oauth_providers(self) -> list:
        """Get available OAuth providers"""
        response = requests.get(
            f'{self.base_url}/oauth/providers',
            headers=self._get_headers()
        )

        if response.status_code == 200:
            return response.json()['data']['providers']
        else:
            raise Exception(f"Failed to get providers: {response.json()['message']}")

    def logout(self) -> bool:
        """Logout current user"""
        response = requests.post(
            f'{self.base_url}/auth/logout',
            headers=self._get_headers()
        )

        if response.status_code == 200:
            self.access_token = None
            self.refresh_token = None
            return True
        else:
            raise Exception(f"Logout failed: {response.json()['message']}")


# Usage Example
if __name__ == '__main__':
    client = SuperOAuthClient()

    # Register
    user_data = client.register(
        email='user@example.com',
        password='SecurePass123!',
        nickname='john_doe'
    )
    print(f"User registered: {user_data['user']['nickname']}")

    # Get current user
    user = client.get_current_user()
    print(f"Current user: {user}")

    # Get OAuth providers
    providers = client.get_oauth_providers()
    print(f"Available providers: {[p['name'] for p in providers]}")

    # Logout
    client.logout()
    print("Logged out successfully")
```

---

## cURL Examples

### Register

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "nickname": "john_doe"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Get Current User (Requires Authentication)

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Start OAuth Flow

```bash
curl -X GET "http://localhost:3000/api/v1/oauth/discord"
```

### Get Linked Accounts (Requires Authentication)

```bash
curl -X GET http://localhost:3000/api/v1/oauth/linked \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Logout (Requires Authentication)

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Error Handling

All SDKs should handle errors consistently:

```typescript
try {
  await client.login(email, password);
} catch (error) {
  if (error.code === 'INVALID_CREDENTIALS') {
    // Handle invalid credentials
    showError('Invalid email or password');
  } else if (error.code === 'VALIDATION_ERROR') {
    // Handle validation error
    showError(`Validation error: ${error.message}`);
  } else if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Handle rate limiting
    showError('Too many requests. Please wait before trying again.');
  } else {
    // Handle generic error
    showError('An error occurred. Please try again later.');
  }
}
```

---

## Best Practices

1. **Always handle token refresh** - Implement automatic token refresh before expiry
2. **Secure token storage** - Use httpOnly cookies in production
3. **Validate user input** - Validate before sending to API
4. **Implement retry logic** - Retry failed requests with exponential backoff
5. **Handle errors gracefully** - Show user-friendly error messages
6. **HTTPS in production** - Always use HTTPS for token transmission
7. **CSRF protection** - Validate OAuth state parameters
8. **Rate limiting** - Implement client-side throttling to respect rate limits

---

## Support

For SDK issues or feature requests:
- GitHub: https://github.com/superoauth/sdk-js
- Documentation: https://docs.superoauth.com
- Email: support@superoauth.com
