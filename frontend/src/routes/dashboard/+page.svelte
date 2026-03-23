<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$stores/auth';
	import { api } from '$services/api';
	import { toast } from '$stores/toast';
	import { onMount } from 'svelte';
	import type { User, LinkedAccount } from '$types/user';

	const providers = ['discord', 'github', 'google', 'twitch'];

	let activeTab = $state<'profile' | 'accounts' | 'merge'>('profile');
	let user = $state<User | null>(null);
	let linkedProviders = $state<string[]>([]);
	let mergeToken = $state('');
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await api.get<User>('/auth/me');
			user = res;
			auth.setUser(res, localStorage.getItem('accessToken') || '');
			linkedProviders = (res.linkedAccounts || []).map((a) => a.provider);
		} catch {
			toast.error('Session expirée');
			goto('/login');
		} finally {
			loading = false;
		}
	});

	async function linkProvider(provider: string) {
		const redirectUrl = `${window.location.origin}/callback`;
		window.location.href = `/api/v1/oauth/${provider}/link?redirectUrl=${encodeURIComponent(redirectUrl)}`;
	}

	async function unlinkProvider(provider: string) {
		try {
			await api.delete(`/oauth/${provider}/unlink`);
			linkedProviders = linkedProviders.filter((p) => p !== provider);
			toast.success(`${provider} délié`);
		} catch (err: any) {
			toast.error(err.message);
		}
	}

	async function mergeAccount() {
		if (!mergeToken.trim()) return;
		try {
			await api.post('/oauth/account/merge', { targetToken: mergeToken });
			toast.success('Comptes fusionnés');
			mergeToken = '';
			// Refresh user data
			const res = await api.get<User>('/auth/me');
			user = res;
			linkedProviders = (res.linkedAccounts || []).map((a) => a.provider);
		} catch (err: any) {
			toast.error(err.message);
		}
	}

	async function handleLogout() {
		try {
			await api.post('/auth/logout');
		} catch {
			// silent
		}
		auth.logout();
		goto('/');
	}

	function formatDate(dateStr?: string): string {
		if (!dateStr) return '—';
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Dashboard — SuperOAuth</title>
</svelte:head>

<div class="dashboard-page">
	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
		</div>
	{:else if user}
		<div class="container">
			<header class="dash-header">
				<div>
					<h1>Dashboard</h1>
					<p class="text-secondary">Gérez votre compte SuperOAuth</p>
				</div>
				<button class="btn btn-ghost btn-sm" onclick={handleLogout}>Déconnexion</button>
			</header>

			<!-- Tabs -->
			<div class="tabs">
				<button class="tab" class:active={activeTab === 'profile'} onclick={() => activeTab = 'profile'}>
					Profil
				</button>
				<button class="tab" class:active={activeTab === 'accounts'} onclick={() => activeTab = 'accounts'}>
					Comptes liés
				</button>
				<button class="tab" class:active={activeTab === 'merge'} onclick={() => activeTab = 'merge'}>
					Fusionner
				</button>
			</div>

			<!-- Profile -->
			{#if activeTab === 'profile'}
				<div class="tab-content">
					<div class="profile-card card">
						<div class="avatar">
							{user.nickname?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
						</div>
						<div class="profile-info">
							<h2>{user.nickname || 'Utilisateur'}</h2>
							<p class="text-secondary">{user.email || 'Aucun email'}</p>
							<div class="profile-meta">
								<span class="badge {user.emailVerified ? 'badge-success' : 'badge-demo'}">
									{user.emailVerified ? 'Email vérifié' : 'Non vérifié'}
								</span>
								<span class="text-muted">Inscrit le {formatDate(user.createdAt)}</span>
							</div>
						</div>
					</div>

					<div class="stats-grid">
						<div class="card stat-card">
							<span class="stat-label text-muted">Dernière connexion</span>
							<span class="stat-value">{formatDate(user.lastLoginAt)}</span>
						</div>
						<div class="card stat-card">
							<span class="stat-label text-muted">Comptes liés</span>
							<span class="stat-value">{linkedProviders.length}</span>
						</div>
						<div class="card stat-card">
							<span class="stat-label text-muted">Providers disponibles</span>
							<span class="stat-value">{providers.length}</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Linked Accounts -->
			{#if activeTab === 'accounts'}
				<div class="tab-content">
					<div class="providers-list">
						{#each providers as provider}
							{@const linked = linkedProviders.includes(provider)}
							<div class="card provider-card">
								<div class="provider-info">
									<span class="provider-name">{provider}</span>
									<span class="badge {linked ? 'badge-success' : 'badge-demo'}">
										{linked ? 'Lié' : 'Non lié'}
									</span>
								</div>
								{#if linked}
									<button class="btn btn-ghost btn-sm" onclick={() => unlinkProvider(provider)}>
										Délier
									</button>
								{:else}
									<button class="btn btn-primary btn-sm" onclick={() => linkProvider(provider)}>
										Lier
									</button>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Merge -->
			{#if activeTab === 'merge'}
				<div class="tab-content">
					<div class="card merge-card">
						<h3>Fusionner deux comptes</h3>
						<p class="text-secondary">
							Si vous avez deux comptes SuperOAuth, vous pouvez les fusionner.
							Connectez-vous sur l'autre compte, copiez le token depuis les paramètres,
							et collez-le ci-dessous.
						</p>
						<div class="merge-form">
							<input
								type="text"
								bind:value={mergeToken}
								placeholder="Token du compte à fusionner"
							/>
							<button class="btn btn-primary" onclick={mergeAccount} disabled={!mergeToken.trim()}>
								Fusionner
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.dashboard-page { padding: var(--space-xl) 0; }

	.loading-state {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	.dash-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-xl);
	}

	.dash-header h1 { font-size: var(--text-2xl); font-weight: 700; }

	/* Tabs */
	.tabs {
		display: flex;
		gap: var(--space-xs);
		border-bottom: 1px solid var(--border);
		margin-bottom: var(--space-xl);
	}

	.tab {
		background: none;
		border: none;
		color: var(--text-muted);
		font-family: var(--font-sans);
		font-size: var(--text-sm);
		font-weight: 500;
		padding: var(--space-sm) var(--space-md);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all var(--transition-fast);
	}

	.tab:hover { color: var(--text-primary); }

	.tab.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}

	/* Profile */
	.profile-card {
		display: flex;
		align-items: center;
		gap: var(--space-lg);
	}

	.avatar {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--accent-muted);
		color: var(--accent);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-2xl);
		font-weight: 700;
		flex-shrink: 0;
	}

	.profile-info h2 { font-size: var(--text-xl); font-weight: 600; }
	.profile-meta {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-top: var(--space-sm);
		font-size: var(--text-sm);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
		margin-top: var(--space-lg);
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.stat-value { font-size: var(--text-xl); font-weight: 600; }

	/* Providers */
	.providers-list { display: flex; flex-direction: column; gap: var(--space-sm); }

	.provider-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.provider-info {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.provider-name {
		font-weight: 500;
		text-transform: capitalize;
	}

	/* Merge */
	.merge-card { display: flex; flex-direction: column; gap: var(--space-md); }
	.merge-card h3 { font-size: var(--text-lg); font-weight: 600; }

	.merge-form {
		display: flex;
		gap: var(--space-sm);
	}

	.merge-form input { flex: 1; }

	@media (max-width: 768px) {
		.profile-card { flex-direction: column; text-align: center; }
		.profile-meta { justify-content: center; flex-wrap: wrap; }
		.merge-form { flex-direction: column; }
	}
</style>
