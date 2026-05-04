<script lang="ts">
	import { platformApi, type ApiError } from '$services/platformApi';
	import { toast } from '$stores/toast';

	let email = $state('');
	let loading = $state(false);
	let submitted = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		try {
			await platformApi.post('/auth/password-reset/request', { email });
			submitted = true;
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			toast.error(apiErr.message || "Erreur lors de l'envoi du lien");
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Mot de passe oublié — SuperOAuth</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card card">
		<div class="auth-header">
			<h1>Mot de passe oublié</h1>
			<p class="text-secondary">
				Indique l'email associé à ton compte — on t'envoie un lien pour réinitialiser ton mot de passe.
			</p>
		</div>

		{#if submitted}
			<div class="success-block">
				<div class="info-icon">✉</div>
				<p>Si un compte existe avec <strong>{email}</strong>, un lien de réinitialisation vient d'être envoyé.</p>
				<p class="text-secondary hint">Vérifie ta boîte mail (et le dossier spam au besoin).</p>
				<p class="auth-footer text-secondary">
					<a href="/platform/login">Retour à la connexion</a>
				</p>
			</div>
		{:else}
			<form onsubmit={handleSubmit}>
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

				<button
					type="submit"
					class="btn btn-primary btn-lg submit-btn"
					disabled={loading || !email}
				>
					{loading ? 'Envoi...' : 'Envoyer le lien'}
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
	.success-block {
		text-align: center;
	}
	.success-block p:first-of-type {
		font-size: var(--text-base);
		margin: var(--space-md) 0;
	}
	.hint {
		font-size: var(--text-sm);
		margin-top: var(--space-xs);
	}
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
		margin: 0 auto var(--space-md);
	}
</style>
