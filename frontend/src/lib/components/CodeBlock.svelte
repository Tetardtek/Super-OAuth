<script lang="ts">
	let { code, lang = 'bash' }: { code: string; lang?: string } = $props();
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(code);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="code-block">
	<div class="code-header">
		<span class="code-lang text-muted">{lang}</span>
		<button class="copy-btn" onclick={copy}>
			{copied ? 'Copié !' : 'Copier'}
		</button>
	</div>
	<pre><code>{code}</code></pre>
</div>

<style>
	.code-block {
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		overflow: hidden;
		margin: var(--space-md) 0;
	}

	.code-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-xs) var(--space-md);
		border-bottom: 1px solid var(--border);
		background: var(--bg-secondary);
	}

	.code-lang {
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.copy-btn {
		background: none;
		border: none;
		color: var(--accent);
		font-size: var(--text-xs);
		cursor: pointer;
		font-family: var(--font-sans);
		padding: 2px var(--space-sm);
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);
	}

	.copy-btn:hover {
		background: var(--accent-muted);
	}

	pre {
		padding: var(--space-md);
		overflow-x: auto;
		margin: 0;
	}

	code {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		line-height: 1.6;
		color: var(--text-primary);
		background: none;
		padding: 0;
	}
</style>
