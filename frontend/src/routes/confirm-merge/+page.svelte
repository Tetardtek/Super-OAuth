<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let status = $state<'loading' | 'success' | 'error'>('loading');
	let errorMsg = $state('');
	let provider = $state('');

	onMount(async () => {
		const token = $page.url.searchParams.get('token');

		if (!token) {
			status = 'error';
			errorMsg = 'Token de fusion manquant.';
			return;
		}

		try {
			const res = await fetch('/api/v1/auth/confirm-merge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token }),
			});

			const data = await res.json();

			if (res.ok && data.success) {
				status = 'success';
				// Find the newest provider from linked list
				const providers = data.data?.user?.linkedProviders || [];
				provider = providers[providers.length - 1] || 'le provider';
			} else {
				status = 'error';
				errorMsg = data.message || 'Fusion échouée.';
			}
		} catch {
			status = 'error';
			errorMsg = 'Erreur réseau. Réessaie plus tard.';
		}
	});
</script>

<svelte:head>
	<title>Fusion de compte — SuperOAuth</title>
</svelte:head>

<div class="merge-page">
	{#if status === 'loading'}
		<div class="spinner"></div>
		<p>Fusion en cours...</p>
	{:else if status === 'success'}
		<div class="success-icon">✓</div>
		<h2>Compte fusionné !</h2>
		<p><strong>{provider}</strong> a été ajouté à ton compte.</p>
		<p class="hint">Tu peux fermer cette page et te reconnecter avec ce provider.</p>
	{:else if status === 'error'}
		<div class="error-icon">✕</div>
		<h2>Fusion échouée</h2>
		<p class="error-text">{errorMsg}</p>
		<a href="/login" class="btn btn-ghost">Retour au login</a>
	{/if}
</div>

<style>
	.merge-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - var(--header-height));
		gap: var(--space-md);
		color: var(--text-secondary);
		text-align: center;
		padding: var(--space-xl);
	}

	.success-icon {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--accent);
		color: var(--bg);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32px;
		font-weight: bold;
	}

	.error-icon {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--danger);
		color: var(--bg);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32px;
		font-weight: bold;
	}

	h2 { color: var(--text-primary); margin: 0; }
	.hint { color: var(--text-muted); font-size: 14px; }
	.error-text { color: var(--danger); }

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
