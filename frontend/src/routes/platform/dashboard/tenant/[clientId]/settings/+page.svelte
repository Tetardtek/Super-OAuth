<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { platformApi, type ApiError } from '$services/platformApi';
	import { tenantCtx } from '$stores/tenantCtx';
	import { toast } from '$stores/toast';

	const clientId = $derived(($page.params as Record<string, string>).clientId);
	const isOwner = $derived($tenantCtx.currentRole === 'owner');

	let webhookUrl = $state('');
	let allowedOriginsText = $state('');
	let redirectUrisText = $state('');
	let retentionDays = $state<number>(90);
	let saveLoading = $state(false);
	let deleteLoading = $state(false);

	$effect(() => {
		const t = $tenantCtx.tenant;
		if (t) {
			webhookUrl = t.webhookUrl ?? '';
			allowedOriginsText = (t.allowedOrigins ?? []).join('\n');
			redirectUrisText = (t.redirectUris ?? []).join('\n');
			retentionDays = t.retentionDays;
		}
	});

	function parseLines(raw: string): string[] | null {
		const lines = raw
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);
		return lines.length ? lines : null;
	}

	async function handleSave(e: Event) {
		e.preventDefault();
		saveLoading = true;
		try {
			const patch = {
				webhookUrl: webhookUrl.trim() || null,
				allowedOrigins: parseLines(allowedOriginsText),
				redirectUris: parseLines(redirectUrisText),
				retentionDays
			};
			await platformApi.patch(`/tenants/${clientId}`, patch);
			toast.success('Paramètres mis à jour.');
			// Refresh tenant context
			const res = await platformApi.get<{
				success: true;
				data: { tenants: Array<typeof $tenantCtx.tenant> };
			}>('/tenants');
			const updated = res.data.tenants.find((t) => t && t.clientId === clientId);
			if (updated) {
				tenantCtx.update((s) => ({ ...s, tenant: updated }));
			}
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			toast.error(apiErr.message || 'Erreur lors de la mise à jour.');
		} finally {
			saveLoading = false;
		}
	}

	async function handleDelete() {
		const name = $tenantCtx.tenant?.name ?? 'ce tenant';
		const confirmed = prompt(
			`Pour confirmer la suppression de "${name}", tape son nom exactement :`
		);
		if (confirmed !== name) {
			if (confirmed !== null) toast.error('Nom incorrect — suppression annulée.');
			return;
		}
		deleteLoading = true;
		try {
			await platformApi.delete(`/tenants/${clientId}`);
			toast.success(`Tenant "${name}" supprimé.`);
			goto('/platform/dashboard');
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			toast.error(apiErr.message || 'Erreur lors de la suppression.');
		} finally {
			deleteLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Settings — SuperOAuth Platform</title>
</svelte:head>

<div class="settings-page">
	{#if !isOwner}
		<p class="hint text-muted">
			Seul l'owner peut modifier les paramètres du tenant.
		</p>
	{/if}

	<section class="card">
		<h2>Paramètres</h2>
		<form onsubmit={handleSave}>
			<div class="form-group">
				<label for="webhook">Webhook URL</label>
				<input
					id="webhook"
					type="url"
					bind:value={webhookUrl}
					placeholder="https://mon-app.com/webhooks/superoauth"
					disabled={!isOwner}
				/>
				<p class="hint text-muted">
					URL appelée par SuperOAuth pour les events (login, merge). Vide = désactivé.
				</p>
			</div>

			<div class="form-group">
				<label for="origins">Allowed Origins (une URL par ligne)</label>
				<textarea
					id="origins"
					bind:value={allowedOriginsText}
					rows="3"
					placeholder="https://mon-app.com"
					disabled={!isOwner}
				></textarea>
			</div>

			<div class="form-group">
				<label for="redirects">Redirect URIs (une URL par ligne)</label>
				<textarea
					id="redirects"
					bind:value={redirectUrisText}
					rows="3"
					placeholder="https://mon-app.com/callback"
					disabled={!isOwner}
				></textarea>
			</div>

			<div class="form-group">
				<label for="retention">Rétention logs (jours)</label>
				<input
					id="retention"
					type="number"
					bind:value={retentionDays}
					min="1"
					max="3650"
					disabled={!isOwner}
				/>
			</div>

			{#if isOwner}
				<div class="form-footer">
					<button type="submit" class="btn btn-primary" disabled={saveLoading}>
						{saveLoading ? 'Enregistrement...' : 'Enregistrer'}
					</button>
				</div>
			{/if}
		</form>
	</section>

	{#if isOwner}
		<section class="card danger-zone">
			<h2>⚠️ Zone danger</h2>
			<p class="text-secondary">
				La suppression désactive le tenant (soft delete). Les utilisateurs finaux ne
				pourront plus se connecter via ce tenant. Les données restent en DB (retention
				logs honorée) — contacte le support pour suppression définitive.
			</p>
			<button class="btn btn-danger" onclick={handleDelete} disabled={deleteLoading}>
				{deleteLoading ? 'Suppression...' : 'Supprimer ce tenant'}
			</button>
		</section>
	{/if}
</div>

<style>
	.settings-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}
	.card {
		padding: var(--space-lg);
	}
	.card h2 {
		font-size: var(--text-lg);
		font-weight: 700;
		margin-bottom: var(--space-md);
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
		margin-top: var(--space-md);
	}
	.danger-zone {
		border-left: 3px solid var(--danger, #dc3545);
	}
	.danger-zone h2 {
		color: var(--danger, #dc3545);
	}
	.danger-zone p {
		margin-bottom: var(--space-md);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.btn-danger {
		background: var(--danger, #dc3545);
		color: white;
	}
	.btn-danger:hover:not(:disabled) {
		filter: brightness(1.1);
	}
</style>
