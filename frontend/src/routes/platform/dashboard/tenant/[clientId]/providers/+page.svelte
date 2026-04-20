<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { platformApi, type ApiError } from '$services/platformApi';
	import { tenantCtx } from '$stores/tenantCtx';
	import { toast } from '$stores/toast';
	import type { OAuthProvider, TenantProviderConfig } from '$types/platform';

	const clientId = $derived(($page.params as Record<string, string>).clientId);
	const isOwner = $derived($tenantCtx.currentRole === 'owner');

	const PROVIDERS: Array<{
		id: OAuthProvider;
		label: string;
		color: string;
		hint: string;
	}> = [
		{
			id: 'discord',
			label: 'Discord',
			color: '#5865F2',
			hint: 'discord.com/developers/applications → OAuth2 → Client ID / Client Secret'
		},
		{
			id: 'github',
			label: 'GitHub',
			color: '#f0f0f0',
			hint: 'github.com/settings/developers → OAuth Apps → New OAuth App'
		},
		{
			id: 'google',
			label: 'Google',
			color: '#db4437',
			hint: 'console.cloud.google.com → APIs & Services → Credentials → OAuth 2.0'
		},
		{
			id: 'twitch',
			label: 'Twitch',
			color: '#9146FF',
			hint: 'dev.twitch.tv/console/apps → Register Your Application'
		}
	];

	let configs = $state<TenantProviderConfig[]>([]);
	let loading = $state(true);
	let editing = $state<OAuthProvider | null>(null);
	let formClientId = $state('');
	let formClientSecret = $state('');
	let submitLoading = $state(false);

	async function loadConfigs() {
		loading = true;
		try {
			const res = await platformApi.get<{
				success: true;
				data: { providers: TenantProviderConfig[] };
			}>(`/tenants/${clientId}/providers`);
			configs = res.data.providers;
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			toast.error(apiErr.message || 'Impossible de charger les providers.');
		} finally {
			loading = false;
		}
	}

	onMount(loadConfigs);

	function openEdit(provider: OAuthProvider) {
		editing = provider;
		const existing = configs.find((c) => c.provider === provider);
		formClientId = existing?.clientId ?? '';
		formClientSecret = '';
	}

	function cancelEdit() {
		editing = null;
		formClientId = '';
		formClientSecret = '';
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!editing) return;
		if (!formClientId.trim() || !formClientSecret.trim()) {
			toast.error('Client ID et Client Secret requis.');
			return;
		}
		submitLoading = true;
		try {
			await platformApi.post(`/tenants/${clientId}/providers`, {
				provider: editing,
				clientId: formClientId.trim(),
				clientSecret: formClientSecret.trim()
			});
			toast.success(`${editing} configuré.`);
			cancelEdit();
			await loadConfigs();
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			toast.error(apiErr.message || 'Erreur lors de la configuration.');
		} finally {
			submitLoading = false;
		}
	}

	async function handleDelete(provider: OAuthProvider) {
		if (
			!confirm(
				`Désactiver ${provider} ? Les utilisateurs finaux ne pourront plus s'authentifier via ce provider sur ce tenant.`
			)
		) {
			return;
		}
		try {
			await platformApi.delete(`/tenants/${clientId}/providers/${provider}`);
			toast.success(`${provider} désactivé.`);
			await loadConfigs();
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			toast.error(apiErr.message || 'Erreur lors de la suppression.');
		}
	}

	function configFor(provider: OAuthProvider): TenantProviderConfig | undefined {
		return configs.find((c) => c.provider === provider);
	}
</script>

<svelte:head>
	<title>Providers — SuperOAuth Platform</title>
</svelte:head>

<div class="providers-page">
	<header class="section-header">
		<h2>Providers OAuth</h2>
		<p class="text-secondary">
			Configure les credentials OAuth par provider. Si un provider n'est pas configuré
			sur ce tenant, le fallback global SuperOAuth est utilisé (utile pour tester,
			recommandé de configurer tes propres credentials en prod).
		</p>
	</header>

	{#if loading}
		<p class="text-muted">⏳ Chargement…</p>
	{:else}
		<div class="provider-grid">
			{#each PROVIDERS as p}
				{@const cfg = configFor(p.id)}
				<section class="card provider-card">
					<header class="provider-header">
						<div class="provider-title">
							<span class="provider-dot" style="background: {p.color}"></span>
							<h3>{p.label}</h3>
						</div>
						{#if cfg}
							<span class="status-tag configured">Configuré</span>
						{:else}
							<span class="status-tag fallback">Fallback global</span>
						{/if}
					</header>

					{#if editing === p.id}
						<form onsubmit={handleSubmit} class="provider-form">
							<div class="form-group">
								<label for="{p.id}-client-id">Client ID</label>
								<input
									id="{p.id}-client-id"
									type="text"
									bind:value={formClientId}
									placeholder="xxx.apps.googleusercontent.com / xxxxxxxx / …"
									required
								/>
							</div>
							<div class="form-group">
								<label for="{p.id}-client-secret">Client Secret</label>
								<input
									id="{p.id}-client-secret"
									type="password"
									bind:value={formClientSecret}
									placeholder={cfg ? 'Nouveau secret (remplace l\'actuel)' : 'Secret depuis la console du provider'}
									required
								/>
							</div>
							<p class="hint text-muted">{p.hint}</p>
							<div class="form-actions">
								<button type="button" class="btn btn-ghost btn-sm" onclick={cancelEdit}>
									Annuler
								</button>
								<button type="submit" class="btn btn-primary btn-sm" disabled={submitLoading}>
									{submitLoading ? 'Enregistrement...' : cfg ? 'Remplacer' : 'Configurer'}
								</button>
							</div>
						</form>
					{:else if cfg}
						<dl class="provider-info">
							<div>
								<dt>Client ID</dt>
								<dd><code>{cfg.clientId}</code></dd>
							</div>
						</dl>
						{#if isOwner}
							<div class="card-actions">
								<button class="btn btn-ghost btn-sm" onclick={() => openEdit(p.id)}>
									Remplacer
								</button>
								<button
									class="btn btn-ghost btn-sm danger"
									onclick={() => handleDelete(p.id)}
								>
									Désactiver
								</button>
							</div>
						{/if}
					{:else}
						<p class="text-muted provider-empty">
							Non configuré — les users finaux utilisent les credentials SuperOAuth par défaut.
						</p>
						{#if isOwner}
							<button class="btn btn-primary btn-sm" onclick={() => openEdit(p.id)}>
								Configurer {p.label}
							</button>
						{/if}
					{/if}
				</section>
			{/each}
		</div>

		{#if !isOwner}
			<p class="hint text-muted">
				Seul l'owner peut configurer ou désactiver les providers.
			</p>
		{/if}
	{/if}
</div>

<style>
	.providers-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}
	.section-header h2 {
		font-size: var(--text-lg);
		font-weight: 700;
		margin-bottom: var(--space-xs);
	}
	.section-header p {
		font-size: var(--text-sm);
		max-width: 640px;
		line-height: 1.5;
	}
	.provider-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: var(--space-lg);
	}
	.provider-card {
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}
	.provider-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.provider-title {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}
	.provider-title h3 {
		font-size: var(--text-md);
		font-weight: 700;
	}
	.provider-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}
	.status-tag {
		padding: 2px 8px;
		border-radius: 4px;
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.status-tag.configured {
		background: var(--accent);
		color: var(--bg-page);
	}
	.status-tag.fallback {
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-muted);
	}
	.provider-info dt {
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.7;
		margin-bottom: 2px;
	}
	.provider-info dd {
		margin: 0;
	}
	.provider-info code {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-xs);
		padding: 2px 6px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		word-break: break-all;
	}
	.provider-empty {
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.provider-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}
	.form-group {
		margin-bottom: 0;
	}
	.hint {
		font-size: var(--text-xs);
	}
	.card-actions,
	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
	}
	.btn.danger {
		color: var(--danger, #dc3545);
	}
</style>
