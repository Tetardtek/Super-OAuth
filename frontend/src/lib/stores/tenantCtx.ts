import { writable } from 'svelte/store';
import type { PlatformTenant, TenantAdmin, TenantRole } from '$types/platform';

interface TenantContext {
	tenant: PlatformTenant | null;
	admins: TenantAdmin[];
	currentRole: TenantRole | null;
	loading: boolean;
}

function createTenantCtx() {
	const { subscribe, set, update } = writable<TenantContext>({
		tenant: null,
		admins: [],
		currentRole: null,
		loading: true
	});

	return {
		subscribe,
		set,
		update,
		reset() {
			set({ tenant: null, admins: [], currentRole: null, loading: true });
		}
	};
}

export const tenantCtx = createTenantCtx();
