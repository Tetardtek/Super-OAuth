<script lang="ts">
	import { goto } from '$app/navigation';
	import { platformApi, type ApiError } from '$services/platformApi';
	import { platformAuth } from '$stores/platformAuth';
	import { toast } from '$stores/toast';
	import type { PlatformAuthResponse } from '$types/platform';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		try {
			const res = await platformApi.post<{ success: true; data: PlatformAuthResponse }>(
				'/auth/login',
				{ email, password }
			);
			platformAuth.setUser(
				res.data.platformUser,
				res.data.accessToken,
				res.data.refreshToken
			);
			toast.success('Connexion réussie');
			goto('/platform/dashboard');
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			const messages: Record<string, string> = {
				INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
				EMAIL_NOT_VERIFIED:
					'Email non vérifié. Vérifie ta boîte (y compris spam) pour le lien de confirmation.',
				REQUIRES_PASSWORD_RESET:
					'Ton compte nécessite un changement de mot de passe avant la première connexion.'
			};
			toast.error(messages[apiErr.code ?? ''] ?? apiErr.message ?? 'Erreur de connexion');
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Se connecter — SuperOAuth Platform</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card card">
		<div class="auth-header">
			<h1>Se connecter</h1>
			<p class="text-secondary">Accède à ton dashboard SuperOAuth.</p>
		</div>

		<form onsubmit={handleLogin}>
			<div class="form-group">
				<label for="email">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="vous@exemple.com"
					required
					autocomplete="email"
				/>
			</div>
			<div class="form-group">
				<label for="password">Mot de passe</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					placeholder="••••••••••••"
					required
					autocomplete="current-password"
				/>
				<p class="hint text-right">
					<a href="/platform/reset-password">Mot de passe oublié ?</a>
				</p>
			</div>

			<button type="submit" class="btn btn-primary btn-lg submit-btn" disabled={loading}>
				{loading ? 'Connexion...' : 'Se connecter'}
			</button>
		</form>

		<p class="auth-footer text-secondary">
			Pas encore de compte ? <a href="/platform/signup">Créer un compte</a>
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
	.text-right {
		text-align: right;
	}
</style>
