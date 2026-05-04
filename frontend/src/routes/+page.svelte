<script lang="ts">
	const features = [
		{
			title: "Connecte n'importe quel site",
			desc: 'Une seule installation auth qui sert tous tes projets clients. Chacun reste isolé — leurs users, leurs settings, leur branding.',
			icon: '+'
		},
		{
			title: 'Login social en 5 minutes',
			desc: 'Discord, GitHub, Google, Twitch déjà configurés. Tes users cliquent, ils sont logués. Tu ne codes pas le SSO.',
			icon: '~'
		},
		{
			title: 'Prix prévisible',
			desc: 'Tu paies par admin de ton équipe, pas par utilisateur. Tes apps peuvent grossir à l\'infini sans surcoût caché.',
			icon: '$'
		}
	];

	const steps = [
		{ num: '01', title: 'Crée ton tenant', desc: 'Un nom, ton domaine de redirection. Tu as tes clés en 30 secondes.' },
		{ num: '02', title: 'Branche tes utilisateurs', desc: 'Une URL d\'autorisation à appeler depuis ton site. Snippets prêts pour React, Vue, Express, vanilla.' },
		{ num: '03', title: 'Récupère le JWT', desc: 'Token signé par tenant, prêt à valider côté serveur. Compatible avec ton backend existant.' }
	];

	type Plan = {
		name: string;
		price: string;
		priceSuffix?: string;
		tagline: string;
		features: { label: string; soon?: boolean }[];
		ctaLabel: string;
		ctaHref: string;
		highlighted?: boolean;
	};

	const plans: Plan[] = [
		{
			name: 'Free',
			price: '0',
			priceSuffix: '€',
			tagline: 'Pour démarrer un projet solo.',
			features: [
				{ label: '3 tenants' },
				{ label: '1 admin' },
				{ label: 'Tous les utilisateurs que tu veux' },
				{ label: '4 providers OAuth' },
				{ label: 'Audit logs 30 jours' },
				{ label: 'Logo SuperOAuth sur le login' }
			],
			ctaLabel: 'Commencer gratuitement',
			ctaHref: '/platform/signup',
			highlighted: false
		},
		{
			name: 'Solo',
			price: '29',
			priceSuffix: '€/mois',
			tagline: 'Pour un freelance avec quelques clients.',
			features: [
				{ label: '10 tenants' },
				{ label: '1 admin' },
				{ label: 'Utilisateurs illimités' },
				{ label: 'Audit logs 90 jours' },
				{ label: 'White-label partiel (logo)' },
				{ label: 'Support email' }
			],
			ctaLabel: 'Choisir Solo',
			ctaHref: '/platform/signup',
			highlighted: false
		},
		{
			name: 'Team',
			price: '99',
			priceSuffix: '€/mois',
			tagline: 'Pour un studio ou une équipe produit.',
			features: [
				{ label: 'Tenants illimités' },
				{ label: '5 admins' },
				{ label: 'Utilisateurs illimités' },
				{ label: 'SAML 2.0 SSO', soon: true },
				{ label: 'Audit logs 1 an' },
				{ label: 'White-label complet' }
			],
			ctaLabel: 'Choisir Team',
			ctaHref: '/platform/signup',
			highlighted: true
		},
		{
			name: 'Business',
			price: '299',
			priceSuffix: '€/mois',
			tagline: 'Pour les structures avec des process.',
			features: [
				{ label: 'Tenants illimités' },
				{ label: '15 admins' },
				{ label: 'Utilisateurs illimités' },
				{ label: 'SCIM provisioning', soon: true },
				{ label: 'MFA avancé', soon: true },
				{ label: 'Multi-region', soon: true },
				{ label: 'Support prioritaire' }
			],
			ctaLabel: 'Choisir Business',
			ctaHref: '/platform/signup',
			highlighted: false
		}
	];
</script>

<svelte:head>
	<title>SuperOAuth — Branche l'auth sur tes apps en 5 minutes</title>
	<meta
		name="description"
		content="Authorization server multi-tenant. Connecte Discord, GitHub, Google, Twitch sur tous tes projets clients sans coder le SSO. Hébergé ou self-host."
	/>
</svelte:head>

<!-- Hero -->
<section class="hero">
	<div class="container">
		<span class="badge badge-accent">Authorization Server · PKCE · Multi-tenant</span>
		<h1>L'auth de tes apps clients.<br /><span class="text-accent">Branchée en 5 minutes.</span></h1>
		<p class="hero-sub">
			Connecte Discord, GitHub, Google ou Twitch sur n'importe quel site sans coder le SSO.
			Tes utilisateurs cliquent, ils sont logués. Tes données restent isolées par projet.
		</p>
		<div class="hero-actions">
			<a href="/platform/signup" class="btn btn-primary btn-lg">Essayer gratuitement</a>
			<a href="/docs" class="btn btn-ghost btn-lg">Voir la doc</a>
		</div>
		<p class="hero-trust text-muted">
			Free tier réel · Pas de carte demandée · Self-host disponible
		</p>
	</div>
</section>

<!-- Features -->
<section class="section" id="features">
	<div class="container">
		<h2 class="section-title text-center">Pensé pour les freelances et les studios</h2>
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
		<p class="section-sub text-center text-secondary">
			Tu paies par admin, pas par utilisateur. Tes apps peuvent grossir à l'infini.
		</p>
		<div class="pricing-grid">
			{#each plans as plan}
				<div class="card pricing-card" class:highlighted={plan.highlighted}>
					{#if plan.highlighted}
						<span class="badge badge-accent popular-badge">Recommandé</span>
					{/if}
					<h3>{plan.name}</h3>
					<p class="pricing-tagline text-secondary">{plan.tagline}</p>
					<div class="price">
						<span class="price-value">{plan.price}{plan.priceSuffix?.startsWith('€') ? '€' : ''}</span>
						{#if plan.priceSuffix?.includes('/')}
							<span class="price-period text-muted">/{plan.priceSuffix.split('/')[1]}</span>
						{/if}
					</div>
					<div class="pricing-divider"></div>
					<ul class="pricing-features">
						{#each plan.features as feat}
							<li>
								{feat.label}
								{#if feat.soon}
									<span class="soon-badge">Bientôt</span>
								{/if}
							</li>
						{/each}
					</ul>
					<a
						href={plan.ctaHref}
						class="btn {plan.highlighted ? 'btn-primary' : 'btn-ghost'} btn-lg pricing-cta"
					>
						{plan.ctaLabel}
					</a>
				</div>
			{/each}
		</div>

		<div class="pro-install-bar card">
			<div class="pro-install-text">
				<h3>Tu veux qu'on l'installe pour toi ?</h3>
				<p class="text-secondary">
					Installation sur ton infra ou cloud privé, migration depuis Auth0/Clerk, support direct.
					À partir de 1 500€ de setup + 200-500€/mois.
				</p>
			</div>
			<a href="/pricing/pro-install" class="btn btn-ghost btn-lg">Voir Pro Install</a>
		</div>
	</div>
</section>

<!-- Footer -->
<footer class="footer">
	<div class="container footer-inner">
		<div class="footer-left">
			<span class="text-muted">&copy; 2026 SuperOAuth — Tetardtek</span>
			<span class="text-muted footer-license">
				Open core sous BSL · conversion automatique Apache 2.0 en 2030
			</span>
		</div>
		<div class="footer-links">
			<a href="/docs" class="text-muted">Documentation</a>
			<a href="/pricing/pro-install" class="text-muted">Pro Install</a>
		</div>
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
		max-width: 620px;
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

	.hero-trust {
		margin-top: var(--space-lg);
		font-size: var(--text-sm);
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

	.bg-secondary {
		background: var(--bg-secondary);
	}

	.steps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-xl);
		margin-top: var(--space-xl);
	}

	.step {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}
	.step-num {
		font-size: var(--text-2xl);
		font-weight: 700;
	}
	.step h3 {
		font-size: var(--text-lg);
		font-weight: 600;
	}

	.pricing-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-lg);
		margin-top: var(--space-xl);
		align-items: stretch;
	}

	.pricing-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
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

	.pricing-tagline {
		font-size: var(--text-sm);
		min-height: 2.4em;
	}

	.price {
		display: flex;
		align-items: baseline;
		gap: var(--space-xs);
		margin-top: var(--space-sm);
	}
	.price-value {
		font-size: var(--text-4xl);
		font-weight: 700;
	}
	.price-period {
		font-size: var(--text-base);
	}

	.pricing-divider {
		height: 1px;
		background: var(--border);
		margin: var(--space-sm) 0;
	}

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
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		flex-wrap: wrap;
	}

	.pricing-features li::before {
		content: '~';
		position: absolute;
		left: 0;
		color: var(--accent);
		font-family: var(--font-mono);
	}

	.soon-badge {
		font-size: var(--text-xs);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		background: var(--accent-muted);
		color: var(--accent);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.pricing-cta {
		width: 100%;
		justify-content: center;
		margin-top: var(--space-md);
	}

	.pro-install-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: var(--space-xl);
		gap: var(--space-lg);
		padding: var(--space-xl);
	}

	.pro-install-text h3 {
		font-size: var(--text-xl);
		font-weight: 600;
		margin-bottom: var(--space-xs);
	}

	.pro-install-text p {
		max-width: 640px;
	}

	.footer {
		border-top: 1px solid var(--border);
		padding: var(--space-xl) 0;
	}

	.footer-inner {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-lg);
	}

	.footer-left {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.footer-license {
		font-size: var(--text-xs);
	}

	.footer-links {
		display: flex;
		gap: var(--space-md);
	}

	@media (max-width: 768px) {
		.pro-install-bar {
			flex-direction: column;
			text-align: center;
		}
		.footer-inner {
			flex-direction: column;
			align-items: center;
			text-align: center;
			gap: var(--space-md);
		}
	}
</style>
