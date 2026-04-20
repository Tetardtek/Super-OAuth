<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { platformApi, type ApiError } from '$services/platformApi';

	type State =
		| { status: 'loading' }
		| { status: 'success'; email: string }
		| { status: 'error'; message: string };

	let state = $state<State>({ status: 'loading' });

	onMount(async () => {
		const token = $page.params.token;
		if (!token) {
			state = { status: 'error', message: 'Token manquant dans l\'URL.' };
			return;
		}
		try {
			const res = await platformApi.get<{
				success: true;
				message: string;
				data: { email: string };
			}>(`/auth/verify-email/${encodeURIComponent(token)}`);
			state = { status: 'success', email: res.data.email };
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			state = {
				status: 'error',
				message:
					apiErr.code === 'INVALID_TOKEN'
						? 'Lien invalide, expiré, ou déjà utilisé.'
						: apiErr.message ?? 'Erreur lors de la vérification.'
			};
		}
	});
</script>

<svelte:head>
	<title>Vérification d'email — SuperOAuth Platform</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card card">
		{#if state.status === 'loading'}
			<div class="auth-header">
				<h1>⏳ Vérification en cours…</h1>
				<p class="text-secondary">Un instant.</p>
			</div>
		{:else if state.status === 'success'}
			<div class="auth-header">
				<h1>✅ Email vérifié</h1>
				<p class="text-secondary">
					<strong>{state.email}</strong> est maintenant actif. Tu peux te connecter et
					commencer à créer tes tenants.
				</p>
			</div>
			<a href="/platform/login" class="btn btn-primary btn-lg cta">Se connecter</a>
		{:else}
			<div class="auth-header">
				<h1>❌ Vérification échouée</h1>
				<p class="text-secondary">{state.message}</p>
			</div>
			<div class="actions">
				<a href="/platform/signup" class="btn btn-primary btn-lg">Recréer un compte</a>
				<a href="/platform/login" class="btn btn-ghost btn-lg">Aller à la connexion</a>
			</div>
		{/if}
	</div>
</div>

<style>
	.auth-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - var(--header-height));
		padding: var(--space-xl);
	}
	.auth-card {
		width: 100%;
		max-width: 460px;
		padding: var(--space-xl);
		text-align: center;
	}
	.auth-header h1 {
		font-size: var(--text-2xl);
		font-weight: 700;
		margin-bottom: var(--space-sm);
	}
	.cta {
		width: 100%;
		justify-content: center;
	}
	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}
	.actions :global(.btn) {
		width: 100%;
		justify-content: center;
	}
</style>
