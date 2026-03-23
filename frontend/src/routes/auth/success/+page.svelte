<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$stores/auth';
	import { toast } from '$stores/toast';
	import { onMount } from 'svelte';

	let status = $state<'loading' | 'error'>('loading');
	let errorMsg = $state('');

	onMount(async () => {
		const params = $page.url.searchParams;
		const token = params.get('token');

		if (!token) {
			status = 'error';
			errorMsg = 'Aucun token reçu';
			return;
		}

		try {
			localStorage.setItem('accessToken', token);

			const res = await fetch('/api/v1/auth/me', {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!res.ok) throw new Error('Token invalide');

			const body = await res.json();
			auth.setUser(body.data.user, token);
			toast.success('Connexion réussie');
			goto('/dashboard');
		} catch {
			status = 'error';
			errorMsg = 'Impossible de valider le token';
			toast.error('Erreur de validation');
		}
	});
</script>

<svelte:head>
	<title>Connexion — SuperOAuth</title>
</svelte:head>

<div class="success-page">
	{#if status === 'loading'}
		<div class="spinner"></div>
		<p>Connexion en cours...</p>
	{:else}
		<p class="error-text">{errorMsg}</p>
		<a href="/login" class="btn btn-ghost">Retour au login</a>
	{/if}
</div>

<style>
	.success-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - var(--header-height));
		gap: var(--space-lg);
		color: var(--text-secondary);
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.error-text { color: var(--danger); }

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
