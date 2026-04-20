<script lang="ts">
	import { platformAuth } from '$stores/platformAuth';
	import { goto } from '$app/navigation';

	let mobileOpen = $state(false);

	function handleLogout() {
		platformAuth.logout();
		goto('/platform/login');
	}
</script>

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
