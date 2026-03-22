<script lang="ts">
	import CodeBlock from '$components/CodeBlock.svelte';
</script>

<svelte:head>
	<title>Intégration — SuperOAuth Docs</title>
</svelte:head>

<h1>Guide d'intégration</h1>
<p class="text-secondary">Intégrez SuperOAuth dans votre application frontend et backend.</p>

<h2>Prérequis</h2>
<ul>
	<li>Un tenant SuperOAuth avec <code>client_id</code> et <code>redirect_uris</code> configurés</li>
	<li>Au moins un provider OAuth activé (Discord, GitHub, Google, Twitch)</li>
</ul>

<h2>Frontend — Flow PKCE complet</h2>

<h3>Helpers PKCE</h3>
<CodeBlock lang="typescript" code={`// lib/oauth.ts
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64url(array);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64url(new Uint8Array(hash));
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\\+/g, '-')
    .replace(/\\//g, '_')
    .replace(/=+$/, '');
}

export function buildAuthUrl(provider: string, redirectUri: string, clientId: string): string {
  const verifier = generateCodeVerifier();
  sessionStorage.setItem('pkce_verifier', verifier);

  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);

  const challenge = await generateCodeChallenge(verifier);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    provider,
    state
  });

  return \`\${SUPEROAUTH_URL}/oauth/authorize?\${params}\`;
}`} />

<h3>Page de login</h3>
<CodeBlock lang="typescript" code={`// Bouton OAuth
async function handleLogin(provider: string) {
  const url = await buildAuthUrl(
    provider,
    window.location.origin + '/callback',
    'votre-tenant'
  );
  window.location.href = url;
}`} />

<h3>Page callback</h3>
<CodeBlock lang="typescript" code={`// /callback?code=xxx&state=yyy
const code = new URL(location.href).searchParams.get('code');
const state = new URL(location.href).searchParams.get('state');
const verifier = sessionStorage.getItem('pkce_verifier');
const savedState = sessionStorage.getItem('oauth_state');

// Vérifier le state (protection CSRF)
if (state !== savedState) throw new Error('State mismatch');

// Échanger le code
const res = await fetch(SUPEROAUTH_URL + '/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: window.location.origin + '/callback',
    code_verifier: verifier,
    client_id: 'votre-tenant'
  })
});

const { access_token, refresh_token } = await res.json();
// Stocker les tokens, rediriger vers le dashboard`} />

<h2>Backend — Validation des tokens</h2>

<h3>Option 1 : Introspection (recommandé pour débuter)</h3>
<CodeBlock lang="typescript" code={`// Votre backend valide le token auprès de SuperOAuth
async function validateToken(token: string) {
  const res = await fetch(SUPEROAUTH_URL + '/api/v1/auth/token/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${token}\`
    }
  });

  if (!res.ok) throw new Error('Token invalide');
  return res.json(); // { id, email, nickname, tenantId }
}`} />

<h3>Option 2 : Validation locale (production)</h3>
<CodeBlock lang="typescript" code={`// Validez le JWT localement avec votre clé tenant
import jwt from 'jsonwebtoken';

function validateToken(token: string) {
  return jwt.verify(token, TENANT_JWT_SECRET, {
    issuer: 'SuperOAuth',
    algorithms: ['HS256']
  });
}`} />

<h2>Providers OAuth</h2>
<p>SuperOAuth supporte 4 providers. Chaque tenant peut activer ses propres credentials ou utiliser le fallback global.</p>

<div class="providers-table">
	<table>
		<thead>
			<tr>
				<th>Provider</th>
				<th>Scopes par défaut</th>
				<th>Console développeur</th>
			</tr>
		</thead>
		<tbody>
			<tr><td>Discord</td><td><code>identify email</code></td><td>discord.com/developers</td></tr>
			<tr><td>GitHub</td><td><code>user:email</code></td><td>github.com/settings/developers</td></tr>
			<tr><td>Google</td><td><code>openid profile email</code></td><td>console.cloud.google.com</td></tr>
			<tr><td>Twitch</td><td><code>user:read:email</code></td><td>dev.twitch.tv/console</td></tr>
		</tbody>
	</table>
</div>

<h2>Gestion des comptes</h2>

<h3>Link — ajouter un provider</h3>
<CodeBlock lang="typescript" code={`// L'utilisateur est déjà connecté
const res = await fetch('/api/v1/oauth/discord/link', {
  method: 'POST',
  headers: { 'Authorization': \`Bearer \${token}\` }
});
// Redirige vers Discord → callback → provider lié au compte existant`} />

<h3>Merge — fusionner deux comptes</h3>
<CodeBlock lang="typescript" code={`// L'utilisateur a un token de chaque compte
const res = await fetch('/api/v1/oauth/account/merge', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${tokenCompte1}\`
  },
  body: JSON.stringify({ targetToken: tokenCompte2 })
});`} />

<h2>Checklist production</h2>
<ul>
	<li>HTTPS obligatoire sur toutes les redirect URIs</li>
	<li>Vérifier les <code>redirect_uris</code> enregistrées sur le tenant</li>
	<li>PKCE S256 uniquement (jamais <code>plain</code> en production)</li>
	<li>Stocker le <code>code_verifier</code> en <code>sessionStorage</code> (pas localStorage)</li>
	<li>Valider le <code>state</code> au retour du callback (protection CSRF)</li>
	<li>Configurer CORS sur votre backend pour les appels à SuperOAuth</li>
</ul>

<style>
	h1 { font-size: var(--text-3xl); font-weight: 700; margin-bottom: var(--space-sm); }
	h2 { font-size: var(--text-xl); font-weight: 600; margin-top: var(--space-2xl); margin-bottom: var(--space-md); }
	h3 { font-size: var(--text-lg); font-weight: 600; margin-top: var(--space-lg); margin-bottom: var(--space-sm); }
	p { color: var(--text-secondary); line-height: 1.7; margin-bottom: var(--space-md); }
	ul { color: var(--text-secondary); padding-left: var(--space-lg); margin-bottom: var(--space-md); }
	li { margin-bottom: var(--space-sm); line-height: 1.6; }
	strong { color: var(--text-primary); }

	table { width: 100%; border-collapse: collapse; margin: var(--space-md) 0; }
	th, td { text-align: left; padding: var(--space-sm) var(--space-md); border-bottom: 1px solid var(--border); font-size: var(--text-sm); }
	th { color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: var(--text-xs); letter-spacing: 0.05em; }
	td { color: var(--text-secondary); }
</style>
