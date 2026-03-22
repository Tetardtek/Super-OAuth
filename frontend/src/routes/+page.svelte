<script lang="ts">
	const features = [
		{
			title: 'Multi-tenant natif',
			desc: 'Chaque app est un tenant isolé. Users, providers, JWT secrets — tout est scopé par tenant. Zéro contamination.',
			icon: '{'
		},
		{
			title: 'PKCE Authorization Server',
			desc: 'Flow OAuth 2.0 + PKCE standard. Authorization codes SHA-256, use-once, TTL 5 min. Conforme RFC 7636.',
			icon: '#'
		},
		{
			title: 'Pricing prévisible',
			desc: "Abonnement fixe. Pas de commission par user, pas de surcoût caché. Vous savez ce que vous payez.",
			icon: '$'
		}
	];

	const steps = [
		{ num: '01', title: 'Créez un tenant', desc: 'Un nom, une redirect URI. Vous recevez vos clés en 30 secondes.' },
		{ num: '02', title: 'Redirigez vos users', desc: 'GET /oauth/authorize avec votre client_id. On gère Discord, GitHub, Google, Twitch.' },
		{ num: '03', title: 'Échangez le code', desc: 'POST /oauth/token avec le code + PKCE verifier. Vous recevez un JWT signé par tenant.' }
	];

	const plans = [
		{
			name: 'Starter',
			price: '29',
			features: ['1 tenant', '4 providers OAuth', '1 000 users', 'JWT par tenant', 'Support email'],
			highlighted: false
		},
		{
			name: 'Studio',
			price: '99',
			features: ['5 tenants', '4 providers + custom', '10 000 users', 'Webhooks + audit logs', 'Support prioritaire', 'Dashboard analytics'],
			highlighted: true
		},
		{
			name: 'Pro',
			price: '249',
			features: ['Tenants illimités', 'Providers illimités', 'Users illimités', 'API complète', 'SLA 99.9%', 'Onboarding dédié'],
			highlighted: false
		}
	];
</script>

<svelte:head>
	<title>SuperOAuth — L'auth de vos projets, en quelques minutes</title>
</svelte:head>

<!-- Hero -->
<section class="hero">
	<div class="container">
		<span class="badge badge-accent">Authorization Server · PKCE · Multi-tenant</span>
		<h1>L'auth de vos projets.<br /><span class="text-accent">En quelques minutes.</span></h1>
		<p class="hero-sub">
			SuperOAuth est un authorization server multi-tenant. Branchez l'auth sur votre app,
			on gère les providers, les tokens et la sécurité.
		</p>
		<div class="hero-actions">
			<a href="/register" class="btn btn-primary btn-lg">Commencer gratuitement</a>
			<a href="/docs" class="btn btn-ghost btn-lg">Lire la doc</a>
		</div>
	</div>
</section>

<!-- Features -->
<section class="section" id="features">
	<div class="container">
		<h2 class="section-title text-center">Construit pour les développeurs</h2>
		<div class="features-grid">
			{#each features as f}
				<div class="card feature-card">
					<div class="feature-icon">{f.icon}</div>
					<h3>{f.title}</h3>
					<p class="text-secondary">{f.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- How it works -->
<section class="section bg-secondary">
	<div class="container">
		<h2 class="section-title text-center">Trois étapes. C'est tout.</h2>
		<div class="steps-grid">
			{#each steps as step}
				<div class="step">
					<span class="step-num font-mono text-accent">{step.num}</span>
					<h3>{step.title}</h3>
					<p class="text-secondary">{step.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Pricing -->
<section class="section" id="pricing">
	<div class="container">
		<h2 class="section-title text-center">Pricing simple et transparent</h2>
		<p class="section-sub text-center text-secondary">Pas de surprise. Pas de commission par utilisateur.</p>
		<div class="pricing-grid">
			{#each plans as plan}
				<div class="card pricing-card" class:highlighted={plan.highlighted}>
					{#if plan.highlighted}
						<span class="badge badge-accent popular-badge">Populaire</span>
					{/if}
					<h3>{plan.name}</h3>
					<div class="price">
						<span class="price-value">{plan.price}€</span>
						<span class="price-period text-muted">/mois</span>
					</div>
					<div class="pricing-divider"></div>
					<ul class="pricing-features">
						{#each plan.features as feat}
							<li>{feat}</li>
						{/each}
					</ul>
					<a href="/register" class="btn {plan.highlighted ? 'btn-primary' : 'btn-ghost'} btn-lg pricing-cta">
						Commencer
					</a>
				</div>
			{/each}
		</div>
		<div class="enterprise-bar card">
			<div>
				<h3>Enterprise</h3>
				<p class="text-secondary">SLA custom, déploiement dédié, onboarding sur mesure.</p>
			</div>
			<a href="mailto:contact@tetardtek.com" class="btn btn-ghost">Nous contacter</a>
		</div>
	</div>
</section>

<!-- Footer -->
<footer class="footer">
	<div class="container footer-inner">
		<span class="text-muted">&copy; 2026 SuperOAuth — Tetardtek</span>
		<a href="/docs" class="text-muted">Documentation</a>
	</div>
</footer>

<style>
	.hero {
		padding: calc(var(--header-height) + var(--space-3xl)) 0 var(--space-3xl);
		text-align: center;
	}

	.hero h1 {
		font-size: clamp(2rem, 5vw, var(--text-4xl));
		font-weight: 700;
		line-height: 1.15;
		margin: var(--space-lg) 0;
	}

	.hero-sub {
		max-width: 580px;
		margin: 0 auto var(--space-xl);
		color: var(--text-secondary);
		font-size: var(--text-lg);
		line-height: 1.7;
	}

	.hero-actions {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		flex-wrap: wrap;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-lg);
		margin-top: var(--space-xl);
	}

	.feature-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.feature-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--accent-muted);
		color: var(--accent);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-weight: 700;
		font-size: var(--text-xl);
	}

	.feature-card h3 {
		font-size: var(--text-lg);
		font-weight: 600;
	}

	.section-title {
		font-size: var(--text-3xl);
		font-weight: 700;
	}

	.section-sub {
		margin-top: var(--space-sm);
		font-size: var(--text-lg);
	}

	.bg-secondary { background: var(--bg-secondary); }

	.steps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-xl);
		margin-top: var(--space-xl);
	}

	.step { display: flex; flex-direction: column; gap: var(--space-sm); }
	.step-num { font-size: var(--text-2xl); font-weight: 700; }
	.step h3 { font-size: var(--text-lg); font-weight: 600; }

	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-lg);
		margin-top: var(--space-xl);
		align-items: start;
	}

	.pricing-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		position: relative;
	}

	.pricing-card.highlighted {
		border-color: var(--accent-border);
		box-shadow: 0 0 30px rgba(201, 168, 76, 0.08);
	}

	.popular-badge {
		position: absolute;
		top: calc(-1 * var(--space-md));
		right: var(--space-md);
	}

	.price { display: flex; align-items: baseline; gap: var(--space-xs); }
	.price-value { font-size: var(--text-4xl); font-weight: 700; }
	.price-period { font-size: var(--text-base); }

	.pricing-divider { height: 1px; background: var(--border); }

	.pricing-features {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		flex: 1;
	}

	.pricing-features li {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		padding-left: var(--space-lg);
		position: relative;
	}

	.pricing-features li::before {
		content: '~';
		position: absolute;
		left: 0;
		color: var(--accent);
		font-family: var(--font-mono);
	}

	.pricing-cta { width: 100%; justify-content: center; }

	.enterprise-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: var(--space-lg);
		gap: var(--space-lg);
	}

	.enterprise-bar h3 { font-size: var(--text-lg); font-weight: 600; }

	.footer {
		border-top: 1px solid var(--border);
		padding: var(--space-xl) 0;
	}

	.footer-inner {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	@media (max-width: 768px) {
		.enterprise-bar { flex-direction: column; text-align: center; }
		.footer-inner { flex-direction: column; gap: var(--space-sm); }
	}
</style>
