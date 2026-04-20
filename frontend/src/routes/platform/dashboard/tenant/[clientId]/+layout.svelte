<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { platformApi, type ApiError } from '$services/platformApi';
	import { platformAuth } from '$stores/platformAuth';
	import { tenantCtx } from '$stores/tenantCtx';
	import { toast } from '$stores/toast';
	import type { PlatformTenant, TenantAdmin } from '$types/platform';

	let { children } = $props();

	const clientId = $derived(($page.params as Record<string, string>).clientId);
	const currentPath = $derived($page.url.pathname);

	async function load() {
		tenantCtx.update((s) => ({ ...s, loading: true }));
		const currentUserId = $platformAuth.user?.id;
		if (!currentUserId) {
			goto('/platform/login');
			return;
		}

		try {
			// No GET /tenants/:clientId endpoint exists yet — filter from owned list.
			// Admin role is deduced from /tenants/:clientId/admins.
			const [tenantsRes, adminsRes] = await Promise.all([
				platformApi.get<{ success: true; data: { tenants: PlatformTenant[] } }>('/tenants'),
				platformApi.get<{ success: true; data: { admins: TenantAdmin[] } }>(
					`/tenants/${clientId}/admins`
				)
			]);

			const tenant = tenantsRes.data.tenants.find((t) => t.clientId === clientId);
			const admins = adminsRes.data.admins;
			const membership = admins.find((a) => a.platformUserId === currentUserId);

			if (!tenant && !membership) {
				toast.error('Tenant introuvable ou accès refusé.');
				goto('/platform/dashboard');
				return;
			}

			tenantCtx.set({
				tenant: tenant ?? null,
				admins,
				currentRole: membership?.role ?? null,
				loading: false
			});
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			if (apiErr.status === 404) {
				toast.error('Tenant introuvable.');
				goto('/platform/dashboard');
				return;
			}
			if (apiErr.status === 401) {
				platformAuth.logout();
				goto('/platform/login');
				return;
			}
			toast.error(apiErr.message || 'Erreur lors du chargement du tenant.');
			tenantCtx.update((s) => ({ ...s, loading: false }));
		}
	}

	onMount(load);

	$effect(() => {
		if (clientId) load();
	});

	function tabActive(prefix: string): boolean {
		const base = `/platform/dashboard/tenant/${clientId}`;
		if (prefix === '') return currentPath === base;
		return currentPath === `${base}/${prefix}` || currentPath.startsWith(`${base}/${prefix}/`);
	}
</script>

<div class="tenant-shell">
	<div class="container">
		{#if $tenantCtx.loading}
			<div class="state-block text-secondary">⏳ Chargement du tenant…</div>
		{:else if !$tenantCtx.tenant}
			<div class="state-block text-secondary">Tenant indisponible.</div>
		{:else}
			<header class="tenant-header">
				<div>
					<nav class="breadcrumb text-muted">
						<a href="/platform/dashboard">Dashboard</a>
						<span>›</span>
						<span>{$tenantCtx.tenant.name}</span>
					</nav>
					<h1>{$tenantCtx.tenant.name}</h1>
					<p class="client-id text-muted">
						<code>{$tenantCtx.tenant.clientId}</code>
					</p>
				</div>
				<div class="role-badge" data-role={$tenantCtx.currentRole ?? 'none'}>
					{$tenantCtx.currentRole === 'owner'
						? 'Owner'
						: $tenantCtx.currentRole === 'admin'
							? 'Admin'
							: '—'}
				</div>
			</header>

			<nav class="tabs">
				<a
					href="/platform/dashboard/tenant/{clientId}"
					class="tab"
					class:active={tabActive('')}
				>
					Overview
				</a>
				<a
					href="/platform/dashboard/tenant/{clientId}/admins"
					class="tab"
					class:active={tabActive('admins')}
				>
					Admins
				</a>
				<a
					href="/platform/dashboard/tenant/{clientId}/providers"
					class="tab"
					class:active={tabActive('providers')}
				>
					Providers
				</a>
				<span class="tab disabled" title="À venir">Settings</span>
			</nav>

			<section class="tab-content">
				{@render children()}
			</section>
		{/if}
	</div>
</div>

<style>
	.tenant-shell {
		padding: var(--space-xl) 0;
	}
	.state-block {
		text-align: center;
		padding: var(--space-xl);
	}
	.tenant-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-lg);
		margin-bottom: var(--space-lg);
		flex-wrap: wrap;
	}
	.breadcrumb {
		display: flex;
		gap: var(--space-xs);
		font-size: var(--text-sm);
		margin-bottom: var(--space-xs);
	}
	.breadcrumb a {
		color: inherit;
		text-decoration: none;
	}
	.breadcrumb a:hover {
		color: var(--accent);
	}
	.tenant-header h1 {
		font-size: var(--text-3xl);
		font-weight: 700;
		margin-bottom: var(--space-xs);
	}
	.client-id code {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-xs);
	}
	.role-badge {
		padding: var(--space-xs) var(--space-sm);
		border-radius: 6px;
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.role-badge[data-role='owner'] {
		background: var(--accent);
		color: var(--bg-page);
	}
	.role-badge[data-role='admin'] {
		background: rgba(200, 164, 78, 0.15);
		color: var(--accent);
		border: 1px solid var(--accent);
	}
	.role-badge[data-role='none'] {
		background: transparent;
		color: var(--text-muted);
	}
	.tabs {
		display: flex;
		gap: var(--space-md);
		border-bottom: 1px solid var(--border);
		margin-bottom: var(--space-lg);
	}
	.tab {
		padding: var(--space-sm) 0;
		color: var(--text-secondary);
		text-decoration: none;
		border-bottom: 2px solid transparent;
		font-weight: 500;
		transition: color var(--transition-fast), border-color var(--transition-fast);
	}
	.tab:hover:not(.disabled) {
		color: var(--text-primary);
	}
	.tab.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}
	.tab.disabled {
		color: var(--text-muted);
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
