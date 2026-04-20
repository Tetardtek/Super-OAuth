<script lang="ts">
	import { onMount } from 'svelte';
	import PlatformNavbar from '$components/PlatformNavbar.svelte';
	import Toast from '$components/Toast.svelte';
	import { platformAuth } from '$stores/platformAuth';
	import { platformApi } from '$services/platformApi';
	import type { PlatformUser } from '$types/platform';

	let { children } = $props();
	let platformEnabled = $state(true);

	onMount(async () => {
		// Probe feature flag first — it's public, doesn't need auth.
		try {
			const res = await platformApi.get<{ success: true; data: { enabled: boolean } }>(
				'/status'
			);
			platformEnabled = res.data.enabled;
		} catch {
			// If /status itself fails, assume enabled — user will see real errors downstream.
		}

		platformAuth.init();
		const token = platformAuth.getAccessToken();
		if (!token) {
			platformAuth.setLoading(false);
			return;
		}
		try {
			const payload = JSON.parse(atob(token.split('.')[1]));
			const user: PlatformUser = {
				id: payload.platformUserId,
				email: '',
				role: payload.role,
				emailVerified: true
			};
			platformAuth.setUser(user, token);
		} catch {
			platformAuth.logout();
		}
	});
</script>

<PlatformNavbar />
{#if !platformEnabled}
	<div class="maintenance-banner">
		🚧 Maintenance en cours — la plateforme platform users est temporairement désactivée. Les
		requêtes retournent 503. Les sessions existantes restent actives côté client mais
		n'interagissent plus avec le backend. Réessaye dans quelques minutes.
	</div>
{/if}
<main>
	{@render children()}
</main>
<Toast />

<style>
	main {
		padding-top: var(--header-height);
		min-height: 100vh;
	}
	.maintenance-banner {
		position: fixed;
		top: var(--header-height);
		left: 0;
		right: 0;
		background: rgba(220, 53, 69, 0.12);
		border-bottom: 1px solid var(--danger, #dc3545);
		color: var(--danger, #dc3545);
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-sm);
		text-align: center;
		z-index: 99;
	}
</style>
