<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$stores/auth';
	import { toast } from '$stores/toast';
	import { onMount } from 'svelte';

	type Status = 'loading' | 'success' | 'error' | 'verification_pending' | 'merge_pending';

	let status = $state<Status>('loading');
	let errorMsg = $state('');
	let pendingEmail = $state('');
	let pendingProvider = $state('');

	onMount(async () => {
		const params = $page.url.searchParams;
		const pendingStatus = params.get('status');
		const token = params.get('token');
		const error = params.get('error');

		if (error) {
			status = 'error';
			errorMsg = error;
			toast.error(`Erreur OAuth : ${error}`);
			return;
		}

		if (pendingStatus === 'verification_pending') {
			status = 'verification_pending';
			pendingEmail = params.get('email') ?? '';
			toast.success('Email de vérification envoyé');
			return;
		}

		if (pendingStatus === 'merge_pending') {
			status = 'merge_pending';
			pendingEmail = params.get('email') ?? '';
			pendingProvider = params.get('provider') ?? '';
			toast.success('Email de fusion envoyé');
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

			const body = await res.json();
			auth.setUser(body.data.user, token);
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
	{:else if status === 'verification_pending'}
		<div class="info-icon">✉</div>
		<h2>Vérifie ta boîte mail</h2>
		<p>On a envoyé un lien de vérification à <strong>{pendingEmail}</strong>.</p>
		<p class="hint">Clique sur le lien dans l'email pour activer ton compte, puis reviens te connecter.</p>
		<a href="/login" class="btn btn-ghost">Retour au login</a>
	{:else if status === 'merge_pending'}
		<div class="info-icon">⇆</div>
		<h2>Compte existant détecté</h2>
		<p>
			L'email <strong>{pendingEmail}</strong> est déjà associé à un compte.
			On t'a envoyé un mail pour confirmer la fusion avec <strong>{pendingProvider}</strong>.
		</p>
		<p class="hint">Clique sur le lien dans l'email pour lier ce provider à ton compte existant.</p>
		<a href="/login" class="btn btn-ghost">Retour au login</a>
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

	.info-icon {
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

	h2 { color: var(--text-primary); margin: 0; }
	.hint { color: var(--text-muted); font-size: 14px; max-width: 420px; text-align: center; }

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
