const BASE_URL = '/api/v1';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token =
		typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;

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

	if (!res.ok) {
		const body = await res.json().catch(() => ({ message: res.statusText }));
		throw new Error(body.message || `HTTP ${res.status}`);
	}

	return res.json();
}

export const api = {
	get: <T>(path: string) => request<T>(path),
	post: <T>(path: string, data?: unknown) =>
		request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
	put: <T>(path: string, data?: unknown) =>
		request<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
	delete: <T>(path: string) => request<T>(path, { method: 'DELETE' })
};
