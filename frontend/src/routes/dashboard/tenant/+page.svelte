<script lang="ts">
	import type { Tenant } from '$types/user';

	const mockTenants: Tenant[] = [
		{
			id: 'tn_origins',
			name: 'OriginsDigital',
			slug: 'origins',
			redirectUris: ['https://origins.tetardtek.com/callback'],
			allowedOrigins: ['https://origins.tetardtek.com'],
			providers: ['discord', 'github', 'google'],
			plan: 'studio',
			isActive: true,
			createdAt: '2026-01-15T10:00:00Z'
		},
		{
			id: 'tn_tetardpg',
			name: 'TetaRdPG',
			slug: 'tetardpg',
			redirectUris: ['https://tetardpg.tetardtek.com/callback'],
			allowedOrigins: ['https://tetardpg.tetardtek.com'],
			providers: ['discord', 'twitch'],
			plan: 'starter',
			isActive: true,
			createdAt: '2026-02-20T14:30:00Z'
		},
		{
			id: 'tn_clickerz',
			name: 'Clickerz',
			slug: 'clickerz',
			redirectUris: ['https://clickerz.tetardtek.com/callback'],
			allowedOrigins: ['https://clickerz.tetardtek.com'],
			providers: ['discord', 'github', 'google', 'twitch'],
			plan: 'studio',
			isActive: false,
			createdAt: '2026-03-10T09:00:00Z'
		}
	];

	let selectedTenant = $state<Tenant | null>(null);
	let showCreateModal = $state(false);

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Tenants — SuperOAuth</title>
</svelte:head>

<div class="tenant-page">
	<div class="container">
		<header class="page-header">
			<div>
				<div class="title-row">
					<h1>Tenants</h1>
					<span class="badge badge-demo">Demo</span>
				</div>
				<p class="text-secondary">Gérez vos applications et leurs configurations OAuth</p>
			</div>
			<button class="btn btn-primary" onclick={() => showCreateModal = true}>
				+ Nouveau tenant
			</button>
		</header>

		<!-- Tenant list -->
		<div class="tenant-grid">
			{#each mockTenants as tenant}
				<button class="card tenant-card" onclick={() => selectedTenant = tenant}>
					<div class="tenant-header">
						<h3>{tenant.name}</h3>
						<span class="badge {tenant.isActive ? 'badge-success' : 'badge-demo'}">
							{tenant.isActive ? 'Actif' : 'Inactif'}
						</span>
					</div>
					<p class="tenant-slug font-mono text-muted">{tenant.slug}</p>
					<div class="tenant-meta">
						<span class="text-secondary">{tenant.providers.length} providers</span>
						<span class="text-muted">·</span>
						<span class="text-secondary capitalize">{tenant.plan}</span>
					</div>
				</button>
			{/each}
		</div>

		<!-- Tenant detail -->
		{#if selectedTenant}
			<div class="tenant-detail card">
				<div class="detail-header">
					<h2>{selectedTenant.name}</h2>
					<button class="btn btn-ghost btn-sm" onclick={() => selectedTenant = null}>Fermer</button>
				</div>

				<div class="detail-grid">
					<div class="detail-section">
						<h4 class="text-muted">Configuration</h4>
						<div class="detail-row">
							<span class="detail-label">Client ID</span>
							<code>{selectedTenant.slug}</code>
						</div>
						<div class="detail-row">
							<span class="detail-label">Plan</span>
							<span class="capitalize">{selectedTenant.plan}</span>
						</div>
						<div class="detail-row">
							<span class="detail-label">Créé le</span>
							<span>{formatDate(selectedTenant.createdAt)}</span>
						</div>
					</div>

					<div class="detail-section">
						<h4 class="text-muted">Redirect URIs</h4>
						{#each selectedTenant.redirectUris as uri}
							<code class="uri-block">{uri}</code>
						{/each}
					</div>

					<div class="detail-section">
						<h4 class="text-muted">Providers actifs</h4>
						<div class="providers-tags">
							{#each selectedTenant.providers as p}
								<span class="badge badge-accent">{p}</span>
							{/each}
						</div>
					</div>

					<div class="detail-section">
						<h4 class="text-muted">Clés API</h4>
						<div class="detail-row">
							<span class="detail-label">JWT Secret</span>
							<code class="secret-mask">sk_••••••••••••••••</code>
						</div>
						<div class="detail-row">
							<span class="detail-label">Webhook Secret</span>
							<code class="secret-mask">whsec_••••••••••••</code>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Create modal placeholder -->
		{#if showCreateModal}
			<div class="modal-overlay" onclick={() => showCreateModal = false} role="presentation">
				<!-- svelte-ignore a11y_interactive_supports_focus a11y_click_events_have_key_events -->
				<div class="modal card" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="-1">
					<h2>Créer un tenant</h2>
					<span class="badge badge-demo">Demo — création désactivée</span>
					<form class="modal-form" onsubmit={(e) => e.preventDefault()}>
						<div class="form-group">
							<label for="tenant-name">Nom de l'application</label>
							<input id="tenant-name" type="text" placeholder="Mon App" disabled />
						</div>
						<div class="form-group">
							<label for="tenant-slug">Slug (client_id)</label>
							<input id="tenant-slug" type="text" placeholder="mon-app" disabled />
						</div>
						<div class="form-group">
							<label for="redirect-uri">Redirect URI</label>
							<input id="redirect-uri" type="url" placeholder="https://monapp.com/callback" disabled />
						</div>
						<div class="modal-actions">
							<button class="btn btn-ghost" onclick={() => showCreateModal = false}>Annuler</button>
							<button class="btn btn-primary" disabled>Créer</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.tenant-page { padding: var(--space-xl) 0; }

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-xl);
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.title-row h1 { font-size: var(--text-2xl); font-weight: 700; }

	/* Tenant grid */
	.tenant-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-md);
	}

	.tenant-card {
		text-align: left;
		cursor: pointer;
		font-family: var(--font-sans);
		color: var(--text-primary);
		width: 100%;
	}

	.tenant-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.tenant-header h3 { font-size: var(--text-base); font-weight: 600; }

	.tenant-slug {
		font-size: var(--text-sm);
		margin-top: var(--space-xs);
	}

	.tenant-meta {
		display: flex;
		gap: var(--space-sm);
		margin-top: var(--space-md);
		font-size: var(--text-sm);
	}

	.capitalize { text-transform: capitalize; }

	/* Tenant detail */
	.tenant-detail { margin-top: var(--space-xl); }

	.detail-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-lg);
	}

	.detail-header h2 { font-size: var(--text-xl); font-weight: 600; }

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-xl);
	}

	.detail-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.detail-section h4 {
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-xs);
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--text-sm);
	}

	.detail-label { color: var(--text-secondary); }

	.uri-block {
		display: block;
		padding: var(--space-sm);
		background: var(--bg-tertiary);
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		word-break: break-all;
	}

	.providers-tags {
		display: flex;
		gap: var(--space-xs);
		flex-wrap: wrap;
	}

	.secret-mask {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 150;
	}

	.modal {
		width: 100%;
		max-width: 480px;
		padding: var(--space-xl);
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.modal h2 { font-size: var(--text-xl); font-weight: 600; }

	.modal-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.form-group { display: flex; flex-direction: column; }

	.modal-actions {
		display: flex;
		gap: var(--space-sm);
		justify-content: flex-end;
	}

	@media (max-width: 768px) {
		.detail-grid { grid-template-columns: 1fr; }
		.page-header { flex-direction: column; gap: var(--space-md); }
	}
</style>
