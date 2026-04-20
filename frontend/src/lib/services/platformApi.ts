const BASE_URL = '/api/v1/platform';
const ACCESS_KEY = 'platformAccessToken';

interface ApiError extends Error {
	code?: string;
	status?: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token =
		typeof localStorage !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string>)
	};

	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}

	const res = await fetch(`${BASE_URL}${path}`, {
		...options,
		headers
	});

	const body = await res.json().catch(() => ({ message: res.statusText }));

	if (!res.ok) {
		const err: ApiError = new Error(body.message || `HTTP ${res.status}`);
		err.code = body.error;
		err.status = res.status;
		throw err;
	}

	return body as T;
}

export const platformApi = {
	get: <T>(path: string) => request<T>(path),
	post: <T>(path: string, data?: unknown) =>
		request<T>(path, {
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined
		}),
	put: <T>(path: string, data?: unknown) =>
		request<T>(path, {
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined
		}),
	patch: <T>(path: string, data?: unknown) =>
		request<T>(path, {
			method: 'PATCH',
			body: data ? JSON.stringify(data) : undefined
		}),
	delete: <T>(path: string) => request<T>(path, { method: 'DELETE' })
};

export type { ApiError };
