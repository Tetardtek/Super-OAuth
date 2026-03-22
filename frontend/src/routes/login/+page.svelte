<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$services/api';
	import { auth } from '$stores/auth';
	import { toast } from '$stores/toast';

	const providers = [
		{ id: 'discord', label: 'Discord', color: '#5865F2' },
		{ id: 'github', label: 'GitHub', color: '#f0f0f0' },
		{ id: 'google', label: 'Google', color: '#db4437' },
		{ id: 'twitch', label: 'Twitch', color: '#9146FF' }
	];

	let email = $state('');
	let password = $state('');
	let loading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		loading = true;
		try {
			const res = await api.post<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', { email, password });
			localStorage.setItem('accessToken', res.accessToken);
			localStorage.setItem('refreshToken', res.refreshToken);
			auth.setUser(res.user, res.accessToken);
			toast.success('Connexion réussie');
			goto('/dashboard');
		} catch (err: any) {
			toast.error(err.message || 'Erreur de connexion');
		} finally {
			loading = false;
		}
	}

	function handleOAuth(provider: string) {
		const redirectUrl = `${window.location.origin}/callback`;
		window.location.href = `/api/v1/oauth/${provider}?redirectUrl=${encodeURIComponent(redirectUrl)}`;
	}
</script>

<svelte:head>
	<title>Connexion — SuperOAuth</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card card">
		<div class="auth-header">
			<h1>Se connecter</h1>
			<p class="text-secondary">Accédez à votre dashboard SuperOAuth</p>
		</div>

		<div class="oauth-providers">
			{#each providers as p}
				<button
					class="btn btn-ghost oauth-btn"
					onclick={() => handleOAuth(p.id)}
					style="--provider-color: {p.color}"
				>
					{p.label}
				</button>
			{/each}
		</div>

		<div class="divider">
			<span class="text-muted">ou</span>
		</div>

		<form onsubmit={handleLogin}>
			<div class="form-group">
				<label for="email">Email</label>
				<input id="email" type="email" bind:value={email} placeholder="vous@exemple.com" required />
			</div>
			<div class="form-group">
				<label for="password">Mot de passe</label>
				<input id="password" type="password" bind:value={password} placeholder="••••••••" required />
			</div>
			<button type="submit" class="btn btn-primary btn-lg submit-btn" disabled={loading}>
				{loading ? 'Connexion...' : 'Se connecter'}
			</button>
		</form>

		<p class="auth-footer text-secondary">
			Pas encore de compte ? <a href="/register">Créer un compte</a>
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

	.oauth-providers {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-sm);
	}

	.oauth-btn {
		justify-content: center;
		transition: all var(--transition-fast);
	}

	.oauth-btn:hover {
		border-color: var(--provider-color);
		color: var(--provider-color);
	}

	.divider {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin: var(--space-lg) 0;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
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
</style>
