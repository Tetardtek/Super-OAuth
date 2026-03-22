import { writable } from 'svelte/store';
import type { User } from '$types/user';

interface AuthState {
	user: User | null;
	loading: boolean;
	accessToken: string | null;
}

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		loading: true,
		accessToken: null
	});

	return {
		subscribe,
		setUser(user: User, accessToken: string) {
			set({ user, loading: false, accessToken });
		},
		logout() {
			if (typeof localStorage !== 'undefined') {
				localStorage.removeItem('accessToken');
				localStorage.removeItem('refreshToken');
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
			const token = localStorage.getItem('accessToken');
			if (token) {
				update((s) => ({ ...s, accessToken: token, loading: true }));
			} else {
				set({ user: null, loading: false, accessToken: null });
			}
		}
	};
}

export const auth = createAuthStore();
