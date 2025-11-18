/**
 * Application principale SuperOAuth
 * Interface web pour les tests d'authentification
 * @version 2.0.0 - REFACTORÉ
 *
 * Architecture modulaire:
 * - Toast notifications: managers/toast-manager.js
 * - Token management: managers/token-manager.js
 * - Auth service: auth-service.js
 * - Components: auth-component.js, dashboard.js, server-monitor.js
 * - Utils: utils/*.js
 */

// Configuration de l'API
const API_BASE = '/api/v1';

// Imports des managers
import { Toast } from './managers/toast-manager.js';
import { tokenManager } from './managers/token-manager.js';

// Imports des services et composants
import { AuthService } from './auth-service.js';
import { Dashboard } from './dashboard.js';

// Imports des utilitaires
import { Logger } from './utils/logger.js';

// Initialisation des services
const authService = new AuthService();
const dashboardInstance = new Dashboard(authService);

// Exposer globalement pour compatibilité
window.Toast = Toast;
window.tokenManager = tokenManager;
window.dashboardInstance = dashboardInstance;

// Logger simple pour compatibilité avec le code legacy
const LegacyLogger = {
    info: (msg, data) => console.log(`ℹ️ ${msg}`, data || ''),
    success: (msg, data) => console.log(`✅ ${msg}`, data || ''),
    warn: (msg, data) => console.warn(`⚠️ ${msg}`, data || ''),
    error: (msg, data) => console.error(`❌ ${msg}`, data || '')
};

// Classe TokenManager legacy pour compatibilité (délègue au nouveau tokenManager)
const TokenManager = {
    getAccessToken: () => tokenManager.getAccessToken(),
    getRefreshToken: () => tokenManager.getRefreshToken(),
    setTokens: (access, refresh) => tokenManager.setTokens(access, refresh),
    clearTokens: () => tokenManager.clearTokens()
};

// Fonctions d'authentification classique (legacy - à migrer vers AuthComponent)
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
        LegacyLogger.info('Tentative de connexion...', { email });

        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        LegacyLogger.info('Réponse reçue', { status: response.status, ok: response.ok });

        const data = await response.json();
        LegacyLogger.info('Données parsées', { data });

        if (response.ok) {
            // Structure de réponse: data.data.tokens.accessToken et data.data.user
            const tokens = data.data?.tokens || {};
            const user = data.data?.user || {};

            LegacyLogger.info('Tokens et utilisateur extraits', { tokens, user });

            TokenManager.setTokens(tokens.accessToken, tokens.refreshToken);
            localStorage.setItem('userInfo', JSON.stringify(user));

            // Toast de succès
            Toast.success(`Connexion réussie ! Bienvenue ${user.nickname || user.email}`);
            showResponse(responseArea, 'Connexion réussie !', 'success', data);
            LegacyLogger.success('Connexion réussie', data);

            // Rediriger vers le dashboard
            setTimeout(() => {
                LegacyLogger.info('Chargement du dashboard...');
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
            LegacyLogger.error('Erreur de connexion', data);
        }

    } catch (error) {
        Toast.error('Impossible de se connecter au serveur. Vérifiez votre connexion.');
        showResponse(responseArea, 'Erreur réseau lors de la connexion', 'error');
        LegacyLogger.error('Erreur réseau', error);
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
        LegacyLogger.info('Tentative d\'inscription...', { email, nickname });

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
            LegacyLogger.success('Inscription réussie', data);

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
            LegacyLogger.error('Erreur d\'inscription', data);
        }

    } catch (error) {
        Toast.error('Impossible de créer le compte. Vérifiez votre connexion.');
        showResponse(responseArea, 'Erreur réseau lors de l\'inscription', 'error');
        LegacyLogger.error('Erreur réseau', error);
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
                LegacyLogger.success('Déconnexion réussie');
                Toast.success('Vous avez été déconnecté avec succès');
            } else {
                LegacyLogger.warn('Erreur lors de la déconnexion côté serveur');
                Toast.warning('Déconnexion locale effectuée');
            }
        }

    } catch (error) {
        LegacyLogger.warn('Erreur lors de la déconnexion', error);
    } finally {
        // Nettoyer les tokens localement dans tous les cas
        TokenManager.clearTokens();

        // Cacher le dashboard et afficher les sections de connexion
        const userDashboard = document.getElementById('userDashboard');
        if (userDashboard) {
            userDashboard.style.display = 'none';
        }

        LegacyLogger.success('Déconnexion locale terminée');
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
        LegacyLogger.info('Test du refresh token...');

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
            LegacyLogger.success('Token rafraîchi', data);
        } else {
            Toast.error('Impossible de rafraîchir le token. Reconnectez-vous.');
            showResponse(responseArea, data.message || 'Erreur lors du rafraîchissement', 'error', data);
            LegacyLogger.error('Erreur de rafraîchissement', data);
        }

    } catch (error) {
        Toast.error('Erreur réseau lors du rafraîchissement du token');
        showResponse(responseArea, 'Erreur réseau lors du rafraîchissement', 'error');
        LegacyLogger.error('Erreur réseau', error);
    }
}

// OAuth
function oauthLogin(provider) {
    LegacyLogger.info(`Redirection OAuth vers ${provider}...`);
    Toast.info(`Redirection vers ${provider.charAt(0).toUpperCase() + provider.slice(1)}...`);
    window.location.href = `/api/v1/auth/oauth/${provider}`;
}

// Dashboard utilisateur
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
        LegacyLogger.info('Vérification de l\'état du serveur...');

        const response = await fetch('/health');
        const data = await response.json();

        if (response.ok) {
            showResponse(responseArea, 'Serveur en ligne', 'success', data);
            LegacyLogger.success('Serveur en ligne', data);

            // Mettre à jour l'indicateur de statut
            const statusDot = document.getElementById('serverStatus');
            const statusText = document.getElementById('serverStatusText');

            if (statusDot && statusText) {
                statusDot.className = 'status-dot status-online';
                statusText.textContent = `En ligne - ${data.environment || 'development'} (${data.version || 'v1.0.0'})`;
            }

        } else {
            showResponse(responseArea, 'Serveur en erreur', 'error', data);
            LegacyLogger.error('Serveur en erreur', data);
        }

    } catch (error) {
        showResponse(responseArea, 'Impossible de joindre le serveur', 'error');
        LegacyLogger.error('Erreur de connexion au serveur', error);

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
    LegacyLogger.info('🔧 Test des boutons - Les boutons fonctionnent !');
    Toast.success('Les boutons fonctionnent parfaitement ! 🎉', 3000);
}

// Validation des mots de passe
function validatePasswordMatch() {
    const password = document.getElementById('registerPassword')?.value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm')?.value;

    if (password && passwordConfirm) {
        if (password === passwordConfirm) {
            LegacyLogger.success('Les mots de passe correspondent');
        } else {
            LegacyLogger.warn('Les mots de passe ne correspondent pas');
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
}

Logger.info('🚀 SuperOAuth App.js chargé et prêt !');
