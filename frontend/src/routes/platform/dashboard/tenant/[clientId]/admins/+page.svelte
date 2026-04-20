<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { platformApi, type ApiError } from '$services/platformApi';
	import { tenantCtx } from '$stores/tenantCtx';
	import { platformAuth } from '$stores/platformAuth';
	import { toast } from '$stores/toast';
	import type { TenantAdmin, TenantInvitation } from '$types/platform';

	const clientId = $derived(($page.params as Record<string, string>).clientId);
	const isOwner = $derived($tenantCtx.currentRole === 'owner');
	const currentUserId = $derived($platformAuth.user?.id);

	let invitations = $state<TenantInvitation[]>([]);
	let loadingInvitations = $state(false);

	// Invite modal
	let inviteOpen = $state(false);
	let inviteEmail = $state('');
	let inviteLoading = $state(false);

	// Transfer modal
	let transferOpen = $state(false);
	let transferTargetId = $state('');
	let transferPassword = $state('');
	let transferLoading = $state(false);

	async function loadInvitations() {
		if (!isOwner) return;
		loadingInvitations = true;
		try {
			const res = await platformApi.get<{
				success: true;
				data: { invitations: TenantInvitation[] };
			}>(`/tenants/${clientId}/invitations`);
			invitations = res.data.invitations;
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			toast.error(apiErr.message || 'Impossible de charger les invitations.');
		} finally {
			loadingInvitations = false;
		}
	}

	async function refreshAdmins() {
		try {
			const res = await platformApi.get<{ success: true; data: { admins: TenantAdmin[] } }>(
				`/tenants/${clientId}/admins`
			);
			tenantCtx.update((s) => ({
				...s,
				admins: res.data.admins,
				currentRole:
					res.data.admins.find((a) => a.platformUserId === currentUserId)?.role ??
					s.currentRole
			}));
		} catch {
			// silent — UI keeps last known state
		}
	}

	onMount(loadInvitations);

	$effect(() => {
		if (isOwner) loadInvitations();
	});

	async function handleRevoke(targetId: string) {
		if (!confirm('Révoquer cet admin ? Il perdra accès au tenant immédiatement.')) return;
		try {
			await platformApi.delete(`/tenants/${clientId}/admins/${targetId}`);
			toast.success('Admin révoqué.');
			await refreshAdmins();
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			const messages: Record<string, string> = {
				CANNOT_REVOKE_OWNER:
					'Impossible de révoquer l\'owner — utilise le transfert de propriété pour changer d\'owner.',
				NOT_FOUND: 'Admin introuvable.'
			};
			toast.error(messages[apiErr.code ?? ''] ?? apiErr.message ?? 'Erreur de révocation.');
		}
	}

	async function handleCancelInvitation(invId: string) {
		if (!confirm('Annuler cette invitation ? Le lien envoyé par email sera invalidé.')) return;
		try {
			await platformApi.delete(`/tenants/${clientId}/invitations/${invId}`);
			toast.success('Invitation annulée.');
			await loadInvitations();
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			toast.error(apiErr.message || 'Erreur lors de l\'annulation.');
		}
	}

	async function handleInviteSubmit(e: Event) {
		e.preventDefault();
		if (!inviteEmail.trim()) return;
		inviteLoading = true;
		try {
			const res = await platformApi.post<{
				success: true;
				data: { status: 'invited' | 'resent'; expiresAt: string };
			}>(`/tenants/${clientId}/invitations`, { email: inviteEmail.trim() });
			if (res.data.status === 'resent') {
				toast.success('Invitation renvoyée (nouveau lien, ancien invalidé).');
			} else {
				toast.success('Invitation envoyée.');
			}
			inviteOpen = false;
			inviteEmail = '';
			await loadInvitations();
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			const messages: Record<string, string> = {
				ALREADY_MEMBER: 'Cette adresse est déjà membre du tenant.',
				TENANT_NOT_FOUND: 'Tenant introuvable.'
			};
			toast.error(messages[apiErr.code ?? ''] ?? apiErr.message ?? 'Erreur d\'invitation.');
		} finally {
			inviteLoading = false;
		}
	}

	async function handleTransferSubmit(e: Event) {
		e.preventDefault();
		if (!transferTargetId || !transferPassword) return;
		if (
			!confirm(
				'Confirmer le transfert ? Un email sera envoyé à l\'admin cible. Il devra accepter avec son mot de passe pour que tu bascules en rôle administrateur.'
			)
		) {
			return;
		}
		transferLoading = true;
		try {
			await platformApi.post(`/tenants/${clientId}/transfer`, {
				targetPlatformUserId: transferTargetId,
				currentPassword: transferPassword
			});
			toast.success('Transfert initié — email envoyé à l\'admin cible.');
			transferOpen = false;
			transferTargetId = '';
			transferPassword = '';
		} catch (err: unknown) {
			const apiErr = err as ApiError;
			const messages: Record<string, string> = {
				INVALID_CREDENTIALS: 'Mot de passe incorrect.',
				TARGET_NOT_ADMIN: 'Cette personne n\'est pas administrateur du tenant.',
				PENDING_TRANSFER_EXISTS:
					'Un transfert est déjà en cours pour ce tenant. Annule-le d\'abord.',
				TENANT_NOT_FOUND: 'Tenant introuvable.'
			};
			toast.error(messages[apiErr.code ?? ''] ?? apiErr.message ?? 'Erreur de transfert.');
		} finally {
			transferLoading = false;
		}
	}

	function formatDate(iso: string): string {
		try {
			return new Date(iso).toLocaleDateString('fr-FR', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return iso;
		}
	}

	const nonOwnerAdmins = $derived(
		$tenantCtx.admins.filter((a) => a.role === 'admin')
	);
</script>

<svelte:head>
	<title>Admins — SuperOAuth Platform</title>
</svelte:head>

<div class="admins-page">
	<section class="card panel">
		<header class="panel-header">
			<div>
				<h2>Équipe du tenant</h2>
				<p class="text-secondary">
					{$tenantCtx.admins.length} membre{$tenantCtx.admins.length > 1 ? 's' : ''}
					({$tenantCtx.admins.filter((a) => a.role === 'admin').length} admin{$tenantCtx.admins.filter((a) => a.role === 'admin').length !== 1 ? 's' : ''})
				</p>
			</div>
			{#if isOwner}
				<div class="panel-actions">
					<button class="btn btn-ghost" onclick={() => (transferOpen = true)} disabled={nonOwnerAdmins.length === 0} title={nonOwnerAdmins.length === 0 ? 'Aucun admin — invite d\'abord quelqu\'un' : 'Transférer la propriété'}>
						Transférer la propriété
					</button>
					<button class="btn btn-primary" onclick={() => (inviteOpen = true)}>
						+ Inviter un admin
					</button>
				</div>
			{/if}
		</header>

		{#if $tenantCtx.admins.length === 0}
			<p class="text-muted">Aucun membre (état improbable — contacte le support).</p>
		{:else}
			<table class="admin-table">
				<thead>
					<tr>
						<th>Rôle</th>
						<th>Email</th>
						<th>Rejoint le</th>
						<th class="action-col"></th>
					</tr>
				</thead>
				<tbody>
					{#each $tenantCtx.admins as admin (admin.platformUserId)}
						<tr>
							<td>
								<span class="role-tag" data-role={admin.role}>
									{admin.role === 'owner' ? 'Owner' : 'Admin'}
								</span>
							</td>
							<td>
								<span class="email-cell" title={admin.platformUserId}>
									{admin.email}
									{#if admin.platformUserId === currentUserId}
										<span class="you-tag">(toi)</span>
									{/if}
								</span>
							</td>
							<td class="text-secondary">{formatDate(admin.joinedAt)}</td>
							<td class="action-col">
								{#if isOwner && admin.role === 'admin'}
									<button
										class="btn btn-ghost btn-sm"
										onclick={() => handleRevoke(admin.platformUserId)}
									>
										Révoquer
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	{#if isOwner}
		<section class="card panel">
			<header class="panel-header">
				<div>
					<h2>Invitations en attente</h2>
					<p class="text-secondary">
						{invitations.length} invitation{invitations.length > 1 ? 's' : ''} non-consommée{invitations.length > 1 ? 's' : ''}
					</p>
				</div>
			</header>
			{#if loadingInvitations}
				<p class="text-muted">⏳ Chargement…</p>
			{:else if invitations.length === 0}
				<p class="text-muted">Aucune invitation en attente.</p>
			{:else}
				<table class="admin-table">
					<thead>
						<tr>
							<th>Email</th>
							<th>Rôle</th>
							<th>Expire le</th>
							<th class="action-col"></th>
						</tr>
					</thead>
					<tbody>
						{#each invitations as inv (inv.id)}
							<tr>
								<td>{inv.email}</td>
								<td><span class="role-tag" data-role="admin">Admin</span></td>
								<td class="text-secondary">{formatDate(inv.expiresAt)}</td>
								<td class="action-col">
									<button
										class="btn btn-ghost btn-sm"
										onclick={() => handleCancelInvitation(inv.id)}
									>
										Annuler
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</section>
	{:else}
		<p class="hint text-muted">
			Seul l'owner peut inviter, révoquer ou transférer la propriété.
		</p>
	{/if}
</div>

<!-- Invite modal -->
{#if inviteOpen}
	<div class="modal-backdrop" role="presentation" onclick={() => (inviteOpen = false)}>
		<div
			class="modal card"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && (inviteOpen = transferOpen = false)}
		>
			<header class="modal-header">
				<h3>Inviter un administrateur</h3>
				<button class="modal-close" onclick={() => (inviteOpen = false)} aria-label="Fermer">×</button>
			</header>
			<form onsubmit={handleInviteSubmit}>
				<div class="form-group">
					<label for="invite-email">Email de l'admin</label>
					<input
						id="invite-email"
						type="email"
						bind:value={inviteEmail}
						placeholder="admin@exemple.com"
						required
					/>
					<p class="hint text-muted">
						L'invité recevra un email avec un lien d'activation (valide 7 jours). Un 2e envoi
						à la même adresse annule automatiquement le précédent et renvoie un nouveau lien.
					</p>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-ghost" onclick={() => (inviteOpen = false)}>
						Annuler
					</button>
					<button type="submit" class="btn btn-primary" disabled={inviteLoading}>
						{inviteLoading ? 'Envoi...' : 'Envoyer l\'invitation'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Transfer modal -->
{#if transferOpen}
	<div class="modal-backdrop" role="presentation" onclick={() => (transferOpen = false)}>
		<div
			class="modal card"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && (inviteOpen = transferOpen = false)}
		>
			<header class="modal-header">
				<h3>Transférer la propriété</h3>
				<button
					class="modal-close"
					onclick={() => (transferOpen = false)}
					aria-label="Fermer"
				>×</button>
			</header>
			<form onsubmit={handleTransferSubmit}>
				<p class="text-secondary warning-note">
					⚠️ Tu basculeras en rôle administrateur. Le transfert prendra effet uniquement quand
					l'admin cible acceptera avec son propre mot de passe.
				</p>

				<div class="form-group">
					<label for="transfer-target">Admin cible</label>
					<select id="transfer-target" bind:value={transferTargetId} required>
						<option value="" disabled>Sélectionne un admin…</option>
						{#each nonOwnerAdmins as admin}
							<option value={admin.platformUserId}>
								{admin.email} — rejoint {formatDate(admin.joinedAt)}
							</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="transfer-password">Ton mot de passe actuel</label>
					<input
						id="transfer-password"
						type="password"
						bind:value={transferPassword}
						placeholder="••••••••••••"
						required
						autocomplete="current-password"
					/>
					<p class="hint text-muted">
						Re-authentification requise pour toute action sensible.
					</p>
				</div>

				<div class="modal-footer">
					<button type="button" class="btn btn-ghost" onclick={() => (transferOpen = false)}>
						Annuler
					</button>
					<button type="submit" class="btn btn-primary" disabled={transferLoading || !transferTargetId}>
						{transferLoading ? 'Envoi...' : 'Initier le transfert'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.admins-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}
	.panel {
		padding: var(--space-lg);
	}
	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
		flex-wrap: wrap;
	}
	.panel-header h2 {
		font-size: var(--text-lg);
		font-weight: 700;
		margin-bottom: 2px;
	}
	.panel-actions {
		display: flex;
		gap: var(--space-sm);
	}
	.admin-table {
		width: 100%;
		border-collapse: collapse;
	}
	.admin-table th,
	.admin-table td {
		padding: var(--space-sm) var(--space-md);
		text-align: left;
		border-bottom: 1px solid var(--border);
		font-size: var(--text-sm);
	}
	.admin-table th {
		font-weight: 600;
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}
	.admin-table tbody tr:last-child td {
		border-bottom: none;
	}
	.action-col {
		width: 120px;
		text-align: right;
	}
	.role-tag {
		display: inline-block;
		padding: 2px 8px;
		border-radius: 4px;
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.role-tag[data-role='owner'] {
		background: var(--accent);
		color: var(--bg-page);
	}
	.role-tag[data-role='admin'] {
		background: rgba(200, 164, 78, 0.15);
		color: var(--accent);
		border: 1px solid rgba(200, 164, 78, 0.3);
	}
	.email-cell {
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.you-tag {
		color: var(--accent);
		font-weight: 600;
		margin-left: var(--space-xs);
	}
	.hint {
		text-align: center;
		font-size: var(--text-sm);
	}
	.warning-note {
		padding: var(--space-sm) var(--space-md);
		background: rgba(200, 164, 78, 0.08);
		border-left: 3px solid var(--accent);
		border-radius: 4px;
		margin-bottom: var(--space-md);
		font-size: var(--text-sm);
	}
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
		z-index: 200;
	}
	.modal {
		width: 100%;
		max-width: 480px;
		padding: var(--space-lg);
		cursor: default;
	}
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
	}
	.modal-header h3 {
		font-size: var(--text-lg);
		font-weight: 700;
	}
	.modal-close {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: var(--text-xl);
		line-height: 1;
		padding: 0 var(--space-xs);
	}
	.modal-close:hover {
		color: var(--text-primary);
	}
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}
	.form-group {
		margin-bottom: var(--space-md);
	}
	.form-group select {
		width: 100%;
		padding: var(--space-sm);
		background: var(--bg-card);
		border: 1px solid var(--border);
		color: var(--text-primary);
		border-radius: 6px;
		font-size: var(--text-sm);
	}
	@media (max-width: 640px) {
		.admin-table th:nth-child(3),
		.admin-table td:nth-child(3) {
			display: none;
		}
	}
</style>
