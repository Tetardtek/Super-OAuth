<script lang="ts">
	import CodeBlock from '$components/CodeBlock.svelte';

	interface Endpoint {
		method: string;
		path: string;
		auth: 'public' | 'platform-jwt' | 'tenant-member' | 'tenant-owner';
		desc: string;
		body?: string;
		response?: string;
	}

	const authEndpoints: Endpoint[] = [
		{
			method: 'POST',
			path: '/api/v1/platform/auth/signup',
			auth: 'public',
			desc: 'Créer un compte plateforme (SaaS client owner). Envoie un email de vérification.',
			body: `{ "email": "owner@example.com", "password": "12CharsMin!" }`,
			response: `202 { "success": true, "message": "VERIFICATION_EMAIL_SENT", "data": { "email": "..." } }
// Réponse identique pour email déjà vérifié (anti-enumeration).`
		},
		{
			method: 'GET',
			path: '/api/v1/platform/auth/verify-email/:token',
			auth: 'public',
			desc: 'Valide le token de vérification (lien email, 24h).',
			response: `200 { "success": true, "message": "EMAIL_VERIFIED", "data": { "email": "..." } }
400 INVALID_TOKEN — token expiré, invalide, ou déjà utilisé.`
		},
		{
			method: 'POST',
			path: '/api/v1/platform/auth/login',
			auth: 'public',
			desc: 'Authentifie un platform user. Retourne access + refresh tokens.',
			body: `{ "email": "...", "password": "..." }`,
			response: `200 { data: { accessToken, refreshToken, platformUser } }
401 INVALID_CREDENTIALS
403 EMAIL_NOT_VERIFIED | REQUIRES_PASSWORD_RESET`
		},
		{
			method: 'POST',
			path: '/api/v1/platform/auth/refresh',
			auth: 'public',
			desc: 'Rotation : ancien refresh révoqué, nouvelle paire émise.',
			body: `{ "refreshToken": "..." }`,
			response: `200 { data: { accessToken, refreshToken } }
401 INVALID_REFRESH_TOKEN`
		},
		{
			method: 'POST',
			path: '/api/v1/platform/auth/logout',
			auth: 'public',
			desc: 'Révoque une session (idempotent).',
			body: `{ "refreshToken": "..." }`,
			response: `204 No Content`
		},
		{
			method: 'POST',
			path: '/api/v1/platform/auth/password-reset/request',
			auth: 'public',
			desc: 'Envoie un email de réinitialisation (silencieux si email inconnu).',
			body: `{ "email": "..." }`,
			response: `202 { message: "PASSWORD_RESET_EMAIL_SENT" } // toujours, anti-enum`
		},
		{
			method: 'POST',
			path: '/api/v1/platform/auth/password-reset/confirm',
			auth: 'public',
			desc: 'Valide le token (1h), pose le nouveau pass, révoque toutes les sessions.',
			body: `{ "token": "...", "newPassword": "12CharsMin!" }`,
			response: `200 { message: "PASSWORD_RESET_SUCCESS" }
400 INVALID_TOKEN | WEAK_PASSWORD (min 12 chars)`
		}
	];

	const tenantEndpoints: Endpoint[] = [
		{
			method: 'POST',
			path: '/api/v1/platform/tenants',
			auth: 'platform-jwt',
			desc: 'Crée un tenant. Le caller devient owner. Retourne clientSecret une seule fois.',
			body: `{ "name": "mon-app", "webhookUrl": "...", "allowedOrigins": [...], "redirectUris": [...], "retentionDays": 90 }`,
			response: `201 { data: { tenant: {...}, clientSecret: "xxx" /* ONCE */ } }
403 EMAIL_NOT_VERIFIED | 409 NAME_TAKEN`
		},
		{
			method: 'GET',
			path: '/api/v1/platform/tenants',
			auth: 'platform-jwt',
			desc: 'Liste tous les tenants accessibles (owner + admin) avec le rôle du caller.',
			response: `200 { data: { tenants: [{ clientId, name, role, retentionDays, ... }] } }`
		},
		{
			method: 'PATCH',
			path: '/api/v1/platform/tenants/:clientId',
			auth: 'tenant-owner',
			desc: 'Met à jour les paramètres mutables.',
			body: `{ "webhookUrl"?, "allowedOrigins"?, "redirectUris"?, "retentionDays"? }`,
			response: `204 No Content | 403 FORBIDDEN | 404 NOT_FOUND`
		},
		{
			method: 'DELETE',
			path: '/api/v1/platform/tenants/:clientId',
			auth: 'tenant-owner',
			desc: 'Soft delete (isActive=false). Les users finaux ne peuvent plus se connecter.',
			response: `204 No Content`
		}
	];

	const adminEndpoints: Endpoint[] = [
		{
			method: 'GET',
			path: '/api/v1/platform/tenants/:clientId/admins',
			auth: 'tenant-member',
			desc: 'Liste tous les members (owner + admins) avec email + rôle + joinedAt.',
			response: `200 { data: { admins: [{ platformUserId, email, role, invitedBy, joinedAt }] } }`
		},
		{
			method: 'DELETE',
			path: '/api/v1/platform/tenants/:clientId/admins/:platformUserId',
			auth: 'tenant-owner',
			desc: 'Révoque un admin (impossible sur l\'owner — utiliser transfer).',
			response: `204 No Content | 409 CANNOT_REVOKE_OWNER | 404 NOT_FOUND`
		}
	];

	const invitationEndpoints: Endpoint[] = [
		{
			method: 'POST',
			path: '/api/v1/platform/tenants/:clientId/invitations',
			auth: 'tenant-owner',
			desc: 'Invite un admin par email. Idempotent (2e envoi same email = reset token).',
			body: `{ "email": "newadmin@example.com" }`,
			response: `201|200 { data: { status: "invited"|"resent", expiresAt } }
409 ALREADY_MEMBER | 404 TENANT_NOT_FOUND`
		},
		{
			method: 'GET',
			path: '/api/v1/platform/tenants/:clientId/invitations',
			auth: 'tenant-owner',
			desc: 'Liste les invitations en attente (non-used, non-cancelled).',
			response: `200 { data: { invitations: [{ id, email, role, expiresAt, createdAt }] } }`
		},
		{
			method: 'DELETE',
			path: '/api/v1/platform/tenants/:clientId/invitations/:id',
			auth: 'tenant-owner',
			desc: 'Annule (soft delete) une invitation pending.',
			response: `204 No Content | 409 ALREADY_USED | ALREADY_CANCELLED`
		},
		{
			method: 'POST',
			path: '/api/v1/platform/invitations/accept',
			auth: 'public',
			desc: 'Target accepte l\'invitation. Crée le platform user si nouveau (emailVerified=true). Auto-login.',
			body: `{ "token": "<raw64hex>", "password": "12CharsMin!" }`,
			response: `200 { data: { accessToken, refreshToken, platformUser, tenant: { role: "admin" } } }
404 INVALID_TOKEN | 410 EXPIRED | 409 ALREADY_USED | 401 INVALID_CREDENTIALS`
		}
	];

	const transferEndpoints: Endpoint[] = [
		{
			method: 'POST',
			path: '/api/v1/platform/tenants/:clientId/transfer',
			auth: 'tenant-owner',
			desc: 'Initie un transfert de propriété vers un admin existant. Password re-auth requis.',
			body: `{ "targetPlatformUserId": "<uuid>", "currentPassword": "..." }`,
			response: `201 { data: { status: "initiated", expiresAt } }
401 INVALID_CREDENTIALS | 400 TARGET_NOT_ADMIN | 409 PENDING_TRANSFER_EXISTS`
		},
		{
			method: 'POST',
			path: '/api/v1/platform/transfers/accept',
			auth: 'public',
			desc: 'Target accepte le transfert avec son password. Swap atomique owner↔admin.',
			body: `{ "token": "<raw64hex>", "password": "..." }`,
			response: `200 { data: { accessToken, refreshToken, platformUser, tenant: { role: "owner" } } }
404 INVALID_TOKEN | 410 EXPIRED | 409 ALREADY_{COMPLETED|DECLINED|CANCELLED} | 401 INVALID_CREDENTIALS`
		},
		{
			method: 'POST',
			path: '/api/v1/platform/transfers/decline',
			auth: 'public',
			desc: 'Target décline (pas de password — UX one-click depuis email).',
			body: `{ "token": "<raw64hex>" }`,
			response: `200 { data: { status: "declined" } }`
		},
		{
			method: 'DELETE',
			path: '/api/v1/platform/tenants/:clientId/transfer',
			auth: 'tenant-owner',
			desc: 'Annule le transfert pending du tenant.',
			response: `204 No Content | 404 NO_PENDING_TRANSFER`
		}
	];

	const providerEndpoints: Endpoint[] = [
		{
			method: 'GET',
			path: '/api/v1/platform/tenants/:clientId/providers',
			auth: 'tenant-member',
			desc: 'Liste les providers configurés (sans les secrets).',
			response: `200 { data: { providers: [{ provider, clientId }] } }`
		},
		{
			method: 'POST',
			path: '/api/v1/platform/tenants/:clientId/providers',
			auth: 'tenant-owner',
			desc: 'Upsert credentials provider (Discord/GitHub/Google/Twitch). Secret chiffré at rest.',
			body: `{ "provider": "discord", "clientId": "...", "clientSecret": "..." }`,
			response: `200 { data: { provider, clientId } }`
		},
		{
			method: 'DELETE',
			path: '/api/v1/platform/tenants/:clientId/providers/:provider',
			auth: 'tenant-owner',
			desc: 'Supprime la config. Tenant bascule sur fallback global.',
			response: `204 No Content`
		}
	];

	const statusEndpoint: Endpoint[] = [
		{
			method: 'GET',
			path: '/api/v1/platform/status',
			auth: 'public',
			desc: 'Probe du feature flag (kill switch). Toujours exempt de la désactivation.',
			response: `200 { data: { enabled: true|false } }`
		}
	];

	function authLabel(auth: Endpoint['auth']): string {
		return {
			'public': 'Public',
			'platform-jwt': 'JWT platform',
			'tenant-member': 'JWT + tenant member',
			'tenant-owner': 'JWT + tenant owner'
		}[auth];
	}

	function authClass(auth: Endpoint['auth']): string {
		return `auth-${auth}`;
	}
</script>

<svelte:head>
	<title>Platform API — SuperOAuth Docs</title>
</svelte:head>

<header class="page-header">
	<h1>Platform API</h1>
	<p class="text-secondary">
		Endpoints pour les SaaS clients (platform users) — gestion comptes, tenants, admins,
		invitations, transfers, providers. Distinct des endpoints <code>/api/v1/auth/*</code>
		destinés aux utilisateurs finaux des tenants.
	</p>
</header>

<section class="doc-section">
	<h2>Authentification</h2>
	<p class="text-secondary">
		Bearer token dans l'header <code>Authorization: Bearer &lt;accessToken&gt;</code>. Audience
		JWT : <code>superoauth-platform</code> — un token tenant ne passe pas cette
		validation (invariant #10 SOA-002).
	</p>
	<ul class="auth-legend">
		<li><span class="auth-tag auth-public">Public</span> — pas d'auth requise</li>
		<li><span class="auth-tag auth-platform-jwt">JWT platform</span> — token valide requis</li>
		<li><span class="auth-tag auth-tenant-member">JWT + tenant member</span> — owner OU admin</li>
		<li><span class="auth-tag auth-tenant-owner">JWT + tenant owner</span> — owner uniquement</li>
	</ul>
	<p class="text-muted hint">
		Non-member qui tape un endpoint tenant-scoped reçoit <code>404</code> (anti-enumeration
		— invariant #9), pas <code>403</code>.
	</p>
</section>

{#each [
	{ title: 'Auth', list: authEndpoints },
	{ title: 'Feature flag', list: statusEndpoint },
	{ title: 'Tenants', list: tenantEndpoints },
	{ title: 'Admins', list: adminEndpoints },
	{ title: 'Invitations', list: invitationEndpoints },
	{ title: 'Ownership transfers', list: transferEndpoints },
	{ title: 'Providers', list: providerEndpoints }
] as group}
	<section class="doc-section">
		<h2>{group.title}</h2>
		{#each group.list as ep}
			<article class="endpoint">
				<div class="endpoint-head">
					<span class="method method-{ep.method.toLowerCase()}">{ep.method}</span>
					<code class="path">{ep.path}</code>
					<span class="auth-tag {authClass(ep.auth)}">{authLabel(ep.auth)}</span>
				</div>
				<p class="desc">{ep.desc}</p>
				{#if ep.body}
					<h4>Body</h4>
					<CodeBlock code={ep.body} lang="json" />
				{/if}
				{#if ep.response}
					<h4>Response</h4>
					<CodeBlock code={ep.response} lang="text" />
				{/if}
			</article>
		{/each}
	</section>
{/each}

<section class="doc-section">
	<h2>Rate limits</h2>
	<p class="text-secondary">
		Les routes mutantes (<code>POST</code>, <code>PATCH</code>, <code>DELETE</code>) passent
		par <code>apiRateLimit</code> global. Les abus répétés (plusieurs 401 en chaîne) sont
		tracés dans les audit logs du tenant et peuvent entraîner un soft-ban IP.
	</p>
</section>

<style>
	.page-header {
		margin-bottom: var(--space-xl);
	}
	.page-header h1 {
		font-size: var(--text-3xl);
		font-weight: 700;
		margin-bottom: var(--space-sm);
	}
	.doc-section {
		margin-bottom: var(--space-xl);
	}
	.doc-section h2 {
		font-size: var(--text-xl);
		font-weight: 700;
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-xs);
		border-bottom: 1px solid var(--border);
	}
	.auth-legend {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-md);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
		font-size: var(--text-sm);
	}
	.endpoint {
		padding: var(--space-md);
		border: 1px solid var(--border);
		border-radius: 8px;
		margin-bottom: var(--space-md);
	}
	.endpoint-head {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
		margin-bottom: var(--space-sm);
	}
	.method {
		padding: 2px 8px;
		border-radius: 4px;
		font-size: var(--text-xs);
		font-weight: 700;
		font-family: var(--font-mono, monospace);
	}
	.method-get { background: rgba(90, 200, 250, 0.15); color: #5ac8fa; }
	.method-post { background: rgba(200, 164, 78, 0.15); color: var(--accent); }
	.method-patch { background: rgba(255, 149, 0, 0.15); color: #ff9500; }
	.method-delete { background: rgba(255, 59, 48, 0.15); color: #ff3b30; }
	.path {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-sm);
		flex: 1;
		min-width: 0;
		word-break: break-all;
	}
	.auth-tag {
		padding: 2px 8px;
		border-radius: 4px;
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.auth-public { background: rgba(255, 255, 255, 0.06); color: var(--text-muted); }
	.auth-platform-jwt { background: rgba(90, 200, 250, 0.12); color: #5ac8fa; }
	.auth-tenant-member { background: rgba(200, 164, 78, 0.12); color: var(--accent); }
	.auth-tenant-owner {
		background: var(--accent);
		color: var(--bg-page);
	}
	.desc {
		font-size: var(--text-sm);
		margin-bottom: var(--space-sm);
		color: var(--text-secondary);
	}
	.endpoint h4 {
		font-size: var(--text-xs);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin: var(--space-sm) 0 var(--space-xs);
	}
	.hint {
		font-size: var(--text-sm);
	}
</style>
