# Tests Status

**Date:** 2026-03-22

## Metriques

| Suite | Tests | Framework | Duree |
|-------|-------|-----------|-------|
| Backend | 274 | Jest + ts-jest | ~13s |
| Frontend | 165 | Vitest + jsdom | ~1s |
| **Total** | **439** | | |

## Backend (274 tests — 22 suites)

### Use Cases (8 suites)
- `register-classic.test.ts` — inscription email/password
- `login-classic.test.ts` — connexion, sessions, stats
- `complete-oauth.test.ts` — OAuth flow, auto-link email
- `start-oauth.test.ts` — initiation OAuth
- `refresh-token.test.ts` — rotation tokens
- `logout.test.ts` — revocation
- `link-provider.use-case.test.ts` — link provider [SG5][SG10]
- `merge-accounts.use-case.test.ts` — merge comptes [SG7][SG8][SG9]

### Domain (2 suites)
- `user.entity.test.ts` — entite User, business rules
- `value-objects.test.ts` — Email, Nickname, Password, UserId

### Infrastructure/Services (4 suites)
- `oauth.service.test.ts` — multi-provider OAuth
- `password.service.test.ts` — bcrypt, timing attack prevention
- `tenant-crypto.service.test.ts` — AES-256-GCM
- `tenant-token.service.test.ts` — per-tenant JWT

### Services (2 suites)
- `token.service.test.ts` — JWT generation/verification
- `token-blacklist.service.test.ts` — Redis blacklist

### Middleware (4 suites)
- `auth.middleware.test.ts` — JWT verification
- `csrf.middleware.test.ts` — CSRF protection
- `rate-limit.middleware.test.ts` — rate limiting
- `validation.middleware.test.ts` — request validation
- `authenticate-tenant.middleware.test.ts` — tenant auth

### Utils (1 suite)
- `crypto.util.test.ts` — encryption, HMAC, key generation

## Frontend (165 tests — 7 suites)

- `auth-service.test.js` — login, register, logout, OAuth
- `dashboard-component.test.js` — dashboard, cache, profil
- `toast-manager.test.js` — notifications
- `token-manager.test.js` — JWT lifecycle
- `http.test.js` — HTTP client
- `ui.test.js` — DOM utils
- `validation.test.js` — validation frontend

## Commandes

```bash
npm run test             # backend
npm run test:frontend    # frontend
npm run test:all         # les deux
npm run test:coverage    # avec couverture
```
