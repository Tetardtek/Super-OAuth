<script lang="ts">
	import { platformAuth } from '$stores/platformAuth';
	import { platformApi } from '$services/platformApi';
	import { goto } from '$app/navigation';
	import type { AccessibleTenant } from '$types/platform';

	let mobileOpen = $state(false);
	let workspacesOpen = $state(false);
	let workspaces = $state<AccessibleTenant[]>([]);
	let workspacesLoaded = $state(false);
	let workspacesLoading = $state(false);

	function handleLogout() {
		platformAuth.logout();
		goto('/platform/login');
	}

	async function toggleWorkspaces() {
		workspacesOpen = !workspacesOpen;
		if (workspacesOpen && !workspacesLoaded) {
			workspacesLoading = true;
			try {
				const res = await platformApi.get<{
					success: true;
					data: { tenants: AccessibleTenant[] };
				}>('/tenants');
				workspaces = res.data.tenants;
				workspacesLoaded = true;
			} catch {
				// silent — user can retry
			} finally {
				workspacesLoading = false;
			}
		}
	}

	function pickWorkspace(clientId: string) {
		workspacesOpen = false;
		goto(`/platform/dashboard/tenant/${clientId}`);
	}
</script>

<svelte:window onclick={() => (workspacesOpen = false)} />

<nav class="navbar">
	<div class="container nav-inner">
		<a href="/platform/dashboard" class="logo">
			<span class="logo-icon">S</span>
			<span class="logo-text">SuperOAuth <span class="scope-badge">Platform</span></span>
		</a>

		<div class="nav-actions">
			{#if $platformAuth.user}
				<span class="user-email text-muted">{$platformAuth.user.email}</span>
				<a href="/platform/dashboard" class="btn btn-ghost btn-sm">Dashboard</a>
				<div class="workspaces-wrapper" onclick={(e) => e.stopPropagation()}>
					<button
						class="btn btn-ghost btn-sm"
						onclick={toggleWorkspaces}
						aria-haspopup="menu"
						aria-expanded={workspacesOpen}
					>
						Workspaces ▾
					</button>
					{#if workspacesOpen}
						<div class="workspaces-menu" role="menu">
							{#if workspacesLoading}
								<div class="workspace-state text-muted">⏳ Chargement…</div>
							{:else if workspaces.length === 0}
								<div class="workspace-state text-muted">
									Aucun tenant — <a href="/platform/dashboard/create">en créer un</a>
								</div>
							{:else}
								{#each workspaces as w (w.clientId)}
									<button
										class="workspace-item"
										onclick={() => pickWorkspace(w.clientId)}
										role="menuitem"
									>
										<span class="workspace-name">{w.name}</span>
										<span class="workspace-role" data-role={w.role}>
											{w.role === 'owner' ? 'Owner' : 'Admin'}
										</span>
									</button>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
				<button class="btn btn-ghost btn-sm" onclick={handleLogout}>Logout</button>
			{:else}
				<a href="/platform/login" class="btn btn-ghost btn-sm">Se connecter</a>
				<a href="/platform/signup" class="btn btn-primary btn-sm">Commencer</a>
			{/if}
		</div>

		<button
			class="mobile-toggle"
			onclick={() => (mobileOpen = !mobileOpen)}
			aria-label="Menu"
		>
			<span class="hamburger" class:open={mobileOpen}></span>
		</button>
	</div>
</nav>

<style>
	.navbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: var(--header-height);
		background: var(--bg-card);
		border-bottom: 1px solid var(--border);
		z-index: 100;
	}
	.nav-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 100%;
	}
	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--text-primary);
		text-decoration: none;
		font-weight: 700;
	}
	.logo-icon {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		background: var(--accent);
		color: var(--bg-page);
		border-radius: 6px;
		font-weight: 800;
	}
	.scope-badge {
		font-size: var(--text-xs);
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--accent);
		color: var(--bg-page);
		margin-left: var(--space-xs);
		font-weight: 600;
	}
	.nav-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}
	.user-email {
		font-size: var(--text-sm);
	}
	.workspaces-wrapper {
		position: relative;
	}
	.workspaces-menu {
		position: absolute;
		top: calc(100% + var(--space-xs));
		right: 0;
		min-width: 260px;
		max-height: 360px;
		overflow-y: auto;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 8px;
		box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
		padding: var(--space-xs);
		z-index: 150;
	}
	.workspace-state {
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-sm);
		text-align: center;
	}
	.workspace-state a {
		color: var(--accent);
	}
	.workspace-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		border: none;
		border-radius: 6px;
		color: var(--text-primary);
		font-size: var(--text-sm);
		cursor: pointer;
		text-align: left;
		gap: var(--space-sm);
	}
	.workspace-item:hover {
		background: rgba(255, 255, 255, 0.04);
	}
	.workspace-name {
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.workspace-role {
		padding: 2px 6px;
		border-radius: 4px;
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex-shrink: 0;
	}
	.workspace-role[data-role='owner'] {
		background: var(--accent);
		color: var(--bg-page);
	}
	.workspace-role[data-role='admin'] {
		background: rgba(200, 164, 78, 0.15);
		color: var(--accent);
		border: 1px solid rgba(200, 164, 78, 0.3);
	}
	.mobile-toggle {
		display: none;
		background: transparent;
		border: none;
		color: var(--text-primary);
		cursor: pointer;
	}
	.hamburger {
		display: block;
		width: 20px;
		height: 2px;
		background: currentColor;
		position: relative;
	}
	.hamburger::before,
	.hamburger::after {
		content: '';
		position: absolute;
		left: 0;
		width: 100%;
		height: 2px;
		background: currentColor;
		transition: transform var(--transition-fast);
	}
	.hamburger::before {
		top: -6px;
	}
	.hamburger::after {
		top: 6px;
	}
	@media (max-width: 640px) {
		.user-email {
			display: none;
		}
	}
</style>
