<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { platformApi, type ApiError } from '$services/platformApi';
	import { platformAuth } from '$stores/platformAuth';
	import { toast } from '$stores/toast';
	import type { AcceptInvitationResponse } from '$types/platform';

	let token = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let success = $state<AcceptInvitationResponse | null>(null);

	const passwordsMatch = $derived(
		password === confirmPassword || confirmPassword === ''
	);
	const passwordLongEnough = $derived(password.length >= 12 || password === '');

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
		if (password.length < 12) {
			toast.error('Le mot de passe doit faire au moins 12 caractères');
			return;
		}
		loading = true;
		try {
			const res = await platformApi.post<{ success: true; data: AcceptInvitationResponse }>(
				'/invitations/accept',
				{ token, password }
			);
			success = res.data;
			platformAuth.setUser(res.data.platformUser, res.data.accessToken, res.data.refreshToken);
			toast.success('Invitation acceptée — tu es désormais administrateur.');
			setTimeout(() => goto('/platform/dashboard'), 1800);
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			const messages: Record<string, string> = {
				INVALID_TOKEN: 'Invitation introuvable ou invalide.',
				EXPIRED: 'Cette invitation a expiré.',
				ALREADY_USED: 'Cette invitation a déjà été utilisée.',
				INVALID_CREDENTIALS:
					'Mot de passe incorrect. Si tu as déjà un compte SuperOAuth, utilise le mot de passe existant.'
			};
			toast.error(messages[apiErr.code ?? ''] ?? apiErr.message ?? 'Erreur lors de l\'acceptation.');
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Accepter l'invitation — SuperOAuth</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card card">
		<div class="auth-header">
			<h1>Accepter l'invitation</h1>
			<p class="text-secondary">
				Tu as été invité·e comme administrateur d'un tenant SuperOAuth. Choisis ton mot de
				passe pour activer ton compte (ou utilise le tien si tu en as déjà un).
			</p>
		</div>

		{#if success}
			<div class="success-block">
				<p>✅ Bienvenue, {success.platformUser.email}</p>
				<p class="text-secondary">
					Tu es maintenant administrateur du tenant. Redirection vers le dashboard…
				</p>
			</div>
		{:else}
			<form onsubmit={handleSubmit}>
				{#if !token}
					<div class="form-group">
						<label for="token">Token d'invitation</label>
						<input
							id="token"
							type="text"
							bind:value={token}
							placeholder="Colle le token reçu par email"
							required
						/>
					</div>
				{/if}

				<div class="form-group">
					<label for="password">Mot de passe</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						placeholder="••••••••••••"
						minlength="12"
						required
						autocomplete="new-password"
					/>
					<p class="hint text-muted">
						12 caractères minimum. Si tu possèdes déjà un compte SuperOAuth avec cet email,
						saisis le mot de passe existant.
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
					{loading ? 'Acceptation...' : 'Accepter l\'invitation'}
				</button>
			</form>

			<p class="auth-footer text-secondary">
				Tu n'attendais pas cette invitation ? Ignore cette page.
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
		margin-bottom: var(--space-sm);
	}
	.auth-header p {
		font-size: var(--text-sm);
		line-height: 1.5;
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
