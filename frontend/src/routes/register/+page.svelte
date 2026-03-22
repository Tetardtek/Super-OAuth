<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$services/api';
	import { auth } from '$stores/auth';
	import { toast } from '$stores/toast';

	let email = $state('');
	let nickname = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);

	let passwordMatch = $derived(password === confirmPassword || confirmPassword === '');

	async function handleRegister(e: Event) {
		e.preventDefault();
		if (password !== confirmPassword) {
			toast.error('Les mots de passe ne correspondent pas');
			return;
		}
		loading = true;
		try {
			const res = await api.post<{ accessToken: string; refreshToken: string; user: any }>('/auth/register', {
				email,
				password,
				nickname
			});
			localStorage.setItem('accessToken', res.accessToken);
			localStorage.setItem('refreshToken', res.refreshToken);
			auth.setUser(res.user, res.accessToken);
			toast.success('Compte créé avec succès');
			goto('/dashboard');
		} catch (err: any) {
			toast.error(err.message || "Erreur lors de l'inscription");
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Créer un compte — SuperOAuth</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card card">
		<div class="auth-header">
			<h1>Créer un compte</h1>
			<p class="text-secondary">Commencez à utiliser SuperOAuth</p>
		</div>

		<form onsubmit={handleRegister}>
			<div class="form-group">
				<label for="email">Email</label>
				<input id="email" type="email" bind:value={email} placeholder="vous@exemple.com" required />
			</div>
			<div class="form-group">
				<label for="nickname">Pseudo</label>
				<input id="nickname" type="text" bind:value={nickname} placeholder="votre-pseudo" required />
			</div>
			<div class="form-group">
				<label for="password">Mot de passe</label>
				<input id="password" type="password" bind:value={password} placeholder="Min. 8 caractères" required minlength="8" />
			</div>
			<div class="form-group">
				<label for="confirm">Confirmer le mot de passe</label>
				<input
					id="confirm"
					type="password"
					bind:value={confirmPassword}
					placeholder="Confirmer"
					required
					class:error={!passwordMatch}
				/>
				{#if !passwordMatch}
					<span class="field-error">Les mots de passe ne correspondent pas</span>
				{/if}
			</div>
			<button type="submit" class="btn btn-primary btn-lg submit-btn" disabled={loading || !passwordMatch}>
				{loading ? 'Création...' : 'Créer mon compte'}
			</button>
		</form>

		<p class="auth-footer text-secondary">
			Déjà un compte ? <a href="/login">Se connecter</a>
		</p>
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
		max-width: 420px;
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

	.form-group { margin-bottom: var(--space-md); }

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

	input.error {
		border-color: var(--danger);
	}

	.field-error {
		font-size: var(--text-xs);
		color: var(--danger);
		margin-top: var(--space-xs);
		display: block;
	}
</style>
