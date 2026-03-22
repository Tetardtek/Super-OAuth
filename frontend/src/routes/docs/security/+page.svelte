<script lang="ts">
	import CodeBlock from '$components/CodeBlock.svelte';
</script>

<svelte:head>
	<title>Sécurité — SuperOAuth Docs</title>
</svelte:head>

<h1>Sécurité</h1>
<p class="text-secondary">Modèle de sécurité de SuperOAuth — chiffrement, tokens, rate limiting.</p>

<h2>Authentification</h2>

<h3>Mots de passe</h3>
<ul>
	<li><strong>Hachage :</strong> bcrypt, 12 rounds de salt</li>
	<li><strong>Politique :</strong> 8 caractères minimum, majuscule, minuscule, chiffre, caractère spécial</li>
	<li><strong>Stockage :</strong> hash uniquement — le mot de passe en clair n'est jamais persisté</li>
</ul>

<h3>Rate limiting</h3>
<ul>
	<li>Login : 5 tentatives par 15 minutes par IP</li>
	<li>OAuth : 10 requêtes par minute par IP</li>
	<li>API générale : configurable par endpoint</li>
	<li>Implémenté via Redis (persistent entre les redémarrages)</li>
</ul>

<h2>Tokens JWT</h2>

<div class="specs-grid">
	<div class="card spec-card">
		<h4>Access Token</h4>
		<ul>
			<li>TTL : 15 minutes</li>
			<li>Algorithme : HS256</li>
			<li>Clé : unique par tenant (AES-256-GCM)</li>
			<li>Contient : sub, email, nickname, tenantId</li>
		</ul>
	</div>
	<div class="card spec-card">
		<h4>Refresh Token</h4>
		<ul>
			<li>TTL : 7 jours</li>
			<li>Rotation automatique à chaque refresh</li>
			<li>Révocation immédiate via Redis JTI blacklist</li>
		</ul>
	</div>
</div>

<h3>Révocation par JTI</h3>
<p>
	Chaque JWT contient un <code>jti</code> (JWT ID) unique. À la déconnexion, le JTI est ajouté à
	une blacklist Redis avec un TTL identique au token. La vérification est O(1).
</p>

<CodeBlock lang="text" code={`Logout → JTI ajouté à Redis (TTL = expiration restante du token)
Requête → Middleware vérifie JTI dans la blacklist
           → Présent : 401 Unauthorized
           → Absent : requête autorisée`} />

<h2>PKCE (RFC 7636)</h2>
<p>Toutes les intégrations client utilisent PKCE. Les security gates :</p>

<div class="gates-list">
	<div class="card gate-card">
		<span class="badge badge-accent">SG-PKCE-1</span>
		<p><code>redirect_uri</code> validée contre la liste enregistrée du tenant. Match exact requis.</p>
	</div>
	<div class="card gate-card">
		<span class="badge badge-accent">SG-PKCE-2</span>
		<p><code>code_challenge</code> obligatoire. S256 par défaut, <code>plain</code> uniquement si explicitement autorisé.</p>
	</div>
	<div class="card gate-card">
		<span class="badge badge-accent">SG-PKCE-3</span>
		<p>Authorization code hashé SHA-256 en DB. Use-once, TTL 5 minutes. Vérifié : expiration, usage, redirect_uri, PKCE verifier.</p>
	</div>
	<div class="card gate-card">
		<span class="badge badge-accent">SG-PKCE-4</span>
		<p>Credentials provider résolues par tenant avec fallback global. Isolation complète.</p>
	</div>
</div>

<h2>Multi-tenant</h2>
<ul>
	<li><strong>Isolation :</strong> chaque tenant a ses propres users, providers, JWT secrets</li>
	<li><strong>Clés JWT :</strong> chiffrées AES-256-GCM en DB, déchiffrées en mémoire</li>
	<li><strong>Credentials provider :</strong> per-tenant avec fallback global</li>
	<li><strong>Users :</strong> scopés par <code>(tenantId, email)</code> — unique composite</li>
</ul>

<h2>Headers de sécurité</h2>

<CodeBlock lang="text" code={`Content-Security-Policy: default-src 'self'; script-src 'nonce-xxx'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin`} />

<h2>Métriques</h2>

<div class="specs-grid">
	<div class="card spec-card">
		<span class="stat-value text-accent">256-bit</span>
		<span class="text-muted">Clés de chiffrement</span>
	</div>
	<div class="card spec-card">
		<span class="stat-value text-accent">15 min</span>
		<span class="text-muted">TTL access token</span>
	</div>
	<div class="card spec-card">
		<span class="stat-value text-accent">12 rounds</span>
		<span class="text-muted">bcrypt salt</span>
	</div>
	<div class="card spec-card">
		<span class="stat-value text-accent">5 / 15 min</span>
		<span class="text-muted">Rate limit login</span>
	</div>
</div>

<style>
	h1 { font-size: var(--text-3xl); font-weight: 700; margin-bottom: var(--space-sm); }
	h2 { font-size: var(--text-xl); font-weight: 600; margin-top: var(--space-2xl); margin-bottom: var(--space-md); }
	h3 { font-size: var(--text-lg); font-weight: 600; margin-top: var(--space-lg); margin-bottom: var(--space-sm); }
	p { color: var(--text-secondary); line-height: 1.7; margin-bottom: var(--space-md); }
	ul { color: var(--text-secondary); padding-left: var(--space-lg); margin-bottom: var(--space-md); }
	li { margin-bottom: var(--space-sm); line-height: 1.6; }
	strong { color: var(--text-primary); }

	.specs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
		margin: var(--space-lg) 0;
	}

	.spec-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.spec-card h4 { font-size: var(--text-base); font-weight: 600; }
	.spec-card ul { padding-left: var(--space-md); margin: 0; }

	.stat-value { font-size: var(--text-2xl); font-weight: 700; }

	.gates-list { display: flex; flex-direction: column; gap: var(--space-sm); margin: var(--space-lg) 0; }

	.gate-card {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
	}

	.gate-card p { margin: 0; font-size: var(--text-sm); }
</style>
