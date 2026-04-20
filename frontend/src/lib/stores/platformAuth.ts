import { writable } from 'svelte/store';
import type { PlatformUser } from '$types/platform';

interface PlatformAuthState {
	user: PlatformUser | null;
	loading: boolean;
	accessToken: string | null;
}

const ACCESS_KEY = 'platformAccessToken';
const REFRESH_KEY = 'platformRefreshToken';

function createPlatformAuthStore() {
	const { subscribe, set, update } = writable<PlatformAuthState>({
		user: null,
		loading: true,
		accessToken: null
	});

	return {
		subscribe,

		setUser(user: PlatformUser, accessToken: string, refreshToken?: string) {
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(ACCESS_KEY, accessToken);
				if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
			}
			set({ user, loading: false, accessToken });
		},

		logout() {
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem(ACCESS_KEY);
				localStorage.removeItem(REFRESH_KEY);
			}
			set({ user: null, loading: false, accessToken: null });
		},

		setLoading(loading: boolean) {
			update((s) => ({ ...s, loading }));
		},

		init() {
			if (typeof localStorage === 'undefined') {
				set({ user: null, loading: false, accessToken: null });
				return;
			}
			const token = localStorage.getItem(ACCESS_KEY);
			if (token) {
				update((s) => ({ ...s, accessToken: token, loading: true }));
			} else {
				set({ user: null, loading: false, accessToken: null });
			}
		},

		getAccessToken(): string | null {
			if (typeof localStorage === 'undefined') return null;
			return localStorage.getItem(ACCESS_KEY);
		}
	};
}

export const platformAuth = createPlatformAuthStore();
