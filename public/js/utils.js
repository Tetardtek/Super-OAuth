/**
 * Utilitaires SuperOAuth - Application principale
 * @version 1.0.0
 */

import { STORAGE_KEYS } from './config.js';
import { SharedUtils } from './shared-utils.js';

// Storage utilities
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
        this.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    },
    
    clearTokens() {
        this.remove(STORAGE_KEYS.ACCESS_TOKEN);
        this.remove(STORAGE_KEYS.REFRESH_TOKEN);
    }
};

// Utilitaires pour l'interface
export const UI = {
    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.style.display = 'block';
    },
    
    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.style.display = 'none';
    },
    
    clearValue(elementId) {
        const element = document.getElementById(elementId);
        if (element) element.value = '';
    },
    
    setValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) element.value = value;
    },
    
    getValue(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value : '';
    },
    
    setHTML(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) element.innerHTML = html;
    },
    
    setBorderColor(elementId, color) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.borderColor = color;
            element.style.boxShadow = color === '#ddd' ? 'none' : `0 0 5px ${color}33`;
        }
    }
};

// Validation utilities
export const Validation = {
    email(email) {
        return SharedUtils.isValidEmail(email);
    },
    
    isPasswordStrong(password) {
        // Au moins 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 spécial
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return re.test(password);
    },
    
    passwordsMatch(password1, password2) {
        return password1 === password2 && password1.length > 0;
    }
};

// Utilitaires de formatage
// Format utilities
export const Format = {
    date(dateInput) {
        return SharedUtils.formatDate(dateInput);
    },

    datetime(dateInput) {
        return SharedUtils.formatDateTime(dateInput);
    },

    avatarLetter(text) {
        if (!text || text.length === 0) return 'U';
        return text.charAt(0).toUpperCase();
    }
};

// Utilitaires pour les requêtes HTTP
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
    }
};

// Gestion des erreurs
export const ErrorHandler = {
    handle(error, responseDiv) {
        console.error('❌ Error:', error);
        
        if (responseDiv) {
            UI.showElement(responseDiv);
            UI.setHTML(responseDiv, `
                <div style="color: #f56565;">❌ Erreur: ${error.message}</div>
            `);
        }
    },
    
    handleAPIError(response, responseDiv) {
        if (!response.ok) {
            const errorMessage = response.data?.message || 'Erreur inconnue';
            if (responseDiv) {
                UI.showElement(responseDiv);
                UI.setHTML(responseDiv, `
                    <div style="color: #f56565;">❌ Erreur: ${errorMessage}</div>
                    <details style="margin-top: 10px;">
                        <summary style="cursor: pointer; color: #4299e1;">📋 Détails</summary>
                        <pre style="margin-top: 5px;">${JSON.stringify(response.data, null, 2)}</pre>
                    </details>
                `);
            }
            return false;
        }
        return true;
    }
};

// Logging
export const Logger = {
    info(message, ...args) {
        console.log(`ℹ️ ${message}`, ...args);
    },
    
    success(message, ...args) {
        console.log(`✅ ${message}`, ...args);
    },
    
    error(message, ...args) {
        console.error(`❌ ${message}`, ...args);
    },
    
    warn(message, ...args) {
        console.warn(`⚠️ ${message}`, ...args);
    },
    
    debug(message, ...args) {
        console.log(`🔧 ${message}`, ...args);
    }
};
