/**
 * Service d'authentification SuperOAuth
 * @version 1.0.0
 */

import { API_CONFIG, MESSAGES, OAUTH_PROVIDERS } from './config.js';
import { OAUTH_REDIRECT_URIS } from './config.js';
import { Storage, HTTP, ErrorHandler, Logger } from './utils.js';

export class AuthService {
    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
    }

    // Inscription
    async register(email, password, nickname) {
        Logger.info('Tentative d\'inscription', { email, nickname });
        
        try {
            const response = await HTTP.post(
                `${this.baseUrl}${API_CONFIG.ENDPOINTS.AUTH.REGISTER}`,
                { email, password, nickname }
            );

            if (response.ok && response.data.success) {
                Logger.success('Inscription réussie');
                
                // Stocker les tokens si disponibles
                if (response.data.data?.tokens?.accessToken) {
                    Storage.setTokens(
                        response.data.data.tokens.accessToken,
                        response.data.data.tokens.refreshToken
                    );
                }
                
                return {
                    success: true,
                    user: response.data.data.user,
                    message: MESSAGES.SUCCESS.REGISTER
                };
            }
            
            return {
                success: false,
                message: response.data.message || 'Erreur d\'inscription',
                details: response.data
            };
            
        } catch (error) {
            Logger.error('Erreur lors de l\'inscription', error);
            return {
                success: false,
                message: MESSAGES.ERROR.NETWORK_ERROR,
                error
            };
        }
    }

    // Connexion
    async login(email, password) {
        Logger.info('Tentative de connexion', { email });
        
        try {
            const response = await HTTP.post(
                `${this.baseUrl}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`,
                { email, password }
            );

            if (response.ok && response.data.success) {
                Logger.success('Connexion réussie');
                
                // Stocker les tokens
                if (response.data.data?.tokens?.accessToken) {
                    Storage.setTokens(
                        response.data.data.tokens.accessToken,
                        response.data.data.tokens.refreshToken
                    );
                }
                
                return {
                    success: true,
                    user: response.data.data.user,
                    message: MESSAGES.SUCCESS.LOGIN
                };
            }
            
            return {
                success: false,
                message: response.data.message || 'Erreur de connexion',
                details: response.data
            };
            
        } catch (error) {
            Logger.error('Erreur lors de la connexion', error);
            return {
                success: false,
                message: MESSAGES.ERROR.NETWORK_ERROR,
                error
            };
        }
    }

    // Déconnexion
    async logout() {
        Logger.info('Tentative de déconnexion');
        
        const accessToken = Storage.getAccessToken();
        const refreshToken = Storage.getRefreshToken();
        
        // Nettoyer localement dans tous les cas
        const cleanup = () => {
            Storage.clearTokens();
            Logger.success('Nettoyage local terminé');
        };
        
        if (!accessToken) {
            cleanup();
            return {
                success: true,
                message: MESSAGES.ERROR.NO_TOKEN
            };
        }
        
        try {
            const response = await HTTP.post(
                `${this.baseUrl}${API_CONFIG.ENDPOINTS.AUTH.LOGOUT}`,
                { refreshToken },
                accessToken
            );
            
            cleanup();
            
            if (response.ok && response.data.success) {
                Logger.success('Déconnexion réussie');
                return {
                    success: true,
                    message: MESSAGES.SUCCESS.LOGOUT
                };
            }
            
            return {
                success: true,
                message: '⚠️ Déconnexion locale effectuée (erreur serveur)',
                details: response.data
            };
            
        } catch (error) {
            Logger.error('Erreur lors de la déconnexion', error);
            cleanup();
            return {
                success: true,
                message: '⚠️ Déconnexion locale effectuée (erreur réseau)',
                error
            };
        }
    }

    // Actualiser le token
    async refreshToken() {
        Logger.info('Actualisation du token');
        
        const refreshToken = Storage.getRefreshToken();
        if (!refreshToken) {
            return {
                success: false,
                message: MESSAGES.ERROR.NO_TOKEN
            };
        }
        
        try {
            const response = await HTTP.post(
                `${this.baseUrl}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`,
                { refreshToken }
            );

            if (response.ok && response.data.success) {
                Logger.success('Token actualisé');
                
                // Mettre à jour les tokens
                if (response.data.data?.accessToken) {
                    Storage.setTokens(
                        response.data.data.accessToken,
                        response.data.data.refreshToken
                    );
                }
                
                return {
                    success: true,
                    message: '🔄 Token rafraîchi !',
                    data: response.data.data
                };
            }
            
            return {
                success: false,
                message: response.data.message || 'Erreur de rafraîchissement',
                details: response.data
            };
            
        } catch (error) {
            Logger.error('Erreur lors du rafraîchissement', error);
            return {
                success: false,
                message: MESSAGES.ERROR.NETWORK_ERROR,
                error
            };
        }
    }

    // Récupérer les informations utilisateur
    async getCurrentUser() {
        Logger.info('Récupération des informations utilisateur');
        
        const accessToken = Storage.getAccessToken();
        if (!accessToken) {
            return {
                success: false,
                message: MESSAGES.ERROR.NO_TOKEN
            };
        }
        
        try {
            const response = await HTTP.get(
                `${this.baseUrl}${API_CONFIG.ENDPOINTS.AUTH.ME}`,
                accessToken
            );

            if (response.ok && response.data.success) {
                Logger.success('Informations utilisateur récupérées');
                return {
                    success: true,
                    user: response.data.data.user
                };
            }
            
            return {
                success: false,
                message: response.data.message || 'Erreur de récupération',
                details: response.data
            };
            
        } catch (error) {
            Logger.error('Erreur lors de la récupération des données utilisateur', error);
            return {
                success: false,
                message: MESSAGES.ERROR.NETWORK_ERROR,
                error
            };
        }
    }

    // Authentification OAuth
    async redirectToOAuth(provider, redirectUri = null) {
        Logger.info('Redirection OAuth', { provider });
        if (!OAUTH_PROVIDERS[provider]) {
            Logger.error('Provider OAuth non supporté', provider);
            return false;
        }
        // Utilise la config centralisée pour le redirect_uri
        const baseRedirectUri = redirectUri || OAUTH_REDIRECT_URIS[provider];
        if (!baseRedirectUri) {
            Logger.error('redirect_uri manquant pour le provider', provider);
            return false;
        }
        const oauthApiUrl = `${this.baseUrl}${API_CONFIG.ENDPOINTS.AUTH.OAUTH}/${provider}?redirect_uri=${encodeURIComponent(baseRedirectUri)}`;
        try {
            const response = await HTTP.get(oauthApiUrl);
            if (response.ok && response.data.success && response.data.data?.authUrl) {
                window.location.href = response.data.data.authUrl;
                return true;
            } else {
                Logger.error('Erreur lors de la récupération de l\'URL OAuth', response.data);
                return false;
            }
        } catch (error) {
            Logger.error('Erreur lors de la redirection OAuth', error);
            return false;
        }
    }

    // Vérifier si l'utilisateur est connecté
    isAuthenticated() {
        return !!Storage.getAccessToken();
    }

    // Vérifier l'état de santé du serveur
    async checkHealth() {
        Logger.info('Vérification de l\'état du serveur');
        
        try {
            const response = await HTTP.get(`${this.baseUrl}${API_CONFIG.ENDPOINTS.HEALTH}`);
            
            if (response.ok) {
                Logger.success('Serveur en ligne');
                return {
                    success: true,
                    online: true,
                    data: response.data
                };
            }
            
            return {
                success: false,
                online: false,
                message: 'Serveur hors ligne'
            };
            
        } catch (error) {
            Logger.error('Erreur de connexion au serveur', error);
            return {
                success: false,
                online: false,
                error
            };
        }
    }
}
