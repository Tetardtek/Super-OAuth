<script lang="ts">
	import { platformApi, type ApiError } from '$services/platformApi';
	import { toast } from '$stores/toast';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let submitted = $state(false);
	let submittedEmail = $state('');

	const passwordsMatch = $derived(
		password === confirmPassword || confirmPassword === ''
	);
	const passwordLongEnough = $derived(password.length >= 12 || password === '');

	async function handleSignup(e: Event) {
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
			await platformApi.post('/auth/signup', { email, password });
			submittedEmail = email;
			submitted = true;
			toast.success('Un email de vérification vient d\'être envoyé.');
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			if (apiErr.code === 'INVALID_INPUT') {
				toast.error(apiErr.message || 'Email ou mot de passe invalide.');
			} else {
				toast.error(apiErr.message || 'Erreur lors de l\'inscription.');
			}
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Créer un compte — SuperOAuth Platform</title>
</svelte:head>

<div class="auth-page">
	<div class="auth-card card">
		{#if submitted}
			<div class="auth-header">
				<h1>📬 Vérifie ta boîte mail</h1>
			</div>
			<div class="confirmation">
				<p>
					Un email de confirmation vient d'être envoyé à <strong>{submittedEmail}</strong>.
				</p>
				<p class="text-secondary">
					Clique sur le lien dans l'email pour activer ton compte. Il expire dans 24h.
				</p>
				<p class="text-muted hint-spam">
					Pas reçu ? Vérifie les dossiers spam ou promotions.
				</p>
				<a href="/platform/login" class="btn btn-ghost btn-lg back-btn">
					Retour à la connexion
				</a>
			</div>
		{:else}
			<div class="auth-header">
				<h1>Créer un compte</h1>
				<p class="text-secondary">
					Accède à SuperOAuth pour gérer tes propres tenants et utilisateurs.
				</p>
			</div>

			<form onsubmit={handleSignup}>
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
					{loading ? 'Création...' : 'Créer mon compte'}
				</button>
			</form>

			<p class="auth-footer text-secondary">
				Déjà un compte ? <a href="/platform/login">Se connecter</a>
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
	.hint-spam {
		margin-top: var(--space-md);
		font-size: var(--text-xs);
	}
	.confirmation {
		text-align: center;
	}
	.confirmation p {
		margin-bottom: var(--space-sm);
	}
	.back-btn {
		margin-top: var(--space-lg);
		display: inline-block;
	}
</style>
