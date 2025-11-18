# SuperOAuth API Documentation Index

Complete documentation for the SuperOAuth authentication system. Start with Quick Start Guide for a fast introduction, then explore detailed documentation as needed.

## Documentation Files

### Getting Started (Start Here)

#### [QUICK_START.md](QUICK_START.md)
**5-minute introduction to the API**
- Server setup and health check
- Basic authentication flow (register, login, refresh)
- OAuth login example (Discord)
- Common tasks
- Error handling basics
- Rate limiting overview

**Best for:** First-time users, quick reference

---

### Comprehensive Documentation

#### [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
**Complete API reference with detailed examples**
- Overview and base URLs
- Authentication mechanisms (JWT, OAuth 2.0)
- All 13 endpoints documented with:
  - Request/response examples
  - Error scenarios
  - Parameter descriptions
  - Validation rules
- Error handling guide with solutions
- Complete authentication flows
- OAuth linking examples
- Security best practices
- Rate limiting details
- Configuration instructions

**Best for:** Full API understanding, implementation details

**Endpoints Covered:**
1. POST /auth/register
2. POST /auth/login
3. POST /auth/refresh
4. POST /auth/logout
5. GET /auth/me
6. GET /oauth/providers
7. GET /oauth/{provider}
8. GET /oauth/{provider}/callback
9. GET /oauth/linked
10. DELETE /oauth/{provider}/unlink

---

#### [ERROR_CODES.md](ERROR_CODES.md)
**Complete error reference with solutions**
- Error response format
- 20+ error codes organized by category:
  - Authentication Errors (VALIDATION_ERROR, UNAUTHORIZED, etc.)
  - User Errors (USER_EXISTS, USER_NOT_FOUND)
  - OAuth Errors (UNSUPPORTED_PROVIDER, INVALID_STATE, etc.)
  - Rate Limiting (RATE_LIMIT_EXCEEDED)
  - System Errors (INTERNAL_ERROR, TOKEN_EXCHANGE_FAILED)
- HTTP status code summary
- Error handling best practices
- Client-side error handling code examples
- Retry strategy implementation
- Token refresh implementation
- Debugging guide
- Common issues and solutions

**Best for:** Debugging, error handling, understanding API behavior

---

#### [SDK_INTEGRATION_GUIDE.md](SDK_INTEGRATION_GUIDE.md)
**Code examples for multiple platforms**
- JavaScript/TypeScript SDK installation and usage
  - Registration and login
  - OAuth flows
  - Token management
  - Account linking
- React integration
  - Context API setup
  - Login/register components
  - Protected routes
  - Complete app example
- Vue.js integration
  - Composable setup
  - Login component
  - Router guards
- Python integration
  - Complete SDK class
  - All methods documented
  - Error handling
- cURL examples for all endpoints
- Error handling patterns
- Best practices for each platform

**Best for:** Implementing client applications

---

### Machine-Readable Documentation

#### [openapi.yaml](openapi.yaml)
**OpenAPI 3.0 specification**
- Complete API definition in YAML format
- 10 endpoints with full specifications
- Request/response schemas
- Security schemes (Bearer JWT)
- Data models (User, LinkedAccount, TokenPair, etc.)
- Error responses
- Examples for every endpoint
- Can be imported into Swagger UI, Postman, or other tools

**Best for:** API documentation tools, client generation

**Usage:**
```bash
# Import into Postman
# File > Import > openapi.yaml

# View in Swagger UI
https://editor.swagger.io/ (paste openapi.yaml)

# Generate client SDK
openapi-generator-cli generate -i openapi.yaml -g javascript
```

---

#### [postman_collection.json](postman_collection.json)
**Postman API collection for testing**
- 23 pre-configured requests organized by category:
  - Health & Status (2 requests)
  - Authentication (5 requests)
  - OAuth (8 requests)
- Environment variables:
  - `base_url` - API base URL
  - `access_token` - Automatically saved after login
  - `refresh_token` - Automatically saved after login
  - `user_id` - User ID from auth response
  - OAuth state and auth URL variables
- Test scripts that automatically save tokens
- Ready-to-use for testing the entire API

**Best for:** API testing, manual testing, learning the API

**Usage:**
```bash
# In Postman:
1. File > Import > postman_collection.json
2. Set base_url environment variable
3. Run "Register User" request
4. Tokens automatically saved
5. Run other requests - tokens auto-populated
```

---

## Documentation Structure

```
Super-OAuth/
├── QUICK_START.md                    (Start here - 5 min)
├── API_DOCUMENTATION.md              (Complete reference)
├── ERROR_CODES.md                    (Error handling)
├── SDK_INTEGRATION_GUIDE.md          (Client implementation)
├── DOCUMENTATION_INDEX.md            (This file)
├── openapi.yaml                      (OpenAPI spec)
└── postman_collection.json           (Test collection)
```

---

## API Overview

### Architecture
- **Framework:** Express.js with TypeScript
- **Authentication:** JWT (JSON Web Tokens)
- **OAuth Providers:** Discord, Twitch, Google, GitHub
- **Database:** MySQL with TypeORM
- **Security:** Helmet, CORS, Rate Limiting, Input Validation

### Key Features
- Email/password authentication with JWT tokens
- OAuth 2.0 integration with 4 providers
- Automatic token refresh (access token: 5 min, refresh token: 7 days)
- Link/unlink multiple OAuth accounts
- Secure logout with token invalidation
- User profile management
- Rate limiting and CSRF protection

---

## Endpoints Summary

### Authentication (5 endpoints)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/register` | Create new user account |
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/refresh` | Get new access token |
| POST | `/auth/logout` | Logout and invalidate tokens |
| GET | `/auth/me` | Get current user profile |

### OAuth (5 endpoints)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/oauth/providers` | List supported OAuth providers |
| GET | `/oauth/{provider}` | Start OAuth flow |
| GET | `/oauth/{provider}/callback` | Handle OAuth callback |
| GET | `/oauth/linked` | Get user's linked accounts |
| DELETE | `/oauth/{provider}/unlink` | Remove linked account |

**Total Endpoints:** 10 core API endpoints + health/status endpoints

---

## Quick Navigation

### I want to...

**Get started quickly**
→ [QUICK_START.md](QUICK_START.md)

**Understand the full API**
→ [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

**Debug an error**
→ [ERROR_CODES.md](ERROR_CODES.md)

**Build a client application**
→ [SDK_INTEGRATION_GUIDE.md](SDK_INTEGRATION_GUIDE.md)

**Test the API manually**
→ [postman_collection.json](postman_collection.json)

**Use in code generation**
→ [openapi.yaml](openapi.yaml)

**Read the official spec**
→ [openapi.yaml](openapi.yaml)

---

## Authentication Methods

### Method 1: Email/Password (Classic)
```bash
POST /auth/register    # Create account
POST /auth/login       # Authenticate
POST /auth/refresh     # Refresh token
POST /auth/logout      # Sign out
GET  /auth/me         # Get profile
```

### Method 2: OAuth 2.0 (Multi-provider)
```bash
GET  /oauth/providers                  # List providers
GET  /oauth/{provider}                 # Start OAuth flow
GET  /oauth/{provider}/callback        # OAuth provider callback
GET  /oauth/linked                     # List linked accounts
DELETE /oauth/{provider}/unlink        # Remove link
```

### Authentication Headers
```
Authorization: Bearer <access_token>
```

---

## Common Use Cases

### 1. User Registration and Login Flow
1. POST `/auth/register` - Create account
2. Receive `accessToken` and `refreshToken`
3. Use `accessToken` for API requests
4. Use `refreshToken` when access token expires

**Documentation:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - "Complete Authentication Flow"

### 2. OAuth Social Login (Discord)
1. GET `/oauth/discord` - Get auth URL
2. Redirect user to auth URL
3. User authorizes at Discord
4. Discord redirects to `/oauth/discord/callback`
5. User receives tokens and is logged in

**Documentation:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - "OAuth Login Flow"

### 3. Link Multiple OAuth Accounts
1. Create account via Discord OAuth
2. Start GitHub OAuth flow
3. GitHub account automatically linked to existing user
4. GET `/oauth/linked` - See all linked accounts

**Documentation:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - "Link Multiple OAuth Accounts"

### 4. Handle Token Expiration
1. Access token expires after 5 minutes
2. Use refresh token with POST `/auth/refresh`
3. Get new access token and refresh token
4. Continue using API with new token

**Documentation:** [SDK_INTEGRATION_GUIDE.md](SDK_INTEGRATION_GUIDE.md) - Token Refresh Implementation

---

## Key Concepts

### JWT Tokens
- **Access Token:** Short-lived (5 min), used for API requests
- **Refresh Token:** Long-lived (7 days), used to get new access tokens
- **Claims:** userId, type, iat (issued at), exp (expiration)

### OAuth State
- Prevents CSRF attacks
- Stored in session
- Validated during callback
- Unique per flow

### Token Refresh
- Automatic on every refresh
- Both tokens rotated
- No user re-authentication needed
- Happens transparently in SDK

### Rate Limiting
- Login: 5/15min
- Register: 3/15min
- General: 100/15min
- Returns 429 status when exceeded

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response-specific data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

---

## Security Features

- **HTTPS in Production** - Enforce secure connections
- **JWT with Signing** - Tamper-proof tokens
- **CORS Configuration** - Control origin access
- **Helmet.js** - Security headers
- **Rate Limiting** - Prevent brute force
- **Input Validation** - Joi schema validation
- **CSRF Protection** - OAuth state validation
- **Password Hashing** - bcrypt with salt rounds
- **Secure Cookies** - httpOnly, Secure, SameSite flags

---

## Configuration

### Environment Variables
See `.env.example` for complete list. Key variables:

```env
# API
NODE_ENV=development
PORT=3000
API_VERSION=v1

# JWT
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
JWT_ACCESS_TOKEN_EXPIRE=5m
JWT_REFRESH_TOKEN_EXPIRE=7d

# OAuth Providers
DISCORD_CLIENT_ID=your_id
DISCORD_CLIENT_SECRET=your_secret

GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret

GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret

# Security
SESSION_COOKIE_SECURE=true (production only)
PASSWORD_HASH_ROUNDS=12
```

---

## Testing the API

### Using cURL
```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!","nickname":"john_doe"}'
```

### Using Postman
1. Import `postman_collection.json`
2. Set environment variables
3. Run requests (tokens auto-populated)

### Using Code
See [SDK_INTEGRATION_GUIDE.md](SDK_INTEGRATION_GUIDE.md) for examples in:
- JavaScript/TypeScript
- React
- Vue.js
- Python

---

## Version Information

- **API Version:** 1.0.0
- **OpenAPI Version:** 3.0.3
- **Node.js:** 18+
- **TypeScript:** 5.1+
- **Express:** 4.18+
- **JWT:** 9.0+

---

## Support and Resources

- **GitHub:** https://github.com/superoauth/api
- **Issues:** Report bugs and request features
- **Email:** support@superoauth.com
- **Documentation:** All .md files in root

---

## Related Documentation

- README.md - Project overview and setup
- .env.example - Environment variables reference
- Package.json - Dependencies and scripts
- OpenAPI spec - API specification
- Postman collection - API testing

---

## Document Map

**For Quick Learning:** QUICK_START.md (5 min)
**For Full Reference:** API_DOCUMENTATION.md (30 min)
**For Error Resolution:** ERROR_CODES.md (as needed)
**For Implementation:** SDK_INTEGRATION_GUIDE.md (varies)
**For Testing:** postman_collection.json
**For Automation:** openapi.yaml

---

**Last Updated:** 2025-11-18
**Documentation Version:** 1.0.0
**Status:** Complete and Production-Ready
