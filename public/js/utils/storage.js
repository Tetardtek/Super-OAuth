/**
 * Storage utilities - Gestion du localStorage
 * @version 1.0.0
 */

import { STORAGE_KEYS } from '../config.js';

export const Storage = {
    get(key) {
        return localStorage.getItem(key);
    },

    set(key, value) {
        localStorage.setItem(key, value);
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    clear() {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    },

    // Tokens spécifiques
    getAccessToken() {
        return this.get(STORAGE_KEYS.ACCESS_TOKEN);
    },

    getRefreshToken() {
        return this.get(STORAGE_KEYS.REFRESH_TOKEN);
    },

    setTokens(accessToken, refreshToken) {
        this.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        if (refreshToken !== null && refreshToken !== undefined) {
            this.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        }
    },

    clearTokens() {
        this.remove(STORAGE_KEYS.ACCESS_TOKEN);
        this.remove(STORAGE_KEYS.REFRESH_TOKEN);
    }
};
