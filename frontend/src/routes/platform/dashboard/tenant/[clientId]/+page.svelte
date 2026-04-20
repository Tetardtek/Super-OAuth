<script lang="ts">
	import { tenantCtx } from '$stores/tenantCtx';

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleString('fr-FR', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return iso;
		}
	}
</script>

<svelte:head>
	<title>Overview — SuperOAuth Platform</title>
</svelte:head>

{#if $tenantCtx.tenant}
	{@const t = $tenantCtx.tenant}
	<div class="overview">
		<section class="card info-card">
			<h2>Configuration</h2>
			<dl>
				<div class="row">
					<dt>Client ID</dt>
					<dd><code>{t.clientId}</code></dd>
				</div>
				<div class="row">
					<dt>Nom</dt>
					<dd>{t.name}</dd>
				</div>
				<div class="row">
					<dt>Créé le</dt>
					<dd>{formatDate(t.createdAt)}</dd>
				</div>
				<div class="row">
					<dt>Rétention logs</dt>
					<dd>{t.retentionDays} jours</dd>
				</div>
				<div class="row">
					<dt>Webhook</dt>
					<dd>
						{#if t.webhookUrl}
							<code>{t.webhookUrl}</code>
						{:else}
							<span class="text-muted">Non configuré</span>
						{/if}
					</dd>
				</div>
			</dl>
		</section>

		<section class="card info-card">
			<h2>URLs autorisées</h2>
			<div class="row">
				<dt>Allowed Origins</dt>
				<dd>
					{#if t.allowedOrigins && t.allowedOrigins.length}
						<ul class="url-list">
							{#each t.allowedOrigins as origin}
								<li><code>{origin}</code></li>
							{/each}
						</ul>
					{:else}
						<span class="text-muted">Aucune origine configurée</span>
					{/if}
				</dd>
			</div>
			<div class="row">
				<dt>Redirect URIs</dt>
				<dd>
					{#if t.redirectUris && t.redirectUris.length}
						<ul class="url-list">
							{#each t.redirectUris as uri}
								<li><code>{uri}</code></li>
							{/each}
						</ul>
					{:else}
						<span class="text-muted">Aucune URI de redirection configurée</span>
					{/if}
				</dd>
			</div>
		</section>

		<p class="hint text-muted">
			Modification de ces paramètres disponible via l'onglet <em>Settings</em> (à venir en P5.D).
		</p>
	</div>
{/if}

<style>
	.overview {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}
	.info-card {
		padding: var(--space-lg);
	}
	.info-card h2 {
		font-size: var(--text-lg);
		font-weight: 700;
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-sm);
		border-bottom: 1px solid var(--border);
	}
	dl {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}
	.row {
		display: grid;
		grid-template-columns: 180px 1fr;
		gap: var(--space-md);
		align-items: baseline;
	}
	dt {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--text-secondary);
	}
	dd {
		margin: 0;
		font-size: var(--text-sm);
	}
	code {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-xs);
		padding: 2px 6px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}
	.url-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}
	.hint {
		font-size: var(--text-xs);
		text-align: center;
		margin-top: var(--space-md);
	}
	@media (max-width: 640px) {
		.row {
			grid-template-columns: 1fr;
			gap: var(--space-xs);
		}
	}
</style>
