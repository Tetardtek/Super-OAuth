/**
 * Application principale SuperOAuth
 * Interface web pour les tests d'authentification
 * @version 1.0.0
 */

// Configuration de l'API
const API_BASE = '/api/v1';

// Système de Toast Notifications
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.initContainer();
    }

    initContainer() {
        // Créer le conteneur de toast s'il n'existe pas
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', duration = 5000) {
        const toast = this.createToast(message, type, duration);
        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Animation d'entrée
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 10);

        // Auto-suppression
        setTimeout(() => {
            this.remove(toast);
        }, duration);

        return toast;
    }

    createToast(message, type, duration) {
        const toast = document.createElement('div');
        
        const colors = {
            success: { bg: '#10b981', icon: '✅' },
            error: { bg: '#ef4444', icon: '❌' },
            warning: { bg: '#f59e0b', icon: '⚠️' },
            info: { bg: '#3b82f6', icon: 'ℹ️' }
        };

        const config = colors[type] || colors.info;

        toast.style.cssText = `
            background: ${config.bg};
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
            pointer-events: auto;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
        `;

        toast.innerHTML = `
            <span style="font-size: 16px;">${config.icon}</span>
            <span style="flex: 1;">${message}</span>
            <span style="font-size: 18px; opacity: 0.7; margin-left: 10px;">×</span>
        `;

        // Clic pour fermer
        toast.addEventListener('click', () => {
            this.remove(toast);
        });

        return toast;
    }

    remove(toast) {
        if (!toast || !toast.parentElement) return;

        // Animation de sortie
        toast.style.transform = 'translateX(400px)';
        toast.style.opacity = '0';

        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }, 300);
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// Instance globale du gestionnaire de toast
const Toast = new ToastManager();

// Logger simple
const Logger = {
    info: (msg, data) => console.log(`ℹ️ ${msg}`, data || ''),
    success: (msg, data) => console.log(`✅ ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`⚠️ ${msg}`, data || ''),
    error: (msg, data) => console.error(`❌ ${msg}`, data || '')
};

// Stockage des tokens
class TokenManager {
    static getAccessToken() {
        return localStorage.getItem('accessToken');
    }
    
    static getRefreshToken() {
        return localStorage.getItem('refreshToken');
    }
    
    static setTokens(accessToken, refreshToken) {
        localStorage.setItem('accessToken', accessToken);
        if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken);
        }
    }
    
    static clearTokens() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userInfo');
    }
}

// Fonctions d'authentification classique
async function loginClassic() {
    console.log('=== DÉBUT loginClassic ===');
    
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    const responseArea = document.getElementById('loginResponse');
    
    console.log('Éléments récupérés:', { 
        email, 
        password: password ? '[MDP PRÉSENT]' : '[MDP ABSENT]', 
        responseArea: !!responseArea 
    });
    
    if (!email || !password) {
        console.log('Erreur: champs manquants');
        Toast.error('Veuillez remplir tous les champs');
        return;
    }
    
    try {
        Logger.info('Tentative de connexion...', { email });
        
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        Logger.info('Réponse reçue', { status: response.status, ok: response.ok });
        
        const data = await response.json();
        Logger.info('Données parsées', { data });
        
        if (response.ok) {
            // Structure de réponse: data.data.tokens.accessToken et data.data.user
            const tokens = data.data?.tokens || {};
            const user = data.data?.user || {};
            
            Logger.info('Tokens et utilisateur extraits', { tokens, user });
            
            TokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
            localStorage.setItem('userInfo', JSON.stringify(user));
            
            // Toast de succès au lieu de showResponse
            Toast.success(`Connexion réussie ! Bienvenue ${user.nickname || user.email}`);
            showResponse(responseArea, 'Connexion réussie !', 'success', data);
            Logger.success('Connexion réussie', data);
            
            // Rediriger vers le dashboard
            setTimeout(() => {
                Logger.info('Chargement du dashboard...');
                loadUserDashboard();
            }, 1000);
            
        } else {
            // Toast d'erreur personnalisé selon le type d'erreur
            const errorMessage = data.message || 'Erreur de connexion';
            if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('incorrect')) {
                Toast.error('Identifiants incorrects. Vérifiez votre email et mot de passe.');
            } else if (errorMessage.toLowerCase().includes('not found')) {
                Toast.error('Compte non trouvé. Vérifiez votre email ou inscrivez-vous.');
            } else {
                Toast.error(errorMessage);
            }
            showResponse(responseArea, data.message || 'Erreur de connexion', 'error', data);
            Logger.error('Erreur de connexion', data);
        }
        
    } catch (error) {
        Toast.error('Impossible de se connecter au serveur. Vérifiez votre connexion.');
        showResponse(responseArea, 'Erreur réseau lors de la connexion', 'error');
        Logger.error('Erreur réseau', error);
    }
}

async function registerClassic() {
    const email = document.getElementById('registerEmail')?.value;
    const password = document.getElementById('registerPassword')?.value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm')?.value;
    const nickname = document.getElementById('registerNickname')?.value;
    const responseArea = document.getElementById('registerResponse');
    
    if (!email || !password || !passwordConfirm || !nickname) {
        Toast.error('Tous les champs sont obligatoires pour l\'inscription');
        return;
    }
    
    if (password !== passwordConfirm) {
        Toast.error('Les mots de passe ne correspondent pas');
        showResponse(responseArea, 'Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    try {
        Logger.info('Tentative d\'inscription...', { email, nickname });
        
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, nickname })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            Toast.success('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
            showResponse(responseArea, 'Inscription réussie ! Vous pouvez maintenant vous connecter.', 'success', data);
            Logger.success('Inscription réussie', data);
            
            // Vider les champs d'inscription
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('registerPasswordConfirm').value = '';
            document.getElementById('registerNickname').value = '';
            
        } else {
            // Messages d'erreur personnalisés pour l'inscription
            const errorMessage = data.message || 'Erreur lors de l\'inscription';
            if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('déjà utilisé')) {
                Toast.error('Cette adresse email est déjà utilisée');
            } else if (errorMessage.toLowerCase().includes('invalid email')) {
                Toast.error('Format d\'email invalide');
            } else if (errorMessage.toLowerCase().includes('password')) {
                Toast.error('Le mot de passe ne respecte pas les critères de sécurité');
            } else {
                Toast.error(errorMessage);
            }
            showResponse(responseArea, data.message || 'Erreur lors de l\'inscription', 'error', data);
            Logger.error('Erreur d\'inscription', data);
        }
        
    } catch (error) {
        Toast.error('Impossible de créer le compte. Vérifiez votre connexion.');
        showResponse(responseArea, 'Erreur réseau lors de l\'inscription', 'error');
        Logger.error('Erreur réseau', error);
    }
}

async function logout() {
    try {
        const accessToken = TokenManager.getAccessToken();
        
        if (accessToken) {
            const response = await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                Logger.success('Déconnexion réussie');
                Toast.success('Vous avez été déconnecté avec succès');
            } else {
                Logger.warn('Erreur lors de la déconnexion côté serveur');
                Toast.warning('Déconnexion locale effectuée');
            }
        }
        
    } catch (error) {
        Logger.warn('Erreur lors de la déconnexion', error);
    } finally {
        // Nettoyer les tokens localement dans tous les cas
        TokenManager.clearTokens();
        
        // Cacher le dashboard et afficher les sections de connexion
        const userDashboard = document.getElementById('userDashboard');
        if (userDashboard) {
            userDashboard.style.display = 'none';
        }
        
        Logger.success('Déconnexion locale terminée');
    }
}

async function testRefreshToken() {
    const refreshToken = TokenManager.getRefreshToken();
    const responseArea = document.getElementById('loginResponse');
    
    if (!refreshToken) {
        Toast.error('Aucun refresh token disponible');
        showResponse(responseArea, 'Aucun refresh token disponible', 'error');
        return;
    }
    
    try {
        Logger.info('Test du refresh token...');
        
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            TokenManager.setTokens(data.accessToken, data.refreshToken);
            Toast.success('Token rafraîchi avec succès !');
            showResponse(responseArea, 'Token rafraîchi avec succès !', 'success', data);
            Logger.success('Token rafraîchi', data);
        } else {
            Toast.error('Impossible de rafraîchir le token. Reconnectez-vous.');
            showResponse(responseArea, data.message || 'Erreur lors du rafraîchissement', 'error', data);
            Logger.error('Erreur de rafraîchissement', data);
        }
        
    } catch (error) {
        Toast.error('Erreur réseau lors du rafraîchissement du token');
        showResponse(responseArea, 'Erreur réseau lors du rafraîchissement', 'error');
        Logger.error('Erreur réseau', error);
    }
}

// OAuth
function oauthLogin(provider) {
    Logger.info(`Redirection OAuth vers ${provider}...`);
    Toast.info(`Redirection vers ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`);
    window.location.href = `/api/v1/auth/oauth/${provider}`;
}

// Dashboard utilisateur

import { AuthService } from './auth-service.js';
import { Dashboard } from './dashboard.js';
const authService = new AuthService();
const dashboardInstance = new Dashboard(authService);
window.dashboardInstance = dashboardInstance;

async function loadUserDashboard() {
    await dashboardInstance.load();
    // Fallback d'affichage si jamais le dashboard reste caché
    const dash = document.getElementById('userDashboard');
    if (dash) {
        dash.style.display = 'block';
    }
    // Si le dashboard reste bloqué sur 'Chargement...' plus de 3s, afficher une erreur user-friendly
    setTimeout(() => {
        const dash = document.getElementById('userDashboard');
        if (dash && dash.innerHTML.includes('⏳')) {
            dash.innerHTML = '<div class="error">❌ Impossible de charger le dashboard.<br>Vérifiez votre connexion ou reconnectez-vous.</div>';
        }
    }, 3000);
}

async function refreshUserInfo() {
    await loadUserDashboard();
}

// Vérification de l'état du serveur
async function checkServerHealth() {
    const responseArea = document.getElementById('healthResponse');
    
    try {
        Logger.info('Vérification de l\'état du serveur...');
        
        const response = await fetch('/health');
        const data = await response.json();
        
        if (response.ok) {
            showResponse(responseArea, 'Serveur en ligne', 'success', data);
            Logger.success('Serveur en ligne', data);
            
            // Mettre à jour l'indicateur de statut
            const statusDot = document.getElementById('serverStatus');
            const statusText = document.getElementById('serverStatusText');
            
            if (statusDot && statusText) {
                statusDot.className = 'status-dot status-online';
                statusText.textContent = `En ligne - ${data.environment || 'development'} (${data.version || 'v1.0.0'})`;
            }
            
        } else {
            showResponse(responseArea, 'Serveur en erreur', 'error', data);
            Logger.error('Serveur en erreur', data);
        }
        
    } catch (error) {
        showResponse(responseArea, 'Impossible de joindre le serveur', 'error');
        Logger.error('Erreur de connexion au serveur', error);
        
        // Mettre à jour l'indicateur de statut
        const statusDot = document.getElementById('serverStatus');
        const statusText = document.getElementById('serverStatusText');
        
        if (statusDot && statusText) {
            statusDot.className = 'status-dot status-offline';
            statusText.textContent = 'Hors ligne';
        }
    }
}

// Fonction de test pour debug
function testButton() {
    Logger.info('🔧 Test des boutons - Les boutons fonctionnent !');
    Toast.success('Les boutons fonctionnent parfaitement ! 🎉', 3000);
}

// Validation des mots de passe
function validatePasswordMatch() {
    const password = document.getElementById('registerPassword')?.value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm')?.value;
    
    if (password && passwordConfirm) {
        if (password === passwordConfirm) {
            Logger.success('Les mots de passe correspondent');
            // Optionnel: Toast.success('Les mots de passe correspondent', 2000);
        } else {
            Logger.warn('Les mots de passe ne correspondent pas');
            Toast.warning('Les mots de passe ne correspondent pas', 3000);
        }
    }
}

// Utilitaire pour afficher les réponses
function showResponse(element, message, type = 'info', data = null) {
    if (!element) return;
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        info: '#2196F3',
        warning: '#ff9800'
    };
    
    element.style.display = 'block';
    element.style.backgroundColor = colors[type] + '20';
    element.style.border = `1px solid ${colors[type]}`;
    element.style.borderRadius = '5px';
    element.style.padding = '15px';
    element.style.marginTop = '10px';
    
    let content = `<strong>${message}</strong>`;
    
    if (data) {
        content += `<pre style="margin-top: 10px; font-size: 0.9em; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>`;
    }
    
    element.innerHTML = content;
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    console.log('JavaScript chargé avec succès');
    Logger.success('SuperOAuth Interface chargée');
    
    // Attacher les event listeners aux boutons
    attachEventListeners();
    
    // Vérifier l'état du serveur
    checkServerHealth();
    
    // Si un token existe, charger le dashboard
    const accessToken = TokenManager.getAccessToken();
    if (accessToken) {
        loadUserDashboard();
    }
    
    // Ajouter les événements de validation des mots de passe
    const passwordConfirm = document.getElementById('registerPasswordConfirm');
    if (passwordConfirm) {
        passwordConfirm.addEventListener('input', validatePasswordMatch);
    }
});

// Attacher tous les event listeners
function attachEventListeners() {
    // Login section
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', loginClassic);
    }

    const refreshTokenBtn = document.getElementById('refreshTokenBtn');
    if (refreshTokenBtn) {
        refreshTokenBtn.addEventListener('click', testRefreshToken);
    }

    const logoutBtn1 = document.getElementById('logoutBtn1');
    if (logoutBtn1) {
        logoutBtn1.addEventListener('click', logout);
    }

    // Register section
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', registerClassic);
    }

    const testBtn = document.getElementById('testBtn');
    if (testBtn) {
        testBtn.addEventListener('click', testButton);
    }

    // OAuth section
    const discordBtn = document.getElementById('discordBtn');
    if (discordBtn) {
        discordBtn.addEventListener('click', () => oauthLogin('discord'));
    }

    const twitchBtn = document.getElementById('twitchBtn');
    if (twitchBtn) {
        twitchBtn.addEventListener('click', () => oauthLogin('twitch'));
    }

    const googleBtn = document.getElementById('googleBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => oauthLogin('google'));
    }

    const githubBtn = document.getElementById('githubBtn');
    if (githubBtn) {
        githubBtn.addEventListener('click', () => oauthLogin('github'));
    }

    // Dashboard section
    const refreshUserBtn = document.getElementById('refreshUserBtn');
    if (refreshUserBtn) {
        refreshUserBtn.addEventListener('click', refreshUserInfo);
    }

    const logoutBtn2 = document.getElementById('logoutBtn2');
    if (logoutBtn2) {
        logoutBtn2.addEventListener('click', logout);
    }

    // Server health section
    const checkServerBtn = document.getElementById('checkServerBtn');
    if (checkServerBtn) {
        checkServerBtn.addEventListener('click', checkServerHealth);
    }
    // (Gardé : logs importants et état serveur)
}

Logger.info('🚀 SuperOAuth App.js chargé et prêt !');
