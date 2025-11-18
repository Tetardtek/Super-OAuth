# SuperOAuth API Quick Start Guide

Get started with SuperOAuth in 5 minutes.

## Setup

### 1. Start the Server

```bash
npm install
npm run dev
```

Server runs at: `http://localhost:3000`

### 2. Health Check

```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T10:30:00Z",
  "version": "1.0.0",
  "environment": "development",
  "message": "SuperOAuth API is running"
}
```

---

## Basic Authentication Flow

### Step 1: Register a New User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "nickname": "john_doe"
  }'
```

Response:
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

**Save these tokens:**
- `accessToken` - Use for API requests (expires in 5 minutes)
- `refreshToken` - Use to get new access token (expires in 7 days)

### Step 2: Use Your Access Token

Replace `<access_token>` with the token from registration:

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "nickname": "john_doe",
      "emailVerified": false,
      "isActive": true,
      "createdAt": "2025-11-18T10:30:00Z",
      "updatedAt": "2025-11-18T10:30:00Z",
      "lastLogin": null,
      "loginCount": 0
    }
  }
}
```

### Step 3: Refresh Token (When Access Token Expires)

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

Response:
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

### Step 4: Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>"
```

---

## OAuth Login (Discord Example)

### Step 1: Get Available Providers

```bash
curl http://localhost:3000/api/v1/oauth/providers
```

Response:
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
      // ... other providers
    ],
    "count": 4
  }
}
```

### Step 2: Start OAuth Flow

```bash
curl http://localhost:3000/api/v1/oauth/discord
```

Response:
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

**Next:** Open the `authUrl` in your browser. User will authorize your app at Discord, then be redirected back to:

```
http://localhost:3000/api/v1/oauth/discord/callback?code=xxx&state=xxx
```

The server handles this automatically and returns tokens.

### Step 3: User Now Logged In

User's browser is redirected with tokens in the query string.

### Step 4: Check Linked Accounts

```bash
curl http://localhost:3000/api/v1/oauth/linked \
  -H "Authorization: Bearer <access_token>"
```

Response:
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
      }
    ],
    "count": 1
  }
}
```

---

## Using Postman

1. Download [Postman](https://www.postman.com/downloads/)
2. Import the collection: `postman_collection.json`
3. Set up environment variable:
   - `base_url`: `http://localhost:3000`
   - `access_token`: (will be saved after login)
   - `refresh_token`: (will be saved after login)
4. Run requests from the collection

---

## Common Tasks

### Change Email

```bash
curl -X POST http://localhost:3000/api/v1/auth/me/email \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "newEmail": "newemail@example.com"
  }'
```

### Unlink OAuth Provider

```bash
curl -X DELETE http://localhost:3000/api/v1/oauth/discord/unlink \
  -H "Authorization: Bearer <access_token>"
```

### Link Another OAuth Provider

1. Get auth URL: `GET /oauth/github`
2. Redirect user to auth URL
3. User authorizes
4. Server automatically links account if email matches or creates new account

---

## Error Responses

### Invalid Credentials (401)

```json
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

### User Already Exists (409)

```json
{
  "success": false,
  "error": "USER_EXISTS",
  "message": "User with this email already exists"
}
```

### Validation Error (400)

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
}
```

### Token Expired (401)

```json
{
  "success": false,
  "error": "TOKEN_EXPIRED",
  "message": "Access token has expired"
}
```

---

## Password Requirements

Passwords must have:
- 8-128 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 digit (0-9)
- At least 1 special character (!@#$%^&*(),.?":{}|<>)

**Example:** `SecurePass123!`

---

## Token Lifespans

- **Access Token:** 5 minutes
- **Refresh Token:** 7 days

When access token expires, use refresh token to get a new one without re-authentication.

---

## Rate Limiting

- **Login:** 5 attempts per 15 minutes
- **Register:** 3 attempts per 15 minutes
- **General API:** 100 requests per 15 minutes

If limit exceeded:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later."
}
```

---

## Next Steps

1. **Full API Docs:** Read `API_DOCUMENTATION.md`
2. **Error Reference:** Check `ERROR_CODES.md`
3. **SDK Integration:** See `SDK_INTEGRATION_GUIDE.md`
4. **OpenAPI Spec:** Import `openapi.yaml` into Swagger UI or Postman

---

## Support

- Documentation: See `.md` files in root
- OpenAPI Spec: `openapi.yaml`
- Postman Collection: `postman_collection.json`
- GitHub: https://github.com/superoauth/api
