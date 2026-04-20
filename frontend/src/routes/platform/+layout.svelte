<script lang="ts">
	import { onMount } from 'svelte';
	import PlatformNavbar from '$components/PlatformNavbar.svelte';
	import Toast from '$components/Toast.svelte';
	import { platformAuth } from '$stores/platformAuth';
	import { platformApi } from '$services/platformApi';
	import type { PlatformUser } from '$types/platform';

	let { children } = $props();

	onMount(async () => {
		platformAuth.init();
		const token = platformAuth.getAccessToken();
		if (!token) {
			platformAuth.setLoading(false);
			return;
		}
		// Best-effort rehydrate — if the token is valid, /auth/me-equivalent would
		// surface the user. No /me endpoint exists yet on platform scope, so we
		// decode just enough from the JWT payload for UX display.
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
<main>
	{@render children()}
</main>
<Toast />

<style>
	main {
		padding-top: var(--header-height);
		min-height: 100vh;
	}
</style>
