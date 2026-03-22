<script lang="ts">
	import '$lib/styles/global.css';
	import Navbar from '$components/Navbar.svelte';
	import Toast from '$components/Toast.svelte';

	let { children } = $props();
</script>

<Navbar />
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
