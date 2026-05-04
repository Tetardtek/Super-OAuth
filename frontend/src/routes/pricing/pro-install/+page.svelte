<script lang="ts">
	const included = [
		'Installation sur ton infra (on-premise) ou cloud privé dédié',
		'Migration depuis Auth0, Clerk, Cognito ou autre — on récupère tes users',
		'Configuration Apache / nginx / SSL / TLS faite par nous',
		"Mises à jour automatiques (sécurité + features) — toi tu n'y touches pas",
		'Monitoring 24/7 + alerting sur les incidents critiques',
		'SLA personnalisé selon ton volume et tes contraintes',
		'Support direct par email + Slack ou Discord partagé',
		'Audit annuel de la configuration (sécurité, performance, capacité)'
	];

	const not_included = [
		"Reverse-engineering d'un protocole d'auth fait maison (cas par cas)",
		"Hébergement (tu fournis l'infra OU on utilise notre cloud privé partenaire)",
		"Support de versions BSL périmées (on installe la dernière, point)"
	];

	const examples = [
		{
			profile: 'Studio jeux indé',
			setup: '1 500€',
			monthly: '200€/mois',
			scope: '3 jeux en prod, 50k MAU cumulés, 2 admins, support email'
		},
		{
			profile: 'Agence digital',
			setup: '2 500€',
			monthly: '350€/mois',
			scope: '10 sites clients, migration Auth0, 5 admins, SLA 99.5%'
		},
		{
			profile: 'PME tech',
			setup: '4 000€',
			monthly: '500€/mois',
			scope: 'Multi-region, SCIM, 15 admins, SLA 99.9%, audit trimestriel'
		}
	];
</script>

<svelte:head>
	<title>Pro Install — On installe et on maintient SuperOAuth pour toi</title>
	<meta
		name="description"
		content="Installation managed de SuperOAuth sur ton infra. À partir de 1 500€ setup + 200-500€/mois selon volume. Support direct, migration depuis Auth0/Clerk."
	/>
</svelte:head>

<section class="page-header">
	<div class="container">
		<span class="badge badge-accent">Pro Install</span>
		<h1>On l'installe et on le maintient pour toi.</h1>
		<p class="lead">
			Tu veux SuperOAuth en prod sans gérer le serveur, les certs, les MAJ ni la migration depuis ton outil actuel ?
			On s'en occupe — toi tu codes ton produit.
		</p>
	</div>
</section>

<section class="section">
	<div class="container pricing-block">
		<div class="card pro-pricing-card">
			<h2>Tarification</h2>
			<div class="pro-prices">
				<div class="pro-price-item">
					<span class="pro-price-amount">1 500€</span>
					<span class="pro-price-label">setup one-shot</span>
					<p class="text-secondary">
						Installation, configuration, migration depuis ton outil actuel, accompagnement go-live.
					</p>
				</div>
				<div class="pro-price-divider"></div>
				<div class="pro-price-item">
					<span class="pro-price-amount">200 — 500€<span class="pro-price-suffix">/mois</span></span>
					<span class="pro-price-label">maintenance</span>
					<p class="text-secondary">
						Modulé selon ton volume (admins, providers, SLA, multi-region). Pas de surcoût caché — devis ferme avant signature.
					</p>
				</div>
			</div>
			<a href="mailto:contact@tetardtek.com?subject=Pro%20Install%20SuperOAuth" class="btn btn-primary btn-lg cta">
				Réserver un appel découverte
			</a>
			<p class="text-muted hint">Réponse sous 24h ouvrées · Premier appel offert · Devis sous 5 jours.</p>
		</div>
	</div>
</section>

<section class="section bg-secondary">
	<div class="container two-col">
		<div>
			<h2>Inclus</h2>
			<ul class="check-list">
				{#each included as item}
					<li>{item}</li>
				{/each}
			</ul>
		</div>
		<div>
			<h2>Pas inclus</h2>
			<ul class="cross-list">
				{#each not_included as item}
					<li>{item}</li>
				{/each}
			</ul>
		</div>
	</div>
</section>

<section class="section">
	<div class="container">
		<h2 class="section-title text-center">Quelques exemples chiffrés</h2>
		<p class="section-sub text-center text-secondary">
			Trois profils typiques pour t'aider à te situer. Le devis final dépend de ton scope précis.
		</p>
		<div class="examples-grid">
			{#each examples as ex}
				<div class="card example-card">
					<h3>{ex.profile}</h3>
					<div class="example-prices">
						<span class="example-setup">{ex.setup}</span>
						<span class="text-muted">setup</span>
						<span class="example-monthly">{ex.monthly}</span>
					</div>
					<p class="text-secondary">{ex.scope}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="section bg-secondary">
	<div class="container cta-block">
		<h2>On en parle ?</h2>
		<p class="text-secondary">
			Premier appel sans engagement, on regarde ton scope, on te dit si c'est pertinent (ou pas).
		</p>
		<a href="mailto:contact@tetardtek.com?subject=Pro%20Install%20SuperOAuth" class="btn btn-primary btn-lg">
			Réserver un appel découverte
		</a>
		<p class="back-link">
			<a href="/#pricing" class="text-muted">← Retour aux tarifs self-serve</a>
		</p>
	</div>
</section>

<style>
	.page-header {
		padding: calc(var(--header-height) + var(--space-2xl)) 0 var(--space-2xl);
		text-align: center;
	}

	.page-header h1 {
		font-size: clamp(2rem, 5vw, var(--text-4xl));
		font-weight: 700;
		line-height: 1.15;
		margin: var(--space-lg) 0;
	}

	.lead {
		max-width: 680px;
		margin: 0 auto;
		color: var(--text-secondary);
		font-size: var(--text-lg);
		line-height: 1.7;
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

	.pricing-block {
		max-width: 760px;
	}

	.pro-pricing-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		padding: var(--space-2xl);
		text-align: center;
	}

	.pro-pricing-card h2 {
		font-size: var(--text-2xl);
		font-weight: 700;
	}

	.pro-prices {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: var(--space-lg);
		align-items: center;
	}

	.pro-price-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		text-align: center;
	}

	.pro-price-amount {
		font-size: var(--text-3xl);
		font-weight: 700;
		color: var(--accent);
	}

	.pro-price-suffix {
		font-size: var(--text-base);
		color: var(--text-muted);
		font-weight: 400;
	}

	.pro-price-label {
		font-size: var(--text-sm);
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.pro-price-item p {
		margin-top: var(--space-sm);
		font-size: var(--text-sm);
	}

	.pro-price-divider {
		width: 1px;
		min-height: 100px;
		background: var(--border);
	}

	.cta {
		align-self: center;
		margin-top: var(--space-md);
	}

	.hint {
		font-size: var(--text-sm);
	}

	.two-col {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2xl);
	}

	.two-col h2 {
		font-size: var(--text-2xl);
		font-weight: 700;
		margin-bottom: var(--space-lg);
	}

	.check-list,
	.cross-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.check-list li,
	.cross-list li {
		padding-left: var(--space-lg);
		position: relative;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.check-list li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--accent);
		font-weight: 700;
	}

	.cross-list li::before {
		content: '×';
		position: absolute;
		left: 0;
		color: var(--text-muted);
		font-weight: 700;
	}

	.examples-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-lg);
		margin-top: var(--space-xl);
	}

	.example-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.example-card h3 {
		font-size: var(--text-lg);
		font-weight: 600;
	}

	.example-prices {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.example-setup,
	.example-monthly {
		font-weight: 700;
		color: var(--accent);
	}

	.cta-block {
		text-align: center;
		max-width: 640px;
	}

	.cta-block h2 {
		font-size: var(--text-3xl);
		font-weight: 700;
		margin-bottom: var(--space-md);
	}

	.cta-block p {
		font-size: var(--text-lg);
		margin-bottom: var(--space-xl);
	}

	.back-link {
		margin-top: var(--space-xl);
	}

	@media (max-width: 768px) {
		.pro-prices {
			grid-template-columns: 1fr;
		}
		.pro-price-divider {
			width: 100%;
			min-height: 1px;
			height: 1px;
		}
		.two-col {
			grid-template-columns: 1fr;
		}
	}
</style>
