<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { platformApi, type ApiError } from '$services/platformApi';
	import { platformAuth } from '$stores/platformAuth';
	import { toast } from '$stores/toast';
	import type { AcceptOwnershipResponse } from '$types/platform';

	let token = $state('');
	let password = $state('');
	let loadingAccept = $state(false);
	let loadingDecline = $state(false);
	let declined = $state(false);
	let accepted = $state<AcceptOwnershipResponse | null>(null);

	const canSubmit = $derived(token.length > 0 && password.length > 0);

	onMount(() => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		const urlToken = params.get('token');
		if (urlToken) token = urlToken;
	});

	function surfaceError(err: unknown) {
		const apiErr = err as ApiError;
		const messages: Record<string, string> = {
			INVALID_TOKEN: 'Transfert introuvable ou invalide.',
			EXPIRED: 'Ce transfert a expiré.',
			ALREADY_COMPLETED: 'Ce transfert a déjà été finalisé.',
			ALREADY_DECLINED: 'Tu as déjà décliné ce transfert.',
			ALREADY_CANCELLED: 'Le propriétaire a annulé ce transfert.',
			INVALID_CREDENTIALS: 'Mot de passe incorrect.'
		};
		toast.error(messages[apiErr.code ?? ''] ?? apiErr.message ?? 'Erreur sur le transfert.');
	}

	async function handleAccept(e: Event) {
		e.preventDefault();
		loadingAccept = true;
		try {
			const res = await platformApi.post<{ success: true; data: AcceptOwnershipResponse }>(
				'/transfers/accept',
				{ token, password }
			);
			accepted = res.data;
			platformAuth.setUser(res.data.platformUser, res.data.accessToken, res.data.refreshToken);
			toast.success('Tu es désormais propriétaire du tenant.');
			setTimeout(() => goto('/platform/dashboard'), 1800);
		} catch (err) {
			surfaceError(err);
		} finally {
			loadingAccept = false;
		}
	}

	async function handleDecline() {
		if (!confirm('Décliner ce transfert ? Cette action est irréversible — le propriétaire pourra relancer un nouveau transfert plus tard.')) {
			return;
		}
		loadingDecline = true;
		try {
			await platformApi.post('/transfers/decline', { token });
			declined = true;
			toast.success('Transfert décliné.');
		} catch (err) {
			surfaceError(err);
		} finally {
			loadingDecline = false;
		}
	}
</script>

<svelte:head>
	<title>Transfert de propriété — SuperOAuth</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card card">
		<div class="auth-header">
			<h1>Transfert de propriété</h1>
			<p class="text-secondary">
				Le propriétaire actuel te propose de récupérer le contrôle complet d'un tenant.
				En acceptant, tu récupères billing, invitations admins et suppression — l'ancien
				propriétaire bascule en rôle administrateur.
			</p>
		</div>

		{#if accepted}
			<div class="success-block">
				<p>✅ Propriété transférée.</p>
				<p class="text-secondary">Tu es maintenant propriétaire. Redirection vers le dashboard…</p>
			</div>
		{:else if declined}
			<div class="success-block">
				<p>↩️ Transfert décliné.</p>
				<p class="text-secondary">
					Tu peux fermer cette page. L'ancien propriétaire est notifié.
				</p>
			</div>
		{:else}
			<form onsubmit={handleAccept}>
				{#if !token}
					<div class="form-group">
						<label for="token">Token de transfert</label>
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
					<label for="password">Ton mot de passe actuel</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						placeholder="••••••••••••"
						required
						autocomplete="current-password"
					/>
					<p class="hint text-muted">
						Le mot de passe de ton compte SuperOAuth (pas un nouveau — le transfert réutilise
						ton compte existant d'administrateur).
					</p>
				</div>

				<button
					type="submit"
					class="btn btn-primary btn-lg submit-btn"
					disabled={!canSubmit || loadingAccept || loadingDecline}
				>
					{loadingAccept ? 'Acceptation...' : 'Accepter le transfert'}
				</button>

				<button
					type="button"
					class="btn btn-secondary btn-lg decline-btn"
					onclick={handleDecline}
					disabled={!token || loadingAccept || loadingDecline}
				>
					{loadingDecline ? 'Refus...' : 'Décliner'}
				</button>
			</form>

			<p class="auth-footer text-secondary">
				Tu n'attendais pas ce transfert ? Décline et change ton mot de passe par sécurité.
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
	.submit-btn,
	.decline-btn {
		width: 100%;
		justify-content: center;
	}
	.submit-btn {
		margin-top: var(--space-sm);
	}
	.decline-btn {
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
	.success-block {
		text-align: center;
		padding: var(--space-lg) 0;
	}
	.success-block p:first-child {
		font-size: var(--text-lg);
		margin-bottom: var(--space-sm);
	}
</style>
