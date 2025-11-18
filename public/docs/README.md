# SuperOAuth API Documentation

Welcome to the comprehensive API documentation for SuperOAuth - a modern OAuth authentication system.

## Start Here

### New to SuperOAuth?
Start with **[QUICK_START.md](QUICK_START.md)** for a 5-minute introduction.

### Need Full API Details?
Read **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** for complete endpoint reference.

### Debugging Issues?
Check **[ERROR_CODES.md](ERROR_CODES.md)** for error explanations and solutions.

### Building an Application?
See **[SDK_INTEGRATION_GUIDE.md](SDK_INTEGRATION_GUIDE.md)** for code examples in JavaScript, React, Vue, and Python.

### Want the Spec?
Use **[openapi.yaml](openapi.yaml)** for:
- Importing into Swagger UI
- Importing into Postman
- Generating client SDKs

### Testing the API?
Import **[postman_collection.json](postman_collection.json)** into Postman for 23 pre-configured requests.

---

## Documentation Files

| File | Size | Purpose | Best For |
|------|------|---------|----------|
| **QUICK_START.md** | 7 KB | 5-minute getting started guide | First-time users |
| **API_DOCUMENTATION.md** | 16 KB | Complete API reference | Implementation |
| **ERROR_CODES.md** | 16 KB | Error reference with solutions | Debugging |
| **SDK_INTEGRATION_GUIDE.md** | 24 KB | Code examples (4 languages) | Building apps |
| **DOCUMENTATION_INDEX.md** | 12 KB | Navigation and overview | Finding info |
| **DOCUMENTATION_SUMMARY.md** | 20 KB | Generation summary | Understanding docs |
| **openapi.yaml** | 36 KB | OpenAPI 3.0 specification | Tools & SDKs |
| **postman_collection.json** | 16 KB | Postman test collection | Manual testing |

**Total: 147 KB of documentation**

---

## API Overview

SuperOAuth provides OAuth authentication with JWT tokens.

### Key Features
- Email/password authentication
- OAuth 2.0 (Discord, Twitch, Google, GitHub)
- JWT token management
- Multi-provider account linking
- User profile management

### Base URL
```
http://localhost:3000/api/v1    (development)
https://api.superoauth.com/api/v1 (production)
```

### Authentication
```
Authorization: Bearer <access_token>
```

### Endpoints (10 total)
- 5 authentication endpoints
- 5 OAuth endpoints

---

## Quick Examples

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

### OAuth (Discord)
```bash
curl http://localhost:3000/api/v1/oauth/discord
```

### Get Current User
```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

---

## Documentation Navigation

### By Role

**I'm an API Consumer**
1. Read: QUICK_START.md
2. Reference: API_DOCUMENTATION.md
3. Test: postman_collection.json
4. Debug: ERROR_CODES.md

**I'm Building a Web App**
1. Read: QUICK_START.md
2. Choose: SDK_INTEGRATION_GUIDE.md (JavaScript/React)
3. Test: postman_collection.json
4. Reference: API_DOCUMENTATION.md

**I'm Building a Mobile App**
1. Read: QUICK_START.md
2. Use: SDK_INTEGRATION_GUIDE.md (JavaScript/TypeScript)
3. Test: postman_collection.json
4. Debug: ERROR_CODES.md

**I'm Generating SDK**
1. Use: openapi.yaml
2. Run: openapi-generator-cli

**I'm Supporting Users**
1. Reference: ERROR_CODES.md
2. Examples: API_DOCUMENTATION.md
3. Overview: DOCUMENTATION_INDEX.md

### By Topic

**Getting Started**
→ QUICK_START.md

**API Endpoints**
→ API_DOCUMENTATION.md

**Error Handling**
→ ERROR_CODES.md

**Code Examples**
→ SDK_INTEGRATION_GUIDE.md

**API Specification**
→ openapi.yaml

**Testing**
→ postman_collection.json

**Finding Docs**
→ DOCUMENTATION_INDEX.md

---

## What's Documented

### 10 API Endpoints
- POST /auth/register (Create account)
- POST /auth/login (Login)
- POST /auth/refresh (Refresh token)
- POST /auth/logout (Logout)
- GET /auth/me (Get profile)
- GET /oauth/providers (List providers)
- GET /oauth/{provider} (Start OAuth)
- GET /oauth/{provider}/callback (OAuth callback)
- GET /oauth/linked (Linked accounts)
- DELETE /oauth/{provider}/unlink (Unlink provider)

### 4 OAuth Providers
- Discord
- Twitch
- Google
- GitHub

### 20+ Error Codes
With explanations, causes, and solutions for each.

### Code Examples in
- JavaScript/TypeScript
- React
- Vue 3
- Python
- cURL

---

## Sections by Depth

### Introductory (5-15 minutes)
- QUICK_START.md - Basic overview
- DOCUMENTATION_INDEX.md - Navigation overview

### Intermediate (30-60 minutes)
- API_DOCUMENTATION.md - Complete reference
- SDK_INTEGRATION_GUIDE.md - Implementation guide

### Advanced (as needed)
- ERROR_CODES.md - Detailed error handling
- openapi.yaml - Full specification

### Practical
- postman_collection.json - Testing
- cURL examples - Command-line usage

---

## Common Tasks

### Task: Register a new user
→ See QUICK_START.md "Step 1: Register"
→ See API_DOCUMENTATION.md "/auth/register endpoint"

### Task: Login with email/password
→ See QUICK_START.md "Step 2: Login"
→ See SDK_INTEGRATION_GUIDE.md "Login" section

### Task: Implement OAuth login
→ See QUICK_START.md "OAuth Login" section
→ See SDK_INTEGRATION_GUIDE.md "OAuth Login" section

### Task: Handle token expiration
→ See SDK_INTEGRATION_GUIDE.md "Token Refresh"
→ See API_DOCUMENTATION.md "/auth/refresh"

### Task: Debug an error
→ See ERROR_CODES.md (search error code)
→ See API_DOCUMENTATION.md "Error Responses"

### Task: Setup authentication in my app
→ See SDK_INTEGRATION_GUIDE.md (choose language)
→ Copy code examples
→ Test with postman_collection.json

### Task: Generate a client SDK
→ Use openapi.yaml with openapi-generator-cli
→ See SDK_INTEGRATION_GUIDE.md for pattern

### Task: Deploy to production
→ See API_DOCUMENTATION.md "Configuration"
→ Set environment variables
→ Enable HTTPS
→ Configure OAuth providers

---

## Using Postman

1. **Import Collection**
   - Open Postman
   - File → Import → Choose postman_collection.json
   - Select Postman Collection v2.1

2. **Set Environment**
   - Click "Manage Environments"
   - Create new environment
   - Set `base_url` = http://localhost:3000

3. **Test Requests**
   - Click any request from the collection
   - Click Send
   - View response

4. **Tokens Auto-Save**
   - After login/register, tokens automatically saved
   - Other requests auto-populate with token
   - No manual copy/paste needed

---

## Using OpenAPI Spec

### In Swagger UI
1. Go to https://editor.swagger.io/
2. File → Import URL or Paste
3. Paste contents of openapi.yaml

### In Postman
1. Postman → Import
2. Choose "Raw text"
3. Paste openapi.yaml contents
4. Click Import

### Generate SDK
```bash
# Install openapi-generator
npm install -g @openapitools/openapi-generator-cli

# Generate JavaScript SDK
openapi-generator-cli generate -i openapi.yaml -g javascript -o generated-sdk

# Generate Python SDK
openapi-generator-cli generate -i openapi.yaml -g python -o generated-sdk
```

---

## File Structure

```
Super-OAuth/
├── Documentation Files (you are here)
│   ├── QUICK_START.md                (START HERE)
│   ├── API_DOCUMENTATION.md
│   ├── ERROR_CODES.md
│   ├── SDK_INTEGRATION_GUIDE.md
│   ├── DOCUMENTATION_INDEX.md
│   ├── DOCUMENTATION_SUMMARY.md
│   ├── openapi.yaml
│   ├── postman_collection.json
│   └── DOCS_README.md                (this file)
│
├── Source Code
│   ├── src/
│   │   ├── presentation/             (controllers, routes, middleware)
│   │   ├── application/              (use cases, services)
│   │   ├── domain/                   (entities, business logic)
│   │   └── infrastructure/           (database, OAuth, DI)
│   └── tests/
│
├── Configuration
│   ├── .env                          (environment variables)
│   ├── .env.example                  (template)
│   ├── package.json
│   └── tsconfig.json
│
└── Other
    ├── README.md                     (project overview)
    ├── jest.config.js
    └── public/                       (frontend assets)
```

---

## Support & Feedback

### Resources
- GitHub: https://github.com/superoauth/api
- Issues: https://github.com/superoauth/api/issues
- Email: support@superoauth.com

### Contribution
- Found a typo? Submit a PR
- Found unclear documentation? Open an issue
- Have better examples? Contribute them

---

## Documentation Versions

Current Documentation Version: 1.0.0
API Version: 1.0.0
Updated: November 18, 2025

This documentation is maintained with the code repository and versioned with releases.

---

## Quick Links

- **Getting Started:** [QUICK_START.md](QUICK_START.md)
- **Full Reference:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Error Debugging:** [ERROR_CODES.md](ERROR_CODES.md)
- **Code Examples:** [SDK_INTEGRATION_GUIDE.md](SDK_INTEGRATION_GUIDE.md)
- **API Spec:** [openapi.yaml](openapi.yaml)
- **Testing:** [postman_collection.json](postman_collection.json)
- **Navigation:** [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

---

**Ready to get started? Open [QUICK_START.md](QUICK_START.md)**
