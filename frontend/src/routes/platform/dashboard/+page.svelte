<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { platformApi, type ApiError } from '$services/platformApi';
	import { platformAuth } from '$stores/platformAuth';
	import { toast } from '$stores/toast';
	import type { PlatformTenant } from '$types/platform';

	let tenants = $state<PlatformTenant[]>([]);
	let loading = $state(true);

	onMount(async () => {
		const token = platformAuth.getAccessToken();
		if (!token) {
			goto('/platform/login');
			return;
		}
		try {
			const res = await platformApi.get<{ success: true; data: { tenants: PlatformTenant[] } }>(
				'/tenants'
			);
			tenants = res.data.tenants;
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			if (apiErr.status === 401) {
				platformAuth.logout();
				toast.error('Session expirée — merci de te reconnecter.');
				goto('/platform/login');
				return;
			}
			toast.error(apiErr.message || 'Impossible de charger les tenants.');
		} finally {
			loading = false;
		}
	});

	function formatDate(iso: string) {
		try {
			return new Date(iso).toLocaleDateString('fr-FR', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return iso;
		}
	}
</script>

<svelte:head>
	<title>Dashboard — SuperOAuth Platform</title>
</svelte:head>

<div class="dashboard-page">
	<div class="container">
		<header class="page-header">
			<div>
				<h1>Mes tenants</h1>
				<p class="text-secondary">
					Gère tes tenants SuperOAuth — configuration OAuth, admins, audit, settings.
				</p>
			</div>
			<a href="/platform/dashboard/create" class="btn btn-primary btn-lg">+ Nouveau tenant</a>
		</header>

		{#if loading}
			<div class="state-block text-secondary">⏳ Chargement…</div>
		{:else if tenants.length === 0}
			<div class="empty-state card">
				<h2>Aucun tenant pour l'instant</h2>
				<p class="text-secondary">
					Crée ton premier tenant pour commencer à recevoir des utilisateurs via
					OAuth (Discord, GitHub, Google, Twitch).
				</p>
				<a href="/platform/dashboard/create" class="btn btn-primary btn-lg">
					Créer mon premier tenant
				</a>
			</div>
		{:else}
			<div class="tenant-grid">
				{#each tenants as tenant (tenant.clientId)}
					<a
						href="/platform/dashboard/tenant/{tenant.clientId}"
						class="tenant-card card"
					>
						<h3>{tenant.name}</h3>
						<p class="client-id text-muted">
							<code>{tenant.clientId.slice(0, 8)}…</code>
						</p>
						<dl class="tenant-meta text-secondary">
							<div>
								<dt>Créé le</dt>
								<dd>{formatDate(tenant.createdAt)}</dd>
							</div>
							<div>
								<dt>Rétention</dt>
								<dd>{tenant.retentionDays}j</dd>
							</div>
						</dl>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.dashboard-page {
		padding: var(--space-xl) 0;
	}
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
		flex-wrap: wrap;
	}
	.page-header h1 {
		font-size: var(--text-3xl);
		font-weight: 700;
		margin-bottom: var(--space-xs);
	}
	.state-block {
		text-align: center;
		padding: var(--space-xl);
	}
	.empty-state {
		text-align: center;
		padding: calc(var(--space-xl) * 2) var(--space-xl);
	}
	.empty-state h2 {
		font-size: var(--text-xl);
		margin-bottom: var(--space-sm);
	}
	.empty-state p {
		max-width: 420px;
		margin: 0 auto var(--space-lg);
	}
	.tenant-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-lg);
	}
	.tenant-card {
		display: block;
		padding: var(--space-lg);
		text-decoration: none;
		color: var(--text-primary);
		transition: transform var(--transition-fast), border-color var(--transition-fast);
	}
	.tenant-card:hover {
		transform: translateY(-2px);
		border-color: var(--accent);
	}
	.tenant-card h3 {
		font-size: var(--text-lg);
		font-weight: 700;
		margin-bottom: var(--space-xs);
	}
	.client-id {
		font-size: var(--text-xs);
		margin-bottom: var(--space-md);
	}
	.tenant-meta {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-sm);
		font-size: var(--text-sm);
	}
	.tenant-meta dt {
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.7;
	}
	.tenant-meta dd {
		margin: 0;
		margin-top: 2px;
		font-weight: 600;
	}
</style>
