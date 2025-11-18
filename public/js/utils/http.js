/**
 * HTTP utilities - Client HTTP pour les requêtes
 * @version 1.0.0
 */

export const HTTP = {
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        const response = await fetch(url, mergedOptions);
        const data = await response.json();

        return {
            ok: response.ok,
            status: response.status,
            data
        };
    },

    async get(url, token = null) {
        const headers = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return this.request(url, {
            method: 'GET',
            headers
        });
    },

    async post(url, body = {}, token = null) {
        const headers = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return this.request(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
    },

    async put(url, body = {}, token = null) {
        const headers = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return this.request(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body)
        });
    },

    async delete(url, token = null) {
        const headers = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        return this.request(url, {
            method: 'DELETE',
            headers
        });
    }
};
