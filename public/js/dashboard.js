// dashboard.js
// Composant Dashboard moderne, modulaire et robuste
// Version refondue 2025

import { UI, Format, Storage } from './utils.js';
import { DEFAULT_AVATARS, STORAGE_KEYS } from './config.js';

export class Dashboard {
    constructor(authService) {
        this.authService = authService;
        this.currentUser = null;
        this.avatarOptionsCache = null;
        this.userCache = { data: null, timestamp: null, ttl: 5 * 60 * 1000 };
    }

    async load() {
        try {
            if (this.isUserCacheValid()) {
                this.show(this.userCache.data);
                this.ensureVisible();
                this.hideLoading();
                return;
            }
            UI.showElement('userDashboard');
            UI.setHTML('userInfo', '<div class="loading">⏳ Chargement...</div>');
            const result = await this.authService.getCurrentUser();
            const userData = result.data || result.user;
            if (result.success && userData) {
                this.updateUserCache(userData);
                this.show(userData);
                this.ensureVisible();
                this.hideLoading();
            } else {
                this.showError('❌ Impossible de charger le dashboard.<br>Vérifiez votre connexion ou reconnectez-vous.');
                this.hideLoading();
            }
        } catch (e) {
            this.showError('❌ Impossible de charger le dashboard.<br>Vérifiez votre connexion ou reconnectez-vous.');
            this.hideLoading();
        }
    }

    isUserCacheValid() {
        if (!this.userCache.data || !this.userCache.timestamp) return false;
        return (Date.now() - this.userCache.timestamp) < this.userCache.ttl;
    }

    updateUserCache(userData) {
        this.userCache.data = userData;
        this.userCache.timestamp = Date.now();
        this.currentUser = userData;
    }

    show(userData) {
        if (!userData) return;
        UI.showElement('userDashboard');
        UI.setHTML('userInfo', this.generateUserInfoHTML(userData));
        this.bindEvents();
    }

    showError(message) {
        UI.showElement('userDashboard');
        UI.setHTML('userInfo', `<div class="error" style="color:#e53e3e; font-weight:bold; padding:16px; text-align:center;">${message}</div>`);
    }

    hideLoading() {
        const loadingElem = document.getElementById('userInfo');
        if (loadingElem && loadingElem.innerText.includes('Chargement')) {
            loadingElem.innerHTML = '';
        }
    }

    ensureVisible() {
        const dash = document.getElementById('userDashboard');
        if (dash) dash.style.display = 'block';
    }

    generateUserInfoHTML(userData) {
        if (!userData) return '<div class="error">Aucune donnée utilisateur à afficher.</div>';
        return `
            ${this.generateUserProfile(userData)}
            ${this.generateAvatarTestSection()}
            ${this.generateUserStats(userData)}
            ${this.generateProvidersSection(userData.linkedAccounts || [])}
            ${this.generateOAuthConnectSection()}
        `;
    }

    generateUserProfile(userData) {
        const avatarLetter = Format.avatarLetter(userData.nickname || userData.email);
        const savedAvatar = Storage.get(STORAGE_KEYS.USER_AVATAR);
        const avatarUrl = savedAvatar || `https://via.placeholder.com/120?text=${avatarLetter}`;
        return `
            <div class="user-profile">
                <img id="userProfileImg" src="${avatarUrl}" alt="Avatar" class="user-profile-img" data-action="select-avatar">
                <div class="user-basic-info">
                    <h3>👤 ${userData.nickname || userData.email || 'Utilisateur'}</h3>
                    <p>📧 ${userData.email || 'Email non défini'}</p>
                    <p>🆔 ${userData.id || 'ID non défini'}</p>
                    <p>✅ ${userData.emailVerified ? 'Email vérifié' : 'Email non vérifié'}</p>
                </div>
            </div>
        `;
    }

    generateUserStats(userData) {
        const createdDate = Format.date(userData.createdAt);
        const lastLoginDate = Format.datetime(userData.lastLogin);
        const linkedAccountsCount = userData.linkedAccounts ? userData.linkedAccounts.length : 0;
        const totalConnections = userData.totalConnections || 0;
        return `
            <div class="user-stats">
                <div class="stat-card"><h5>📅 Membre depuis</h5><p>${createdDate}</p></div>
                <div class="stat-card"><h5>🕒 Dernière connexion</h5><p>${lastLoginDate}</p></div>
                <div class="stat-card"><h5>🔢 Connexions totales</h5><p>${totalConnections}</p></div>
                <div class="stat-card"><h5>🔗 Comptes liés</h5><p>${linkedAccountsCount}</p></div>
            </div>
        `;
    }

    generateAvatarOptionsHTML() {
        if (!this.avatarOptionsCache) {
            this.avatarOptionsCache = DEFAULT_AVATARS.map((url, i) =>
                `<img src="${url}" alt="Avatar ${i + 1}" class="avatar-option" data-action="set-avatar" data-avatar-url="${url}">`
            ).join('');
        }
        return this.avatarOptionsCache;
    }

    generateAvatarTestSection() {
        return `
            <div class="avatar-test-section">
                <h4>🎨 Test d'avatars :</h4>
                <div class="avatar-options">${this.generateAvatarOptionsHTML()}</div>
            </div>
        `;
    }

    generateProvidersSection(linkedAccounts) {
        const linkedAccountsCount = linkedAccounts.length;
        let providersHTML;
        if (linkedAccountsCount > 0) {
            providersHTML = linkedAccounts.map(account => `
                <div class="provider-item">
                    <div><strong>${Format.capitalize(account.provider)}</strong><br><small>${account.providerUserId || account.displayName || 'Nom non disponible'}</small></div>
                    <button class="btn btn-danger btn-sm" data-action="disconnect-provider" data-provider="${account.provider}" data-provider-id="${account.id}">🗑️ Déconnecter</button>
                </div>
            `).join('');
        } else {
            providersHTML = `<p>🔗 Aucun compte social connecté</p><p><small>Utilisez la section OAuth ci-dessous pour connecter vos comptes</small></p>`;
        }
        return `<div class="providers-section"><h4>🌐 Comptes OAuth connectés</h4>${providersHTML}</div>`;
    }

    generateOAuthConnectSection() {
        const PROVIDERS = [
            { key: 'discord', label: 'Discord', icon: '🎮', btnClass: 'oauth-discord' },
            { key: 'twitch', label: 'Twitch', icon: '📺', btnClass: 'oauth-twitch' },
            { key: 'google', label: 'Google', icon: '📧', btnClass: 'oauth-google' },
            { key: 'github', label: 'GitHub', icon: '🐱', btnClass: 'oauth-github' }
        ];
        const linked = (this.currentUser && this.currentUser.linkedAccounts) ? this.currentUser.linkedAccounts.map(a => a.provider) : [];
        const buttons = PROVIDERS.map(p => {
            const isLinked = linked.includes(p.key);
            if (isLinked) {
                return `<button class="btn btn-danger oauth-btn ${p.btnClass}" data-action="disconnect-provider" data-provider="${p.key}"><span>${p.icon}</span> Délier ${p.label}</button>`;
            } else {
                return `<button class="btn oauth-btn ${p.btnClass}" data-action="oauth-login" data-provider="${p.key}"><span>${p.icon}</span> Lier ${p.label}</button>`;
            }
        }).join('');
        return `<div class="oauth-connect-section"><h4>🔗 Connecter un compte social</h4><div class="oauth-providers" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 10px 0 20px 0;">${buttons}</div><p style="font-size: 0.95em; color: #888;">Ajoutez ou retirez des comptes sociaux à votre profil pour une connexion simplifiée.</p></div>`;
    }
    // Event delegation pour toutes les actions du dashboard
    bindEvents() {
        const userInfo = document.getElementById('userInfo');
        if (!userInfo) return;
        userInfo.onclick = (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.getAttribute('data-action');
            if (action === 'select-avatar') {
                this.selectAvatar();
            } else if (action === 'set-avatar') {
                const url = target.getAttribute('data-avatar-url');
                if (url) this.updateAvatar(url);
            } else if (action === 'disconnect-provider') {
                const provider = target.getAttribute('data-provider');
                const providerId = target.getAttribute('data-provider-id');
                this.disconnectProvider(provider, providerId);
            } else if (action === 'oauth-login') {
                const provider = target.getAttribute('data-provider');
                if (provider && this.authService && typeof this.authService.redirectToOAuth === 'function') {
                    this.authService.redirectToOAuth(provider);
                }
            }
        };
    }

    updateAvatar(newAvatarUrl) {
        const avatarImg = document.getElementById('userProfileImg');
        if (avatarImg) {
            avatarImg.src = newAvatarUrl;
            Storage.set(STORAGE_KEYS.USER_AVATAR, newAvatarUrl);
            this.showFeedback('✅ Avatar mis à jour !', 'success');
        }
    }

    selectAvatar() {
        alert('🔧 Fonctionnalité de téléchargement d\'avatar en développement !\n\n💡 Pour le moment, utilisez les avatars de test ci-dessous.');
    }

    async disconnectProvider(provider, providerId) {
        if (!confirm(`Êtes-vous sûr de vouloir déconnecter votre compte ${Format.capitalize(provider)} ?`)) return;
        this.showFeedback(`🔄 Déconnexion du compte ${Format.capitalize(provider)}...`, 'info');
        try {
            let disconnectResult;
            if (this.authService.disconnectProvider && typeof this.authService.disconnectProvider === 'function') {
                disconnectResult = await this.authService.disconnectProvider(provider, providerId);
            } else {
                let url = providerId ? `/auth/oauth/${provider}/unlink?id=${encodeURIComponent(providerId)}` : `/auth/oauth/${provider}/unlink`;
                const response = await fetch(url, { method: 'DELETE', credentials: 'include' });
                disconnectResult = await response.json();
            }
            if (disconnectResult && disconnectResult.success) {
                this.showFeedback('✅ Compte social déconnecté !', 'success');
                this.invalidateUserCache();
                await this.load();
            } else {
                this.showFeedback((disconnectResult && disconnectResult.message) || 'Erreur lors de la déconnexion', 'error');
            }
        } catch (e) {
            this.showFeedback('Erreur technique lors de la déconnexion', 'error');
        }
    }

    showFeedback(message, type = 'info') {
        const colors = { success: '#48bb78', error: '#f56565', info: '#4299e1', warning: '#ed8936' };
        UI.showElement('dashboardResponse');
        UI.setHTML('dashboardResponse', `<div style="color: ${colors[type]};">${message}</div>`);
        if (type === 'success' || type === 'error') {
            setTimeout(() => { UI.hideElement('dashboardResponse'); }, 3000);
        }
    }

    invalidateUserCache() {
        this.userCache.data = null;
        this.userCache.timestamp = null;
    }
}
