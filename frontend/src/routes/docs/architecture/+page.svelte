<script lang="ts">
	import CodeBlock from '$components/CodeBlock.svelte';
</script>

<svelte:head>
	<title>Architecture — SuperOAuth Docs</title>
</svelte:head>

<h1>Architecture</h1>
<p class="text-secondary">Clean Architecture hexagonale — TypeScript, DDD, isolation par couche.</p>

<h2>Backend — Structure DDD</h2>

<CodeBlock lang="text" code={`src/
├── domain/              # Noyau métier — zéro dépendance externe
│   ├── entities/        # User, LinkedAccount, Tenant
│   ├── value-objects/   # Email, Password
│   └── repositories/    # Interfaces (contrats)
│
├── application/         # Use Cases — orchestration métier
│   ├── use-cases/       # RegisterClassic, CompleteOAuth, LinkProvider, MergeAccounts
│   └── services/        # AuthService, UserService
│
├── infrastructure/      # Implémentations concrètes
│   ├── database/        # TypeORM entities, repositories, migrations
│   ├── oauth/           # Providers (Discord, GitHub, Google, Twitch)
│   └── services/        # AuthorizationCodeService, TenantCryptoService, TenantTokenService
│
├── presentation/        # HTTP — controllers, routes, middleware
│   ├── controllers/     # AuthController, OAuthController, PkceController
│   ├── routes/          # auth.routes, oauth.routes, pkce.routes
│   └── middleware/       # authenticate, rate-limit, authenticate-tenant
│
└── shared/              # Config, types, utilitaires transverses`} />

<h3>Flux de données</h3>

<CodeBlock lang="text" code={`HTTP Request
  → Presentation (validation, auth middleware)
    → Application (use case, orchestration)
      → Domain (règles métier pures)
        → Infrastructure (DB, Redis, OAuth provider)
          → Response`} />

<h3>Controllers</h3>

<div class="table-wrap">
	<table>
		<thead><tr><th>Controller</th><th>Routes</th><th>Rôle</th></tr></thead>
		<tbody>
			<tr><td><code>PkceController</code></td><td><code>/oauth/*</code></td><td>Authorization Server PKCE — authorize + token</td></tr>
			<tr><td><code>OAuthController</code></td><td><code>/api/v1/oauth/*</code></td><td>Link, unlink, merge, linked accounts</td></tr>
			<tr><td><code>AuthController</code></td><td><code>/api/v1/auth/*</code></td><td>Register, login, logout, refresh, me</td></tr>
		</tbody>
	</table>
</div>

<h2>Frontend — SvelteKit</h2>

<CodeBlock lang="text" code={`frontend/
├── src/
│   ├── lib/
│   │   ├── components/     # Navbar, Toast, CodeBlock
│   │   ├── services/       # api.ts (fetch wrapper + auth)
│   │   ├── stores/         # auth.ts, toast.ts (Svelte stores)
│   │   ├── styles/         # variables.css, global.css (design system)
│   │   └── types/          # User, Tenant, LinkedAccount
│   └── routes/
│       ├── /               # Landing page B2B
│       ├── /login          # Connexion (email + OAuth)
│       ├── /register       # Inscription
│       ├── /callback       # OAuth callback handler
│       ├── /dashboard      # Dashboard user (profil, comptes, merge)
│       ├── /dashboard/tenant  # Dashboard tenant (demo)
│       └── /docs/*         # Documentation (6 sections)
├── build/                  # Output adapter-static → servi par Express
└── svelte.config.js        # adapter-static, aliases`} />

<h2>Infrastructure</h2>

<div class="table-wrap">
	<table>
		<thead><tr><th>Composant</th><th>Technologie</th><th>Rôle</th></tr></thead>
		<tbody>
			<tr><td>Runtime</td><td>Node.js 22</td><td>Serveur Express</td></tr>
			<tr><td>Langage</td><td>TypeScript</td><td>Backend + Frontend</td></tr>
			<tr><td>ORM</td><td>TypeORM</td><td>Entities, migrations, repositories</td></tr>
			<tr><td>DB</td><td>MySQL 8</td><td>Users, tenants, linked accounts, auth codes</td></tr>
			<tr><td>Cache</td><td>Redis</td><td>JWT blacklist, rate limiting, PKCE state, tenant cache</td></tr>
			<tr><td>Auth</td><td>JWT + PKCE</td><td>Access + refresh tokens, authorization codes</td></tr>
			<tr><td>Frontend</td><td>SvelteKit</td><td>SPA, adapter-static, dark theme</td></tr>
			<tr><td>Process</td><td>pm2 cluster</td><td>2 instances, port 3006</td></tr>
			<tr><td>Tests</td><td>Jest + Vitest</td><td>285 tests backend, 0 régression</td></tr>
		</tbody>
	</table>
</div>

<h2>Multi-tenant</h2>

<CodeBlock lang="text" code={`Tenant
  ├── clientId (slug unique)
  ├── jwtSecret (AES-256-GCM chiffré en DB)
  ├── redirectUris[] (validées à chaque authorize)
  ├── providers[] (credentials per-tenant + fallback global)
  └── users[] (scopés par tenantId)

Résolution tenant :
  1. client_id dans la requête
  2. TenantValidationService.exists() → DB + Redis cache
  3. Credentials : tenant_providers → fallback providers globaux
  4. JWT signé avec la clé du tenant`} />

<style>
	h1 { font-size: var(--text-3xl); font-weight: 700; margin-bottom: var(--space-sm); }
	h2 { font-size: var(--text-xl); font-weight: 600; margin-top: var(--space-2xl); margin-bottom: var(--space-md); }
	h3 { font-size: var(--text-lg); font-weight: 600; margin-top: var(--space-lg); margin-bottom: var(--space-sm); }
	p { color: var(--text-secondary); line-height: 1.7; margin-bottom: var(--space-md); }
	ul { color: var(--text-secondary); padding-left: var(--space-lg); margin-bottom: var(--space-md); }
	li { margin-bottom: var(--space-sm); line-height: 1.6; }

	.table-wrap { overflow-x: auto; margin: var(--space-md) 0; }
	table { width: 100%; border-collapse: collapse; }
	th, td { text-align: left; padding: var(--space-sm) var(--space-md); border-bottom: 1px solid var(--border); font-size: var(--text-sm); }
	th { color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: var(--text-xs); letter-spacing: 0.05em; }
	td { color: var(--text-secondary); }
</style>
