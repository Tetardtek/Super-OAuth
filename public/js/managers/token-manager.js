/**
 * Token Manager - Gestion des tokens d'authentification
 * @version 1.0.0
 */

export class TokenManager {
    constructor() {
        this.ACCESS_TOKEN_KEY = 'accessToken';
        this.REFRESH_TOKEN_KEY = 'refreshToken';
        this.USER_INFO_KEY = 'userInfo';
    }

    // Getters
    getAccessToken() {
        return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }

    getRefreshToken() {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }

    getUserInfo() {
        const userInfo = localStorage.getItem(this.USER_INFO_KEY);
        if (!userInfo) return null;

        try {
            return JSON.parse(userInfo);
        } catch (error) {
            console.error('Failed to parse user info:', error);
            return null;
        }
    }

    // Setters
    setAccessToken(token) {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    }

    setRefreshToken(token) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    }

    setTokens(accessToken, refreshToken) {
        this.setAccessToken(accessToken);
        if (refreshToken) {
            this.setRefreshToken(refreshToken);
        }
    }

    setUserInfo(userInfo) {
        localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
    }

    // Clear methods
    clearTokens() {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.USER_INFO_KEY);
    }

    clearAll() {
        this.clearTokens();
    }

    // Validation
    hasValidToken() {
        return !!this.getAccessToken();
    }

    isAuthenticated() {
        return this.hasValidToken();
    }
}

// Instance globale exportée
export const tokenManager = new TokenManager();
