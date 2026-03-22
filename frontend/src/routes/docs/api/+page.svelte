<script lang="ts">
	import CodeBlock from '$components/CodeBlock.svelte';

	interface Endpoint {
		method: string;
		path: string;
		desc: string;
		body?: string;
		response?: string;
	}

	const pkceEndpoints: Endpoint[] = [
		{
			method: 'GET',
			path: '/oauth/authorize',
			desc: 'Initie le flow PKCE. Redirige vers le provider OAuth.',
			body: `Query params :
  client_id        (requis) — slug du tenant
  redirect_uri     (requis) — URI de callback enregistrée
  response_type    (requis) — "code"
  code_challenge   (requis) — SHA-256 du verifier, base64url
  code_challenge_method     — "S256" (défaut) ou "plain"
  provider         (requis) — discord, github, google, twitch
  scope                     — scopes séparés par espaces
  state                     — opaque, renvoyé tel quel`,
			response: `302 Redirect → provider OAuth
Callback → redirect_uri?code=xxx&state=yyy`
		},
		{
			method: 'POST',
			path: '/oauth/token',
			desc: 'Échange un authorization code contre des tokens JWT.',
			body: `{
  "grant_type": "authorization_code",
  "code": "authorization_code_recu",
  "redirect_uri": "https://app.com/callback",
  "code_verifier": "pkce_verifier_original",
  "client_id": "tenant-slug"
}`,
			response: `{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJ...",
  "scope": "openid"
}`
		}
	];

	const authEndpoints: Endpoint[] = [
		{
			method: 'POST',
			path: '/api/v1/auth/register',
			desc: 'Inscription par email/mot de passe.',
			body: `{ "email": "user@ex.com", "password": "Str0ng!Pass", "nickname": "user" }`,
			response: `{ "accessToken": "...", "refreshToken": "...", "user": {...} }`
		},
		{
			method: 'POST',
			path: '/api/v1/auth/login',
			desc: 'Connexion classique.',
			body: `{ "email": "user@ex.com", "password": "Str0ng!Pass" }`,
			response: `{ "accessToken": "...", "refreshToken": "...", "user": {...} }`
		},
		{
			method: 'GET',
			path: '/api/v1/auth/me',
			desc: 'Retourne l\'utilisateur authentifié. Header Authorization: Bearer requis.',
			response: `{ "id": 1, "email": "...", "nickname": "...", "emailVerified": true, ... }`
		},
		{
			method: 'POST',
			path: '/api/v1/auth/refresh',
			desc: 'Renouvelle les tokens. Rotation automatique du refresh token.',
			body: `{ "refreshToken": "..." }`,
			response: `{ "accessToken": "...", "refreshToken": "..." }`
		},
		{
			method: 'POST',
			path: '/api/v1/auth/logout',
			desc: 'Révoque les tokens via blacklist Redis (JTI).',
			response: `{ "message": "Logged out" }`
		}
	];

	const oauthEndpoints: Endpoint[] = [
		{
			method: 'GET',
			path: '/api/v1/oauth/linked',
			desc: 'Liste les providers liés au compte. Auth requise.',
			response: `[{ "provider": "discord", "providerEmail": "...", "linkedAt": "..." }]`
		},
		{
			method: 'POST',
			path: '/api/v1/oauth/:provider/link',
			desc: 'Lie un provider OAuth au compte existant. Auth requise.',
			response: `302 Redirect → provider OAuth → callback → dashboard`
		},
		{
			method: 'DELETE',
			path: '/api/v1/oauth/:provider/unlink',
			desc: 'Délie un provider. Au moins une méthode d\'auth doit rester.',
			response: `{ "message": "Provider unlinked" }`
		},
		{
			method: 'POST',
			path: '/api/v1/oauth/account/merge',
			desc: 'Fusionne deux comptes. Transfère les providers du compte cible.',
			body: `{ "targetToken": "jwt_du_compte_a_fusionner" }`,
			response: `{ "message": "Accounts merged", "mergedProviders": [...] }`
		}
	];

	function methodColor(method: string): string {
		const colors: Record<string, string> = {
			GET: 'var(--success)',
			POST: 'var(--info)',
			PUT: 'var(--warning)',
			DELETE: 'var(--danger)'
		};
		return colors[method] || 'var(--text-muted)';
	}
</script>

<svelte:head>
	<title>API Reference — SuperOAuth Docs</title>
</svelte:head>

<h1>API Reference</h1>
<p class="text-secondary">Tous les endpoints SuperOAuth. Base URL : <code>https://superoauth.tetardtek.com</code></p>

<h2>PKCE Authorization Server</h2>
<p>Flow standard OAuth 2.0 + PKCE (RFC 7636). Utilisez ces endpoints pour intégrer SuperOAuth dans votre application.</p>

{#each pkceEndpoints as ep}
	<div class="endpoint card">
		<div class="endpoint-header">
			<span class="method-badge" style="color: {methodColor(ep.method)}">{ep.method}</span>
			<code class="endpoint-path">{ep.path}</code>
		</div>
		<p class="text-secondary">{ep.desc}</p>
		{#if ep.body}
			<CodeBlock code={ep.body} lang={ep.method === 'GET' ? 'text' : 'json'} />
		{/if}
		{#if ep.response}
			<div class="response-label text-muted">Réponse</div>
			<CodeBlock code={ep.response} lang="json" />
		{/if}
	</div>
{/each}

<h2>Authentification classique</h2>
<p>Endpoints email/mot de passe. Utilisés par le dashboard SuperOAuth lui-même.</p>

{#each authEndpoints as ep}
	<div class="endpoint card">
		<div class="endpoint-header">
			<span class="method-badge" style="color: {methodColor(ep.method)}">{ep.method}</span>
			<code class="endpoint-path">{ep.path}</code>
		</div>
		<p class="text-secondary">{ep.desc}</p>
		{#if ep.body}
			<CodeBlock code={ep.body} lang="json" />
		{/if}
		{#if ep.response}
			<div class="response-label text-muted">Réponse</div>
			<CodeBlock code={ep.response} lang="json" />
		{/if}
	</div>
{/each}

<h2>Gestion des comptes OAuth</h2>
<p>Link, unlink et merge de providers. Auth requise (Bearer token).</p>

{#each oauthEndpoints as ep}
	<div class="endpoint card">
		<div class="endpoint-header">
			<span class="method-badge" style="color: {methodColor(ep.method)}">{ep.method}</span>
			<code class="endpoint-path">{ep.path}</code>
		</div>
		<p class="text-secondary">{ep.desc}</p>
		{#if ep.body}
			<CodeBlock code={ep.body} lang="json" />
		{/if}
		{#if ep.response}
			<div class="response-label text-muted">Réponse</div>
			<CodeBlock code={ep.response} lang="json" />
		{/if}
	</div>
{/each}

<h2>Utilitaires</h2>
<div class="endpoint card">
	<div class="endpoint-header">
		<span class="method-badge" style="color: var(--success)">GET</span>
		<code class="endpoint-path">/health</code>
	</div>
	<p class="text-secondary">Health check. Retourne le statut du serveur, de la DB et de Redis.</p>
	<div class="response-label text-muted">Réponse</div>
	<CodeBlock code={`{ "status": "ok", "uptime": 12345, "db": "connected", "redis": "connected" }`} lang="json" />
</div>

<style>
	h1 { font-size: var(--text-3xl); font-weight: 700; margin-bottom: var(--space-sm); }
	h2 { font-size: var(--text-xl); font-weight: 600; margin-top: var(--space-2xl); margin-bottom: var(--space-md); }
	p { color: var(--text-secondary); line-height: 1.7; margin-bottom: var(--space-md); }

	.endpoint { margin-bottom: var(--space-md); }

	.endpoint-header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-sm);
	}

	.method-badge {
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: var(--text-sm);
		min-width: 56px;
	}

	.endpoint-path {
		font-size: var(--text-base);
		background: none;
		padding: 0;
	}

	.response-label {
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: var(--space-sm);
		margin-bottom: var(--space-xs);
	}
</style>
