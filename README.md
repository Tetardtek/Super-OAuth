# SuperOAuth

[![CI/CD Pipeline](https://github.com/Tetardtek/Super-OAuth/actions/workflows/ci.yml/badge.svg)](https://github.com/Tetardtek/Super-OAuth/actions/workflows/ci.yml)

Système d'authentification multi-tenant avec OAuth (Discord, Twitch, Google, GitHub) et gestion JWT.

## Stack

| Couche | Tech |
|--------|------|
| Runtime | Node.js 20+, TypeScript |
| Framework | Express, TypeORM (DDD) |
| DB | MySQL 8, Redis |
| Auth | JWT access/refresh, bcrypt, CSRF, rate limiting |
| OAuth | Discord, Twitch, Google, GitHub |
| Tests | Jest (backend), Vitest (frontend) |

## Setup

```bash
git clone <repository-url> && cd Super-OAuth
npm install
cp .env.example .env   # remplir les valeurs
npm run migration:run
npm run dev
```

## Scripts

```bash
npm run dev              # dev watch mode
npm run build            # compile TypeScript
npm run test             # backend (Jest)
npm run test:frontend    # frontend (Vitest)
npm run test:all         # les deux
npm run test:coverage    # avec couverture
npm run lint             # ESLint
npm run format           # Prettier
npm run typecheck        # TypeScript strict
npm run migration:run    # migrations TypeORM
```

## Architecture DDD

```
src/
├── domain/          # Entites, value objects, regles metier
├── application/     # Use cases, interfaces, DTOs
├── infrastructure/  # Repositories, DB, OAuth providers, services
├── presentation/    # Controllers, routes, middleware
└── shared/          # Config, utils
```

## Endpoints

### Auth classique

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/register` | Inscription (rate limited: 3/h) |
| POST | `/auth/login` | Connexion (rate limited: 5/15min) |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/logout` | Logout + revocation |
| GET | `/auth/me` | Profil utilisateur |
| GET | `/auth/csrf-token` | Token CSRF |

### OAuth

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/auth/oauth/:provider` | Initier OAuth flow |
| GET | `/auth/callback/:provider` | Callback OAuth |
| GET | `/api/v1/oauth/providers` | Liste providers |
| GET | `/api/v1/oauth/linked` | Comptes lies (auth) |
| POST | `/api/v1/oauth/:provider/link` | Lier un provider (auth) |
| DELETE | `/api/v1/oauth/:provider/unlink` | Delier un provider (auth) |
| POST | `/api/v1/oauth/account/merge` | Fusionner deux comptes (auth) |

## Securite

- JWT access token: **5 minutes**, refresh token: **7 jours**
- Bcrypt (salt), CSRF tokens, Helmet CSP, rate limiting Redis
- Device fingerprinting, token blacklist Redis
- Per-tenant JWT secrets (AES-256-GCM encrypted at rest)
- Audit logs par tenant

## Multi-tenant

Tier 1-3 implementes : `tenantId` sur users/sessions/linked_accounts, per-tenant OAuth providers, JWT secrets par tenant, audit logs.

## Deploy

- **Prod** : `superoauth.tetardtek.com` — pm2 cluster 2 instances, port 3006
- **CI/CD** : GitHub Actions — tests + lint + format + typecheck + build + deploy SSH
- **Migration prod** : `NODE_ENV=production node --env-file=.env ./node_modules/.bin/typeorm migration:run -d dist/data-source.js`

## Licence

BSL 1.1 — voir `LICENSE`. Conversion automatique en Apache 2.0 prévue à la Change Date (cf. landing).
