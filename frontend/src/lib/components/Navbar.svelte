<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '$stores/auth';

	let mobileOpen = $state(false);

	const navLinks = [
		{ href: '/#features', label: 'Features' },
		{ href: '/#pricing', label: 'Pricing' },
		{ href: '/docs', label: 'Docs' }
	];
</script>

<nav class="navbar">
	<div class="container nav-inner">
		<a href="/" class="logo">
			<span class="logo-icon">S</span>
			<span class="logo-text">SuperOAuth</span>
		</a>

		<div class="nav-links" class:open={mobileOpen}>
			{#each navLinks as link}
				<a href={link.href} class="nav-link" onclick={() => mobileOpen = false}>
					{link.label}
				</a>
			{/each}
		</div>

		<div class="nav-actions">
			{#if $auth.user}
				<a href="/dashboard" class="btn btn-ghost btn-sm">Dashboard</a>
			{:else}
				<a href="/platform/login" class="btn btn-ghost btn-sm">Se connecter</a>
				<a href="/platform/signup" class="btn btn-primary btn-sm">Commencer</a>
			{/if}
		</div>

		<button class="mobile-toggle" onclick={() => mobileOpen = !mobileOpen} aria-label="Menu">
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
		background: rgba(13, 13, 15, 0.85);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--border);
		z-index: 100;
	}

	.nav-inner {
		display: flex;
		align-items: center;
		height: 100%;
		gap: var(--space-xl);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-weight: 700;
		font-size: var(--text-lg);
		color: var(--text-primary);
	}

	.logo:hover { color: var(--text-primary); }

	.logo-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: var(--accent);
		color: var(--bg-primary);
		border-radius: var(--radius-sm);
		font-weight: 800;
		font-size: var(--text-base);
	}

	.nav-links {
		display: flex;
		gap: var(--space-lg);
		flex: 1;
	}

	.nav-link {
		color: var(--text-secondary);
		font-size: var(--text-sm);
		font-weight: 500;
		transition: color var(--transition-fast);
	}

	.nav-link:hover { color: var(--text-primary); }

	.nav-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.mobile-toggle {
		display: none;
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--space-sm);
	}

	.hamburger {
		display: block;
		width: 20px;
		height: 2px;
		background: var(--text-primary);
		position: relative;
		transition: background var(--transition-fast);
	}

	.hamburger::before,
	.hamburger::after {
		content: '';
		position: absolute;
		width: 100%;
		height: 2px;
		background: var(--text-primary);
		transition: transform var(--transition-fast);
	}

	.hamburger::before { top: -6px; }
	.hamburger::after { top: 6px; }

	.hamburger.open { background: transparent; }
	.hamburger.open::before { transform: rotate(45deg) translate(4px, 4px); }
	.hamburger.open::after { transform: rotate(-45deg) translate(4px, -4px); }

	@media (max-width: 768px) {
		.nav-links {
			display: none;
			position: absolute;
			top: var(--header-height);
			left: 0;
			right: 0;
			flex-direction: column;
			background: var(--bg-secondary);
			padding: var(--space-lg);
			border-bottom: 1px solid var(--border);
		}

		.nav-links.open { display: flex; }
		.nav-actions { display: none; }
		.mobile-toggle { display: block; }
	}
</style>
