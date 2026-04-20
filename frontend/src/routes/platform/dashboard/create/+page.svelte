<script lang="ts">
	import { goto } from '$app/navigation';
	import { platformApi, type ApiError } from '$services/platformApi';
	import { platformAuth } from '$stores/platformAuth';
	import { toast } from '$stores/toast';
	import { onMount } from 'svelte';
	import type { PlatformTenant } from '$types/platform';

	let name = $state('');
	let webhookUrl = $state('');
	let allowedOriginsText = $state('');
	let redirectUrisText = $state('');
	let retentionDays = $state<number>(90);
	let loading = $state(false);
	let created = $state<{ tenant: PlatformTenant; clientSecret: string } | null>(null);
	let secretCopied = $state(false);

	onMount(() => {
		if (!platformAuth.getAccessToken()) {
			goto('/platform/login');
		}
	});

	function parseLines(raw: string): string[] | undefined {
		const lines = raw
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);
		return lines.length ? lines : undefined;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (name.trim().length < 2) {
			toast.error('Le nom doit contenir au moins 2 caractères.');
			return;
		}
		loading = true;
		try {
			const body: Record<string, unknown> = { name: name.trim() };
			if (webhookUrl.trim()) body.webhookUrl = webhookUrl.trim();
			const origins = parseLines(allowedOriginsText);
			if (origins) body.allowedOrigins = origins;
			const redirects = parseLines(redirectUrisText);
			if (redirects) body.redirectUris = redirects;
			if (retentionDays && retentionDays !== 90) body.retentionDays = retentionDays;

			const res = await platformApi.post<{
				success: true;
				data: { tenant: PlatformTenant; clientSecret: string };
			}>('/tenants', body);
			created = res.data;
			toast.success('Tenant créé — copie le client secret maintenant.');
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			const messages: Record<string, string> = {
				NAME_TAKEN: 'Ce nom est déjà utilisé par un autre tenant.',
				EMAIL_NOT_VERIFIED:
					'Ton email doit être vérifié avant de créer un tenant. Vérifie ta boîte mail.',
				USER_NOT_FOUND: 'Utilisateur introuvable — reconnecte-toi.'
			};
			toast.error(messages[apiErr.code ?? ''] ?? apiErr.message ?? 'Erreur lors de la création.');
		} finally {
			loading = false;
		}
	}

	async function copySecret() {
		if (!created) return;
		try {
			await navigator.clipboard.writeText(created.clientSecret);
			secretCopied = true;
			toast.success('Client secret copié dans le presse-papier.');
		} catch {
			toast.error('Copie impossible — sélectionne et copie manuellement.');
		}
	}
</script>

<svelte:head>
	<title>Nouveau tenant — SuperOAuth Platform</title>
</svelte:head>

<div class="create-page">
	<div class="container narrow">
		{#if created}
			<div class="card success-card">
				<div class="success-header">
					<h1>✅ Tenant créé</h1>
					<p class="text-secondary">
						<strong>{created.tenant.name}</strong> est maintenant actif.
					</p>
				</div>

				<div class="warning-block">
					<h3>⚠️ Copie le client secret maintenant</h3>
					<p class="text-secondary">
						Ce secret ne sera <strong>plus jamais affiché</strong>. Stocke-le dans un
						password manager ou un coffre-fort avant de quitter cette page.
					</p>
				</div>

				<div class="form-group">
					<label for="client-id">Client ID</label>
					<input id="client-id" type="text" readonly value={created.tenant.clientId} />
				</div>

				<div class="form-group">
					<label for="client-secret">Client Secret (visible une seule fois)</label>
					<div class="secret-row">
						<input
							id="client-secret"
							type="text"
							readonly
							value={created.clientSecret}
							class="secret-input"
						/>
						<button type="button" class="btn btn-primary" onclick={copySecret}>
							{secretCopied ? '✓ Copié' : 'Copier'}
						</button>
					</div>
				</div>

				<div class="actions">
					<a href="/platform/dashboard/tenant/{created.tenant.clientId}" class="btn btn-primary btn-lg">
						Voir le tenant
					</a>
					<a href="/platform/dashboard" class="btn btn-ghost btn-lg">Retour au dashboard</a>
				</div>
			</div>
		{:else}
			<header class="page-header">
				<h1>Nouveau tenant</h1>
				<p class="text-secondary">
					Un tenant = une configuration OAuth isolée. Tu pourras y brancher jusqu'à
					4 providers (Discord, GitHub, Google, Twitch) et inviter des administrateurs.
				</p>
			</header>

			<form class="card" onsubmit={handleSubmit}>
				<div class="form-group">
					<label for="name">Nom du tenant *</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						placeholder="mon-app"
						minlength="2"
						maxlength="100"
						required
					/>
					<p class="hint text-muted">
						2 à 100 caractères. Globalement unique — si le nom est pris, essaye une variante.
					</p>
				</div>

				<div class="form-group">
					<label for="webhook">Webhook URL (optionnel)</label>
					<input
						id="webhook"
						type="url"
						bind:value={webhookUrl}
						placeholder="https://mon-app.com/webhooks/superoauth"
					/>
					<p class="hint text-muted">
						URL que SuperOAuth appellera pour notifier les events (login, merge, etc.).
					</p>
				</div>

				<div class="form-group">
					<label for="origins">Allowed Origins (optionnel, une URL par ligne)</label>
					<textarea
						id="origins"
						bind:value={allowedOriginsText}
						rows="3"
						placeholder="https://mon-app.com&#10;http://localhost:5173"
					></textarea>
					<p class="hint text-muted">
						Origines CORS autorisées à appeler l'API SuperOAuth pour ce tenant.
					</p>
				</div>

				<div class="form-group">
					<label for="redirects">Redirect URIs (optionnel, une URL par ligne)</label>
					<textarea
						id="redirects"
						bind:value={redirectUrisText}
						rows="3"
						placeholder="https://mon-app.com/callback&#10;http://localhost:5173/callback"
					></textarea>
					<p class="hint text-muted">
						URLs de redirection OAuth autorisées. Modifiable à tout moment depuis les
						settings du tenant.
					</p>
				</div>

				<div class="form-group">
					<label for="retention">Rétention des logs (jours)</label>
					<input
						id="retention"
						type="number"
						bind:value={retentionDays}
						min="1"
						max="3650"
					/>
					<p class="hint text-muted">
						Durée de conservation des audit logs. Défaut : 90 jours.
					</p>
				</div>

				<div class="form-footer">
					<a href="/platform/dashboard" class="btn btn-ghost">Annuler</a>
					<button type="submit" class="btn btn-primary btn-lg" disabled={loading}>
						{loading ? 'Création...' : 'Créer le tenant'}
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>

<style>
	.create-page {
		padding: var(--space-xl) 0;
	}
	.narrow {
		max-width: 720px;
	}
	.page-header {
		margin-bottom: var(--space-xl);
	}
	.page-header h1 {
		font-size: var(--text-3xl);
		font-weight: 700;
		margin-bottom: var(--space-sm);
	}
	.card {
		padding: var(--space-xl);
	}
	.form-group {
		margin-bottom: var(--space-md);
	}
	.form-group textarea {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-sm);
		resize: vertical;
	}
	.hint {
		font-size: var(--text-xs);
		margin-top: var(--space-xs);
	}
	.form-footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		margin-top: var(--space-lg);
	}
	.success-card {
		text-align: left;
	}
	.success-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}
	.success-header h1 {
		font-size: var(--text-2xl);
		margin-bottom: var(--space-xs);
	}
	.warning-block {
		padding: var(--space-md);
		border: 1px solid var(--accent);
		background: rgba(200, 164, 78, 0.08);
		border-radius: 8px;
		margin-bottom: var(--space-lg);
	}
	.warning-block h3 {
		font-size: var(--text-md);
		margin-bottom: var(--space-xs);
	}
	.secret-row {
		display: flex;
		gap: var(--space-sm);
	}
	.secret-input {
		flex: 1;
		font-family: var(--font-mono, monospace);
		font-size: var(--text-sm);
	}
	.actions {
		display: flex;
		justify-content: space-between;
		gap: var(--space-sm);
		margin-top: var(--space-xl);
	}
	.actions :global(.btn) {
		flex: 1;
		justify-content: center;
	}
</style>
