# SuperOAuth API Documentation

Complete API reference for the SuperOAuth authentication system.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [Endpoints Reference](#endpoints-reference)
5. [Error Handling](#error-handling)
6. [Examples](#examples)
7. [Security](#security)
8. [Rate Limiting](#rate-limiting)

## Overview

SuperOAuth is a comprehensive authentication API supporting:
- Classic email/password authentication with JWT tokens
- OAuth 2.0 integration with 4 providers (Discord, Twitch, Google, GitHub)
- Secure token refresh mechanism
- Linked account management
- User profile management

### Base URLs

```
Development: http://localhost:3000/api/v1
Production:  https://api.superoauth.com/api/v1
```

### API Version

Current version: **1.0.0**

All endpoints are prefixed with `/api/v1`

## Getting Started

### 1. Server Health Check

Before using the API, verify the server is running:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T10:30:00Z",
  "version": "1.0.0",
  "environment": "development",
  "message": "SuperOAuth API is running"
}
```

### 2. API Status

Get API version and available endpoints:

```bash
curl http://localhost:3000/api/v1
```

### 3. Register Your First User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "nickname": "john_doe"
  }'
```

## Authentication

### JWT Bearer Token

Most endpoints require authentication using JWT access tokens.

**Header Format:**
```
Authorization: Bearer <access_token>
```

**Token Claims:**
- `userId` - User ID
- `type` - Token type ("access" or "refresh")
- `iat` - Issued at timestamp
- `exp` - Expiration timestamp

**Lifespans:**
- Access Token: 5 minutes
- Refresh Token: 7 days

### Token Refresh Flow

Access tokens expire after 5 minutes. Use refresh tokens to obtain new access tokens:

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

## Endpoints Reference

### Authentication Endpoints

#### 1. Register User

**Endpoint:** `POST /auth/register`

Create a new user account with email/password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "nickname": "john_doe"
}
```

**Validation:**
- Email: Valid format, unique
- Password: 8-128 characters, uppercase, lowercase, digit, special character
- Nickname: 2-30 characters, alphanumeric with underscores/hyphens

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "nickname": "john_doe",
      "emailVerified": false,
      "isActive": true,
      "createdAt": "2025-11-18T10:30:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Responses:**

409 - User already exists
```json
{
  "success": false,
  "error": "USER_EXISTS",
  "message": "User with this email already exists"
}
```

400 - Validation error
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
}
```

---

#### 2. Login User

**Endpoint:** `POST /auth/login`

Authenticate with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "nickname": "john_doe",
      "emailVerified": true,
      "isActive": true,
      "lastLoginAt": "2025-11-18T10:25:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Responses:**

401 - Invalid credentials
```json
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

403 - Account disabled
```json
{
  "success": false,
  "error": "ACCOUNT_DISABLED",
  "message": "Account is disabled"
}
```

**Rate Limiting:** 5 attempts per 15 minutes

---

#### 3. Refresh Token

**Endpoint:** `POST /auth/refresh`

Get a new access token using a refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

401 - Invalid or expired token
```json
{
  "success": false,
  "error": "INVALID_REFRESH_TOKEN",
  "message": "Invalid or expired refresh token"
}
```

---

#### 4. Logout

**Endpoint:** `POST /auth/logout`

Logout the current user and invalidate tokens.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request (optional):**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

#### 5. Get Current User

**Endpoint:** `GET /auth/me`

Get the current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "nickname": "john_doe",
      "emailVerified": true,
      "isActive": true,
      "createdAt": "2025-11-18T08:00:00Z",
      "updatedAt": "2025-11-18T10:30:00Z",
      "lastLogin": "2025-11-18T10:25:00Z",
      "loginCount": 15
    }
  }
}
```

---

### OAuth Endpoints

#### 1. Get Available Providers

**Endpoint:** `GET /oauth/providers`

Get list of supported OAuth providers.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "name": "discord",
        "displayName": "Discord",
        "icon": "https://cdn.discordapp.com/icons/...",
        "color": "#5865F2",
        "url": "https://discord.com"
      },
      {
        "name": "twitch",
        "displayName": "Twitch",
        "icon": "https://static.twitchcdn.net/...",
        "color": "#9146FF",
        "url": "https://twitch.tv"
      },
      {
        "name": "google",
        "displayName": "Google",
        "icon": "https://www.gstatic.com/...",
        "color": "#4285F4",
        "url": "https://google.com"
      },
      {
        "name": "github",
        "displayName": "GitHub",
        "icon": "https://github.githubassets.com/...",
        "color": "#000000",
        "url": "https://github.com"
      }
    ],
    "count": 4
  }
}
```

---

#### 2. Start OAuth Flow

**Endpoint:** `GET /oauth/{provider}`

Initiate OAuth authentication with a provider.

**Parameters:**
- `provider` (path): discord, twitch, google, or github (required)
- `redirect_uri` (query): Custom redirect URI (optional)

**Example:**
```bash
curl http://localhost:3000/api/v1/oauth/discord
```

**Response (200):**
```json
{
  "success": true,
  "message": "OAuth flow initiated",
  "data": {
    "authUrl": "https://discord.com/api/oauth2/authorize?client_id=...",
    "state": "state_1731000000_abcdef123456",
    "provider": "discord"
  }
}
```

**Steps:**
1. Get `authUrl` from this endpoint
2. Redirect user's browser to `authUrl`
3. User authorizes at provider
4. Provider redirects back to `/oauth/{provider}/callback`

---

#### 3. Handle OAuth Callback

**Endpoint:** `GET /oauth/{provider}/callback`

OAuth provider redirect endpoint. Called automatically by the provider.

**Query Parameters:**
- `code` (required): Authorization code
- `state` (required): State for CSRF validation
- `error` (optional): Error from provider

**Behavior:**
- New OAuth identity → Create new user
- Matching email → Link to existing user
- Existing OAuth link → Login existing user

**Response (200 - New User):**
```json
{
  "success": true,
  "message": "User registered via OAuth",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@discord.com",
      "nickname": "discord_user",
      "authProvider": "discord",
      "isActive": true,
      "createdAt": "2025-11-18T10:30:00Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 300
    },
    "isNewUser": true
  }
}
```

---

#### 4. Get Linked Accounts

**Endpoint:** `GET /oauth/linked`

Get all OAuth accounts linked to the current user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "linkedAccounts": [
      {
        "provider": "discord",
        "providerId": "123456789012345678",
        "email": "user@discord.com",
        "nickname": "discord_user",
        "displayName": "discord_user#1234",
        "avatar": "https://cdn.discordapp.com/avatars/...",
        "linkedAt": "2025-11-18T08:00:00Z"
      },
      {
        "provider": "github",
        "providerId": "12345678",
        "email": "user@github.com",
        "nickname": "github_user",
        "displayName": "GitHub User",
        "avatar": "https://avatars.githubusercontent.com/u/...",
        "linkedAt": "2025-11-18T09:15:00Z"
      }
    ],
    "count": 2
  }
}
```

---

#### 5. Unlink OAuth Provider

**Endpoint:** `DELETE /oauth/{provider}/unlink`

Remove a linked OAuth account.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Parameters:**
- `provider` (path): discord, twitch, google, or github (required)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Successfully unlinked discord account",
    "provider": "discord"
  }
}
```

**Error Responses:**

400 - Cannot unlink last auth method
```json
{
  "success": false,
  "error": "CANNOT_UNLINK_LAST_AUTH",
  "message": "Cannot unlink last authentication method. Please set a password first."
}
```

---

## Error Handling

### Error Response Format

All errors follow this standard format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

### Common Error Codes

| Code | HTTP | Description | Solution |
|------|------|-------------|----------|
| VALIDATION_ERROR | 400 | Request validation failed | Check request format and values |
| UNAUTHORIZED | 401 | Missing or invalid token | Add valid Authorization header |
| TOKEN_EXPIRED | 401 | Access token expired | Use refresh token to get new one |
| INVALID_TOKEN | 401 | Malformed or invalid token | Get valid token from login/register |
| INVALID_CREDENTIALS | 401 | Wrong email or password | Check credentials and try again |
| USER_EXISTS | 409 | Email already registered | Use different email or login |
| ACCOUNT_DISABLED | 403 | User account is disabled | Contact support |
| INVALID_STATE | 400 | CSRF state mismatch (OAuth) | Potential CSRF attack, start over |
| INVALID_AUTHORIZATION_CODE | 400 | OAuth code invalid/expired | Start OAuth flow again |
| UNSUPPORTED_PROVIDER | 400 | Invalid OAuth provider | Use: discord, twitch, google, github |
| INTERNAL_ERROR | 500 | Server error | Retry or contact support |

---

## Examples

### Complete Authentication Flow

#### Step 1: Register

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "nickname": "john_doe"
  }'
```

Response: Access token and refresh token

#### Step 2: Use Access Token

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

#### Step 3: Refresh Token (After 5 mins)

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

#### Step 4: Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>"
```

---

### OAuth Login Flow (Discord)

#### Step 1: Get Providers

```bash
curl http://localhost:3000/api/v1/oauth/providers
```

#### Step 2: Start OAuth Flow

```bash
curl http://localhost:3000/api/v1/oauth/discord
```

Get the `authUrl` and redirect user's browser to it.

#### Step 3: Provider Redirects Back

Provider redirects to:
```
http://localhost:3000/api/v1/oauth/discord/callback?code=xxx&state=xxx
```

This happens automatically. The server responds with tokens.

#### Step 4: Use Tokens

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

---

### Link Multiple OAuth Accounts

#### Step 1: OAuth Login with Discord

Complete OAuth flow for Discord (creates account)

#### Step 2: Start GitHub OAuth

```bash
curl http://localhost:3000/api/v1/oauth/github
```

Redirect user to authorize with GitHub

#### Step 3: Complete GitHub OAuth

Provider redirects back. System recognizes existing user by email and links GitHub account.

#### Step 4: Verify Linked Accounts

```bash
curl http://localhost:3000/api/v1/oauth/linked \
  -H "Authorization: Bearer <access_token>"
```

Shows both discord and github linked.

---

## Security

### Best Practices

1. **HTTPS Only in Production**
   - Always use HTTPS in production
   - Set `SESSION_COOKIE_SECURE=true` in .env

2. **Secure Token Storage**
   - Store tokens in secure, httpOnly cookies (recommended)
   - Never store in localStorage for sensitive apps
   - Transmit only over HTTPS

3. **Token Rotation**
   - Automatically refresh tokens before expiry
   - Don't keep tokens longer than necessary
   - Rotate refresh tokens periodically

4. **CSRF Protection**
   - OAuth state parameter prevents CSRF
   - Validate state matches session
   - Use POST for sensitive operations

5. **Rate Limiting**
   - Login: 5 attempts per 15 minutes
   - Register: 3 attempts per 15 minutes
   - General API: 100 requests per 15 minutes

6. **Input Validation**
   - Email format validation
   - Password complexity requirements
   - Nickname format restrictions
   - All inputs are validated server-side

---

## Rate Limiting

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 5 | 15 minutes |
| `/auth/register` | 3 | 15 minutes |
| `/auth/refresh` | 100 | 15 minutes |
| Other `/auth/*` | 100 | 15 minutes |
| `/oauth/*` | 100 | 15 minutes |

### Rate Limit Headers

Responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1731000900
```

When limit exceeded:
```
HTTP/1.1 429 Too Many Requests

{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later."
}
```

---

## Configuration

### Environment Variables

Set these in `.env` file for OAuth integration:

```env
# OAuth Providers
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Frontend URLs
FRONTEND_URL=http://localhost:3001
FRONTEND_LOGIN_SUCCESS_URL=http://localhost:3001/auth/success
FRONTEND_LOGIN_ERROR_URL=http://localhost:3001/auth/error

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_ACCESS_TOKEN_EXPIRE=5m
JWT_REFRESH_TOKEN_EXPIRE=7d

# Security
SESSION_COOKIE_SECURE=false  # true in production
SESSION_COOKIE_HTTP_ONLY=true
PASSWORD_HASH_ROUNDS=12
```

---

## Support

For issues, feature requests, or questions:
- GitHub: https://github.com/superoauth/api
- Issues: https://github.com/superoauth/api/issues
- Email: support@superoauth.com
