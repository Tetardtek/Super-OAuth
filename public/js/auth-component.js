/**
 * Composant d'authentification SuperOAuth
 * @version 1.0.0
 */

import { OAUTH_PROVIDERS } from './config.js';
import { UI, Validation, Format, Logger } from './utils.js';

export class AuthComponent {
    constructor(authService, dashboardComponent) {
        this.authService = authService;
        this.dashboardComponent = dashboardComponent;
        this.initializeEventListeners();
    }

    // Initialiser les event listeners
    initializeEventListeners() {
        // Boutons principaux
        this.addClickListener('loginBtn', () => this.login());
        this.addClickListener('registerBtn', () => this.register());
        
        // Validation en temps réel des mots de passe
        this.addInputListener('registerPassword', () => this.validatePasswords());
        this.addInputListener('registerPasswordConfirm', () => this.validatePasswords());
        
        // Réinitialiser les bordures au focus
        this.addFocusListener('registerPassword', () => this.resetPasswordBorders());
        this.addFocusListener('registerPasswordConfirm', () => this.resetPasswordBorders());
        
        Logger.success('Event listeners d\'authentification initialisés');
    }

    // Helper unifié pour les event listeners
    addEventHandler(elementId, eventType, callback) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(eventType, callback);
        } else {
            Logger.warn(`Element ${elementId} not found for ${eventType} event`);
        }
    }

    // Helpers spécialisés (pour compatibilité)
    addClickListener(elementId, callback) {
        this.addEventHandler(elementId, 'click', callback);
    }

    addInputListener(elementId, callback) {
        this.addEventHandler(elementId, 'input', callback);
    }

    addFocusListener(elementId, callback) {
        this.addEventHandler(elementId, 'focus', callback);
    }

    // Connexion
    async login() {
        Logger.info('Tentative de connexion via composant');
        
        const email = UI.getValue('loginEmail');
        const password = UI.getValue('loginPassword');
        
        if (!email || !password) {
            this.showResponse('loginResponse', '❌ Veuillez remplir l\'email et le mot de passe', 'error');
            return;
        }

        if (!Validation.isEmail(email)) {
            this.showResponse('loginResponse', '❌ Format d\'email invalide', 'error');
            return;
        }

        const result = await this.authService.login(email, password);
        
        if (result.success) {
            this.showLoginSuccess(result.user);
            this.clearLoginFields();
            
            // Charger le dashboard après un délai
            setTimeout(() => {
                this.dashboardComponent.load();
            }, 1000);
        } else {
            this.showLoginError(result);
        }
    }

    // Inscription
    async register() {
        Logger.info('Tentative d\'inscription via composant');
        
        const email = UI.getValue('registerEmail');
        const password = UI.getValue('registerPassword');
        const passwordConfirm = UI.getValue('registerPasswordConfirm');
        const nickname = UI.getValue('registerNickname');
        
        // Validation des champs
        if (!email || !password || !passwordConfirm || !nickname) {
            this.showResponse('registerResponse', '❌ Veuillez remplir tous les champs requis', 'error');
            return;
        }

        if (!Validation.isEmail(email)) {
            this.showResponse('registerResponse', '❌ Format d\'email invalide', 'error');
            return;
        }

        if (!Validation.passwordsMatch(password, passwordConfirm)) {
            this.showResponse('registerResponse', '❌ Les mots de passe ne correspondent pas !', 'error');
            this.highlightPasswordMismatch();
            return;
        }

        if (!Validation.isPasswordStrong(password)) {
            this.showResponse('registerResponse', 
                '❌ Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial', 
                'error'
            );
            return;
        }

        const result = await this.authService.register(email, password, nickname);
        
        if (result.success) {
            this.showRegisterSuccess(result.user);
            this.clearRegisterFields();
            
            // Charger le dashboard après un délai
            setTimeout(() => {
                this.dashboardComponent.load();
            }, 1000);
        } else {
            this.showRegisterError(result);
        }
    }

    // Déconnexion
    async logout() {
        Logger.info('Déconnexion via composant');
        
        const result = await this.authService.logout();
        this.dashboardComponent.hide();
        
        this.showResponse('loginResponse', result.message, result.success ? 'success' : 'error');
    }

    // Test du refresh token
    async refreshToken() {
        Logger.info('Test du refresh token');
        
        const result = await this.authService.refreshToken();
        this.showResponse('loginResponse', result.message, result.success ? 'success' : 'error');
    }

    // Authentification OAuth
    oauthLogin(provider) {
        Logger.info('Connexion OAuth', { provider });
        
        if (!OAUTH_PROVIDERS[provider]) {
            this.showResponse('oauthResponse', `❌ Provider ${provider} non supporté`, 'error');
            return;
        }

        this.showResponse('oauthResponse', `🔄 Redirection vers ${OAUTH_PROVIDERS[provider].name}...`, 'info');
        
        const success = this.authService.redirectToOAuth(provider);
        if (!success) {
            this.showResponse('oauthResponse', '❌ Erreur lors de la redirection OAuth', 'error');
        }
    }

    // Validation des mots de passe en temps réel
    validatePasswords() {
        const password = UI.getValue('registerPassword');
        const passwordConfirm = UI.getValue('registerPasswordConfirm');
        
        if (passwordConfirm === '') {
            this.resetPasswordBorders();
            return;
        }
        
        if (Validation.passwordsMatch(password, passwordConfirm)) {
            UI.setBorderColor('registerPassword', '#28a745');
            UI.setBorderColor('registerPasswordConfirm', '#28a745');
        } else {
            UI.setBorderColor('registerPassword', '#f56565');
            UI.setBorderColor('registerPasswordConfirm', '#f56565');
        }
    }

    // Réinitialiser les bordures des mots de passe
    resetPasswordBorders() {
        UI.setBorderColor('registerPassword', '#ddd');
        UI.setBorderColor('registerPasswordConfirm', '#ddd');
    }

    // Mettre en évidence la non-correspondance des mots de passe
    highlightPasswordMismatch() {
        UI.setBorderColor('registerPassword', '#f56565');
        UI.setBorderColor('registerPasswordConfirm', '#f56565');
    }

    // Afficher une réponse avec style
    showResponse(elementId, message, type = 'info', details = null) {
        const colors = {
            success: '#48bb78',
            error: '#f56565',
            info: '#4299e1',
            warning: '#ed8936'
        };

        let html = `<div style="color: ${colors[type]};">${message}</div>`;
        
        if (details) {
            html += `
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; color: #4299e1;">📋 Détails techniques</summary>
                    <pre style="margin-top: 5px;">${JSON.stringify(details, null, 2)}</pre>
                </details>
            `;
        }

        UI.showElement(elementId);
        UI.setHTML(elementId, html);
    }

    // Afficher le succès de connexion
    showLoginSuccess(user) {
        const html = `
            <div style="color: #48bb78;">✅ Connexion réussie !</div>
            <div style="margin: 10px 0; padding: 10px; background: rgba(72, 187, 120, 0.1); border-radius: 5px;">
                <strong>👤 Bienvenue ${user?.nickname || 'Utilisateur'} !</strong><br>
                <small>📧 ${user?.email}</small><br>
                <small>🕒 Connecté le ${Format.datetime(new Date())}</small>
            </div>
        `;
        
        UI.showElement('loginResponse');
        UI.setHTML('loginResponse', html);
    }

    // Afficher l'erreur de connexion
    showLoginError(result) {
        let errorDetails = '';
        if (result.message && result.message.includes('Invalid credentials')) {
            errorDetails = '<br><strong>💡 Suggestion :</strong> Vérifiez votre email et mot de passe. Si vous n\'avez pas de compte, utilisez la section "Inscription".';
        }
        
        this.showResponse(
            'loginResponse',
            `❌ Erreur: ${result.message}${errorDetails}`,
            'error',
            result.details
        );
    }

    // Afficher le succès d'inscription
    showRegisterSuccess(user) {
        const html = `
            <div style="color: #48bb78;">✅ Inscription réussie !</div>
            <div style="margin: 10px 0; padding: 10px; background: rgba(72, 187, 120, 0.1); border-radius: 5px;">
                <strong>🎉 Compte créé avec succès !</strong><br>
                <strong>👤 Pseudo :</strong> ${user?.nickname}<br>
                <strong>📧 Email :</strong> ${user?.email}<br>
                <strong>🆔 ID :</strong> ${user?.id}<br>
                <small>🕒 Créé le ${Format.datetime(new Date())}</small>
            </div>
            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; border-radius: 5px; padding: 10px; margin: 10px 0;">
                <strong>💡 Prochaine étape :</strong> Votre dashboard va se charger automatiquement !
            </div>
        `;
        
        UI.showElement('registerResponse');
        UI.setHTML('registerResponse', html);
    }

    // Afficher l'erreur d'inscription
    showRegisterError(result) {
        let errorDetails = '';
        
        if (result.details && result.details.errors) {
            errorDetails = '<br><strong>Détails des erreurs :</strong><br>';
            result.details.errors.forEach(error => {
                errorDetails += `• <strong>${error.field}:</strong> ${error.message}<br>`;
            });
        } else if (result.message) {
            if (result.message.includes('Duplicate entry')) {
                errorDetails = '<br><strong>💡 Suggestion :</strong> Ce pseudo ou email existe déjà. Essayez avec d\'autres valeurs.';
            } else if (result.message.includes('nickname is reserved')) {
                errorDetails = '<br><strong>💡 Suggestion :</strong> Ce pseudo est réservé. Choisissez un autre pseudo.';
            }
        }
        
        this.showResponse(
            'registerResponse',
            `❌ Erreur: ${result.message}${errorDetails}`,
            'error',
            result.details
        );
    }

    // Vider les champs de connexion
    clearLoginFields() {
        UI.clearValue('loginEmail');
        UI.clearValue('loginPassword');
    }

    // Vider les champs d'inscription
    clearRegisterFields() {
        UI.clearValue('registerEmail');
        UI.clearValue('registerPassword');
        UI.clearValue('registerPasswordConfirm');
        UI.clearValue('registerNickname');
        this.resetPasswordBorders();
    }
}
