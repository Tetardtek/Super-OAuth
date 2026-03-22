<script lang="ts">
	import CodeBlock from '$components/CodeBlock.svelte';
</script>

<svelte:head>
	<title>Démarrage rapide — SuperOAuth Docs</title>
</svelte:head>

<h1>Démarrage rapide</h1>
<p class="text-secondary">Intégrez SuperOAuth dans votre application en 5 minutes.</p>

<h2>1. Créez un tenant</h2>
<p>
	Chaque application qui utilise SuperOAuth est un <strong>tenant</strong>. Un tenant isole les
	utilisateurs, les providers OAuth et les clés JWT.
</p>
<p>Contactez-nous ou utilisez le dashboard pour créer votre tenant. Vous recevrez :</p>
<ul>
	<li>Un <code>client_id</code> (le slug de votre tenant)</li>
	<li>Vos <code>redirect_uris</code> enregistrées</li>
</ul>

<h2>2. Implémentez le flow PKCE</h2>
<p>SuperOAuth utilise le flow <strong>Authorization Code + PKCE</strong> (RFC 7636). Côté client :</p>

<CodeBlock lang="typescript" code={`// 1. Générer le PKCE verifier + challenge
const verifier = generateCodeVerifier();     // 32 bytes random, base64url
const challenge = await sha256(verifier);    // SHA-256 → base64url

// 2. Rediriger l'utilisateur
const params = new URLSearchParams({
  client_id: 'votre-tenant',
  redirect_uri: 'https://votre-app.com/callback',
  response_type: 'code',
  code_challenge: challenge,
  code_challenge_method: 'S256',
  provider: 'discord',                       // discord, github, google, twitch
  state: crypto.randomUUID()
});

window.location.href = \`https://superoauth.tetardtek.com/oauth/authorize?\${params}\`;`} />

<h2>3. Échangez le code</h2>
<p>Après l'authentification, SuperOAuth redirige vers votre <code>redirect_uri</code> avec un <code>code</code> :</p>

<CodeBlock lang="typescript" code={`// Sur votre callback : /callback?code=xxx&state=yyy
const res = await fetch('https://superoauth.tetardtek.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: params.get('code'),
    redirect_uri: 'https://votre-app.com/callback',
    code_verifier: verifier,    // stocké en sessionStorage avant la redirection
    client_id: 'votre-tenant'
  })
});

const { access_token, refresh_token, expires_in } = await res.json();`} />

<h2>4. Utilisez le token</h2>
<p>Le <code>access_token</code> est un JWT signé avec la clé de votre tenant. Il contient :</p>

<CodeBlock lang="json" code={`{
  "sub": "user-uuid",
  "email": "user@exemple.com",
  "nickname": "user",
  "tenantId": "votre-tenant",
  "iss": "SuperOAuth",
  "exp": 1711234567
}`} />

<p>
	Validez le token côté backend avec votre clé JWT tenant, ou appelez
	<code>POST /api/v1/auth/token/validate</code> pour une validation par introspection.
</p>

<h2>Prochaines étapes</h2>
<ul>
	<li><a href="/docs/api">API Reference</a> — tous les endpoints</li>
	<li><a href="/docs/integration">Guide d'intégration</a> — exemples frontend + backend complets</li>
	<li><a href="/docs/security">Sécurité</a> — modèle de sécurité détaillé</li>
</ul>

<style>
	h1 { font-size: var(--text-3xl); font-weight: 700; margin-bottom: var(--space-sm); }
	h2 { font-size: var(--text-xl); font-weight: 600; margin-top: var(--space-2xl); margin-bottom: var(--space-md); }
	p { color: var(--text-secondary); line-height: 1.7; margin-bottom: var(--space-md); }
	ul { color: var(--text-secondary); padding-left: var(--space-lg); margin-bottom: var(--space-md); }
	li { margin-bottom: var(--space-sm); line-height: 1.6; }
	strong { color: var(--text-primary); }
</style>
