<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	const sections = [
		{ href: '/docs', label: 'Démarrage rapide' },
		{ href: '/docs/api', label: 'API Reference' },
		{ href: '/docs/integration', label: 'Intégration' },
		{ href: '/docs/security', label: 'Sécurité' },
		{ href: '/docs/architecture', label: 'Architecture' },
		{ href: '/docs/deployment', label: 'Déploiement' }
	];
</script>

<div class="docs-layout">
	<aside class="docs-sidebar">
		<nav>
			<span class="sidebar-title text-muted">Documentation</span>
			{#each sections as s}
				<a
					href={s.href}
					class="sidebar-link"
					class:active={$page.url.pathname === s.href}
				>
					{s.label}
				</a>
			{/each}
		</nav>
	</aside>
	<article class="docs-content container">
		{@render children()}
	</article>
</div>

<style>
	.docs-layout {
		display: flex;
		min-height: calc(100vh - var(--header-height));
	}

	.docs-sidebar {
		width: 240px;
		flex-shrink: 0;
		border-right: 1px solid var(--border);
		padding: var(--space-xl) var(--space-lg);
		position: sticky;
		top: var(--header-height);
		height: calc(100vh - var(--header-height));
		overflow-y: auto;
	}

	.sidebar-title {
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 600;
		display: block;
		margin-bottom: var(--space-md);
	}

	nav {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.sidebar-link {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
	}

	.sidebar-link:hover {
		color: var(--text-primary);
		background: var(--bg-tertiary);
	}

	.sidebar-link.active {
		color: var(--accent);
		background: var(--accent-muted);
	}

	.docs-content {
		flex: 1;
		max-width: 800px;
		padding: var(--space-xl) var(--space-2xl);
	}

	@media (max-width: 768px) {
		.docs-layout { flex-direction: column; }
		.docs-sidebar {
			width: 100%;
			height: auto;
			position: static;
			border-right: none;
			border-bottom: 1px solid var(--border);
			padding: var(--space-md);
		}

		nav { flex-direction: row; flex-wrap: wrap; }
		.docs-content { padding: var(--space-lg); }
	}
</style>
