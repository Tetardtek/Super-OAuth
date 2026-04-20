<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { platformApi, type ApiError } from '$services/platformApi';
	import { toast } from '$stores/toast';

	let token = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let success = $state(false);

	const passwordsMatch = $derived(
		newPassword === confirmPassword || confirmPassword === ''
	);
	const passwordLongEnough = $derived(newPassword.length >= 12 || newPassword === '');

	onMount(() => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		const urlToken = params.get('token');
		if (urlToken) token = urlToken;
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!passwordsMatch) {
			toast.error('Les mots de passe ne correspondent pas');
			return;
		}
		if (newPassword.length < 12) {
			toast.error('Le mot de passe doit faire au moins 12 caractères');
			return;
		}
		loading = true;
		try {
			await platformApi.post('/auth/password-reset/confirm', {
				token,
				newPassword
			});
			success = true;
			toast.success('Mot de passe modifié');
			setTimeout(() => goto('/platform/login'), 1500);
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			if (apiErr.code === 'WEAK_PASSWORD') {
				toast.error('Mot de passe trop faible (min 12, maj, min, chiffre, spécial)');
			} else if (apiErr.code === 'INVALID_TOKEN') {
				toast.error('Lien invalide ou expiré');
			} else {
				toast.error(apiErr.message || 'Erreur lors de la réinitialisation');
			}
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Réinitialiser mon mot de passe — SuperOAuth</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card card">
		<div class="auth-header">
			<h1>Réinitialiser mon mot de passe</h1>
			<p class="text-secondary">Choisis ton nouveau mot de passe.</p>
		</div>

		{#if success}
			<div class="success-block">
				<p>✅ Ton mot de passe a été mis à jour.</p>
				<p class="text-secondary">Redirection vers la page de connexion…</p>
			</div>
		{:else}
			<form onsubmit={handleSubmit}>
				{#if !token}
					<div class="form-group">
						<label for="token">Token de réinitialisation</label>
						<input
							id="token"
							type="text"
							bind:value={token}
							placeholder="Colle le token reçu par email"
							required
						/>
						<p class="hint text-muted">
							Normalement pré-rempli depuis le lien dans ton email. Si ce n'est pas le cas,
							colle-le manuellement (64 caractères hexadécimaux).
						</p>
					</div>
				{/if}

				<div class="form-group">
					<label for="newPassword">Nouveau mot de passe</label>
					<input
						id="newPassword"
						type="password"
						bind:value={newPassword}
						placeholder="••••••••••••"
						minlength="12"
						required
						autocomplete="new-password"
					/>
					<p class="hint text-muted">
						12 caractères minimum — majuscule, minuscule, chiffre, caractère spécial.
					</p>
				</div>

				<div class="form-group">
					<label for="confirmPassword">Confirmation</label>
					<input
						id="confirmPassword"
						type="password"
						bind:value={confirmPassword}
						placeholder="••••••••••••"
						required
						autocomplete="new-password"
					/>
					{#if !passwordsMatch && confirmPassword !== ''}
						<p class="hint hint-error">Les mots de passe ne correspondent pas.</p>
					{/if}
					{#if !passwordLongEnough}
						<p class="hint hint-error">12 caractères minimum.</p>
					{/if}
				</div>

				<button
					type="submit"
					class="btn btn-primary btn-lg submit-btn"
					disabled={loading || !passwordsMatch || !passwordLongEnough}
				>
					{loading ? 'Mise à jour...' : 'Réinitialiser mon mot de passe'}
				</button>
			</form>

			<p class="auth-footer text-secondary">
				<a href="/platform/login">Retour à la connexion</a>
			</p>
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
	}
	.auth-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}
	.auth-header h1 {
		font-size: var(--text-2xl);
		font-weight: 700;
		margin-bottom: var(--space-xs);
	}
	.form-group {
		margin-bottom: var(--space-md);
	}
	.submit-btn {
		width: 100%;
		justify-content: center;
		margin-top: var(--space-sm);
	}
	.auth-footer {
		text-align: center;
		margin-top: var(--space-lg);
		font-size: var(--text-sm);
	}
	.hint {
		font-size: var(--text-xs);
		margin-top: var(--space-xs);
	}
	.hint-error {
		color: var(--danger, #dc3545);
	}
	.success-block {
		text-align: center;
		padding: var(--space-lg) 0;
	}
	.success-block p:first-child {
		font-size: var(--text-lg);
		margin-bottom: var(--space-sm);
	}
</style>
