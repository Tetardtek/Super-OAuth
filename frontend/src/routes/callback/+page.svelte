<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$stores/auth';
	import { toast } from '$stores/toast';
	import { onMount } from 'svelte';

	let status = $state<'loading' | 'success' | 'error'>('loading');
	let errorMsg = $state('');

	onMount(async () => {
		const params = $page.url.searchParams;
		const token = params.get('token');
		const error = params.get('error');

		if (error) {
			status = 'error';
			errorMsg = error;
			toast.error(`Erreur OAuth : ${error}`);
			return;
		}

		if (!token) {
			status = 'error';
			errorMsg = 'Aucun token reçu';
			toast.error('Callback OAuth invalide');
			return;
		}

		try {
			localStorage.setItem('accessToken', token);

			const res = await fetch('/api/v1/auth/me', {
				headers: { Authorization: `Bearer ${token}` }
			});

			if (!res.ok) throw new Error('Token invalide');

			const user = await res.json();
			auth.setUser(user, token);
			status = 'success';
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
	<title>Authentification — SuperOAuth</title>
</svelte:head>

<div class="callback-page">
	{#if status === 'loading'}
		<div class="spinner"></div>
		<p>Authentification en cours...</p>
	{:else if status === 'error'}
		<p class="error-text">{errorMsg}</p>
		<a href="/login" class="btn btn-ghost">Retour au login</a>
	{/if}
</div>

<style>
	.callback-page {
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
