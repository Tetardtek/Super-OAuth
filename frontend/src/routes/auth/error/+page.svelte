<script lang="ts">
	import { page } from '$app/stores';

	const error = $derived($page.url.searchParams.get('error') ?? 'Erreur inconnue');
	const provider = $derived($page.url.searchParams.get('provider'));

	const errorMessages: Record<string, string> = {
		EMAIL_UNVERIFIED_EXISTS: "Un compte existe déjà avec cet email mais n'est pas vérifié. Connecte-toi d'abord avec ton provider d'origine pour vérifier ton email.",
		internal_error: "Erreur interne lors de l'authentification. Réessaie ou utilise un autre provider.",
		link_state_invalid: "La session de liaison a expiré. Retourne dans les paramètres pour réessayer.",
	};

	const displayMessage = $derived(errorMessages[error] ?? error);
</script>

<svelte:head>
	<title>Erreur — SuperOAuth</title>
</svelte:head>

<div class="error-page">
	<div class="error-icon">⚠️</div>
	<h2>Erreur d'authentification</h2>
	<p class="error-detail">{displayMessage}</p>
	{#if provider}
		<p class="provider-info">Provider : <span class="provider-name">{provider}</span></p>
	{/if}
	<div class="actions">
		<a href="/login" class="btn btn-primary">Retour au login</a>
	</div>
</div>

<style>
	.error-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - var(--header-height));
		gap: var(--space-md);
		text-align: center;
		max-width: 480px;
		margin: 0 auto;
		padding: var(--space-lg);
	}

	.error-icon { font-size: 3rem; }

	h2 {
		color: var(--text-primary);
		font-size: 1.25rem;
	}

	.error-detail {
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.provider-info {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.provider-name {
		color: var(--accent);
		text-transform: capitalize;
	}

	.actions { margin-top: var(--space-md); }
</style>
