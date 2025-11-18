# SuperOAuth API Error Codes Reference

Complete reference of all error codes returned by the SuperOAuth API with explanations and solutions.

## Error Response Format

All error responses follow this standard format:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

## Error Codes by Category

### Authentication Errors (400-401-403)

#### VALIDATION_ERROR
**HTTP Status:** 400 Bad Request

**Description:** Request validation failed. Invalid input data.

**Common Causes:**
- Missing required fields
- Invalid email format
- Password doesn't meet requirements
- Nickname format invalid
- Invalid data types

**Solutions:**
1. Check request format against API documentation
2. Validate email addresses
3. Ensure password meets complexity requirements:
   - 8-128 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one digit
   - At least one special character (!@#$%^&*(),.?":{}|<>)
4. Validate nickname (2-30 chars, alphanumeric with underscores/hyphens)

**Example Response:**
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Email must be a valid email address"
}
```

---

#### UNAUTHORIZED
**HTTP Status:** 401 Unauthorized

**Description:** Request requires authentication but no valid token provided.

**Common Causes:**
- Missing Authorization header
- No token in Authorization header
- Empty token value

**Solutions:**
1. Add Authorization header to request
2. Use format: `Authorization: Bearer <access_token>`
3. Ensure token is not empty
4. Check token hasn't expired (refresh if needed)

**Example Request:**
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

#### INVALID_CREDENTIALS
**HTTP Status:** 401 Unauthorized

**Description:** Login failed. Email or password is incorrect.

**Common Causes:**
- Wrong email address
- Wrong password
- User doesn't exist
- User account inactive

**Solutions:**
1. Check email address spelling
2. Verify password is correct
3. Ensure user account exists (register if needed)
4. Check user account is active
5. Ensure caps lock is off

**Example Response:**
```json
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

---

#### TOKEN_EXPIRED
**HTTP Status:** 401 Unauthorized

**Description:** Access token has expired.

**Common Causes:**
- Access token older than 5 minutes
- Token not refreshed in time

**Solutions:**
1. Use refresh token to obtain new access token
2. Call `POST /auth/refresh` with refresh token
3. Update Authorization header with new token
4. Implement automatic token refresh before expiry

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

#### INVALID_TOKEN
**HTTP Status:** 401 Unauthorized

**Description:** Token is malformed, invalid, or wrong type.

**Common Causes:**
- Corrupted token
- Token was tampered with
- Using refresh token as access token
- Invalid token format
- Wrong JWT signing key

**Solutions:**
1. Obtain fresh token from login or register
2. Don't try to use refresh tokens as access tokens
3. Ensure token format is correct
4. Check Authorization header format: `Bearer <token>`
5. Clear stored tokens and re-authenticate

---

#### ACCOUNT_DISABLED
**HTTP Status:** 403 Forbidden

**Description:** User account has been disabled.

**Common Causes:**
- Admin disabled account
- User suspended
- Violation of terms of service
- Suspicious activity detected

**Solutions:**
1. Contact support to appeal account status
2. Check for violation notices in email
3. Verify compliance with terms of service
4. Request account reactivation

---

#### INVALID_REFRESH_TOKEN
**HTTP Status:** 401 Unauthorized

**Description:** Refresh token is invalid, expired, or has been revoked.

**Common Causes:**
- Refresh token older than 7 days
- Token was revoked (user logged out)
- Refresh token was tampered with
- Using access token as refresh token

**Solutions:**
1. Perform login again to get new tokens
2. Don't use access tokens as refresh tokens
3. Implement token refresh before expiry (7 days)
4. Clear stored tokens and re-authenticate

---

### User Errors (409-404)

#### USER_EXISTS
**HTTP Status:** 409 Conflict

**Description:** User with this email already exists.

**Common Causes:**
- Email already registered
- Attempting to register with existing email

**Solutions:**
1. Use a different email address
2. If account is yours, login instead of register
3. Use password recovery if you forgot password
4. Contact support if account was compromised

---

#### USER_NOT_FOUND
**HTTP Status:** 404 Not Found

**Description:** User not found in database.

**Common Causes:**
- User account deleted
- User ID doesn't exist
- Account was never created

**Solutions:**
1. Register a new account
2. Verify user ID is correct
3. Use correct email address
4. Check if account exists before performing operations

---

### OAuth Errors (400-401-500)

#### UNSUPPORTED_PROVIDER
**HTTP Status:** 400 Bad Request

**Description:** Requested OAuth provider is not supported.

**Supported Providers:**
- discord
- twitch
- google
- github

**Solutions:**
1. Use one of the supported providers listed above
2. Check provider name spelling
3. Use lowercase provider names
4. Get list of providers from `GET /oauth/providers`

**Example:**
```bash
# Correct
curl http://localhost:3000/api/v1/oauth/discord

# Incorrect - will fail
curl http://localhost:3000/api/v1/oauth/facebook
```

---

#### INVALID_STATE
**HTTP Status:** 400 Bad Request

**Description:** OAuth state parameter doesn't match. Possible CSRF attack.

**Common Causes:**
- State parameter was tampered with
- Session expired
- Using different browser/device
- Session cookie cleared
- Replay attack attempt

**Solutions:**
1. Start OAuth flow again
2. Don't modify state parameter
3. Use same browser for entire flow
4. Clear browser cache and cookies
5. Ensure session cookies are enabled
6. Check system clock is synchronized

---

#### INVALID_AUTHORIZATION_CODE
**HTTP Status:** 400 Bad Request

**Description:** OAuth authorization code is invalid or expired.

**Common Causes:**
- Code already used
- Code expired (usually 10 minutes)
- Code is malformed
- Wrong OAuth provider
- Code from different OAuth app

**Solutions:**
1. Start OAuth flow again to get new code
2. Don't attempt to reuse codes
3. Complete callback immediately after authorization
4. Verify OAuth provider configuration
5. Check OAuth app credentials are correct

---

#### OAUTH_INIT_FAILED
**HTTP Status:** 500 Internal Server Error

**Description:** Failed to initialize OAuth flow.

**Common Causes:**
- OAuth provider configuration missing
- Invalid OAuth credentials
- OAuth provider unreachable
- Server error

**Solutions:**
1. Verify OAuth credentials in .env:
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - etc. for other providers
2. Check OAuth redirect URIs match provider settings
3. Verify OAuth provider is online
4. Check server logs for detailed error
5. Retry request after a few moments
6. Contact support if problem persists

---

#### ACCOUNT_LINK_FAILED
**HTTP Status:** 500 Internal Server Error

**Description:** Failed to link OAuth account to existing user.

**Common Causes:**
- Database error
- Account already linked
- Conflicting account data
- Server error

**Solutions:**
1. Try linking again
2. Check if provider already linked with `GET /oauth/linked`
3. Unlink existing provider if needed
4. Check database connection
5. Review server logs
6. Contact support if issue persists

---

#### CANNOT_UNLINK_LAST_AUTH
**HTTP Status:** 400 Bad Request

**Description:** Cannot unlink this provider - it's the only authentication method.

**Common Causes:**
- Attempting to unlink only linked OAuth account
- No password set for account
- No verified email

**Solutions:**
1. Set a password for the account first (if applicable)
2. Verify email address
3. Link another OAuth provider before unlinking this one
4. Keep at least one authentication method

**Example:**
If user only has Discord OAuth linked:
```bash
# First set password
POST /api/v1/user/password
# OR link another provider
# Then unlink Discord
DELETE /api/v1/oauth/discord/unlink
```

---

### System Errors (500)

#### INTERNAL_ERROR
**HTTP Status:** 500 Internal Server Error

**Description:** Unexpected server error occurred.

**Common Causes:**
- Database connection error
- Service unavailable
- Unhandled exception
- Resource limit exceeded
- Configuration error

**Solutions:**
1. Retry the request (may be temporary)
2. Wait a few moments and try again
3. Check server status page
4. Review server logs for detailed error
5. Ensure database is running
6. Verify environment variables are set correctly
7. Contact support with error details

**Debug Information:**
- Check server logs: `npm run logs`
- Verify database connection: `npm run db:status`
- Check environment: `npm run config:validate`

---

#### TOKEN_EXCHANGE_FAILED
**HTTP Status:** 500 Internal Server Error

**Description:** Failed to exchange OAuth authorization code for tokens.

**Common Causes:**
- OAuth provider returned error
- Invalid code
- Provider API unreachable
- Authentication failure
- Network error

**Solutions:**
1. Check OAuth provider status
2. Verify OAuth credentials
3. Start OAuth flow again
4. Check network connectivity
5. Review server logs for provider error
6. Verify redirect URI is whitelisted at provider

---

#### USER_INFO_FAILED
**HTTP Status:** 500 Internal Server Error

**Description:** Failed to retrieve user information from OAuth provider.

**Common Causes:**
- Provider API error
- Invalid token from provider
- Insufficient scopes
- Provider unreachable
- Network error

**Solutions:**
1. Check OAuth scopes in .env:
   ```env
   DISCORD_SCOPES=identify,email
   GOOGLE_SCOPES=openid,profile,email
   GITHUB_SCOPES=user:email
   ```
2. Verify provider API endpoints
3. Check network connectivity
4. Retry after a few moments
5. Review server logs for provider error
6. Contact OAuth provider support if persistent

---

### Rate Limiting Errors (429)

#### RATE_LIMIT_EXCEEDED
**HTTP Status:** 429 Too Many Requests

**Description:** Rate limit exceeded for this endpoint.

**Limits:**
- Login: 5 attempts per 15 minutes
- Register: 3 attempts per 15 minutes
- General API: 100 requests per 15 minutes

**Common Causes:**
- Too many requests in short time
- Automated requests/bots
- Testing with scripts
- Network retry loops

**Solutions:**
1. Wait 15 minutes before retrying
2. Implement exponential backoff
3. Use `Retry-After` header value
4. Monitor rate limit headers:
   - `X-RateLimit-Limit`
   - `X-RateLimit-Remaining`
   - `X-RateLimit-Reset`
5. Implement client-side throttling

**Example Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1731001800
```

---

## HTTP Status Code Summary

| Code | Meaning | Common Errors |
|------|---------|---------------|
| 200 | OK | Success response |
| 201 | Created | Resource created (register) |
| 400 | Bad Request | Validation, invalid input |
| 401 | Unauthorized | Invalid credentials, expired token |
| 403 | Forbidden | Account disabled, insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource exists (user email exists) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Error Handling Best Practices

### Client-Side Error Handling

```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific errors
      switch (data.error) {
        case 'TOKEN_EXPIRED':
          // Refresh token and retry
          await refreshAccessToken();
          return apiCall(endpoint, options);

        case 'INVALID_CREDENTIALS':
          // Show login error
          showError('Invalid email or password');
          break;

        case 'RATE_LIMIT_EXCEEDED':
          // Show rate limit message
          showError('Too many requests. Please wait before trying again.');
          break;

        default:
          showError(data.message || 'An error occurred');
      }

      return null;
    }

    return data.data;
  } catch (error) {
    console.error('API Error:', error);
    showError('Network error. Please check your connection.');
    return null;
  }
}
```

### Retry Strategy

```javascript
async function apiCallWithRetry(endpoint, options = {}, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(endpoint, options);
      const data = await response.json();

      if (response.ok) {
        return data;
      }

      // Don't retry client errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(data.message || 'Request failed');
      }

      lastError = data;

      // Exponential backoff for retries
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
```

### Token Refresh Implementation

```javascript
async function ensureValidToken() {
  const token = localStorage.getItem('accessToken');
  const expiresAt = localStorage.getItem('tokenExpiresAt');

  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;

  // Refresh if expires in less than 1 minute
  if (timeUntilExpiry < 60000) {
    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: localStorage.getItem('refreshToken')
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('tokenExpiresAt', now + 300000); // 5 minutes
      } else {
        // Refresh failed - redirect to login
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      window.location.href = '/login';
    }
  }
}
```

---

## Debugging Guide

### Enable Debug Logging

```bash
# Set environment variable
export DEBUG=superoauth:*
npm run dev
```

### Common Issues and Solutions

#### "Cannot connect to server"
1. Verify server is running: `npm run dev`
2. Check port 3000 is not in use: `lsof -i :3000`
3. Verify base URL in configuration
4. Check network connectivity

#### "Invalid JWT token"
1. Clear stored tokens
2. Re-authenticate with login/register
3. Check JWT_SECRET in .env matches server
4. Verify token format: `Bearer <token>`

#### "Database connection failed"
1. Verify MySQL is running
2. Check database credentials in .env
3. Verify database exists: `CREATE DATABASE superoauth;`
4. Check user has proper permissions

#### "OAuth flow hangs"
1. Check OAuth credentials in .env
2. Verify redirect URIs match provider settings
3. Check network connectivity to provider
4. Review server logs for errors

---

## Support

For unresolved errors:
1. Check this error reference
2. Review server logs: `npm run logs`
3. Check API documentation
4. Open issue on GitHub
5. Contact support@superoauth.com
