// dashboard.js
// Composant Dashboard avec onglets Profil / Comptes lies / Fusion
// Version 2.0 — settings page

import { UI, Format, Storage, HTTP } from './utils.js';
import { DEFAULT_AVATARS, STORAGE_KEYS, API_CONFIG, OAUTH_PROVIDERS } from './config.js';

const TABS = [
    { id: 'profile', label: 'Profil', icon: '' },
    { id: 'accounts', label: 'Comptes lies', icon: '' },
    { id: 'merge', label: 'Fusionner', icon: '' }
];

export class Dashboard {
    constructor(authService) {
        this.authService = authService;
        this.currentUser = null;
        this.avatarOptionsCache = null;
        this.userCache = { data: null, timestamp: null, ttl: 5 * 60 * 1000 };
        this.activeTab = 'profile';
        this.linkedAccounts = [];
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
            UI.setHTML('userInfo', '<div class="loading">Chargement...</div>');
            const result = await this.authService.getCurrentUser();
            const userData = result.data || result.user;
            if (result.success && userData) {
                this.updateUserCache(userData);
                this.show(userData);
                this.ensureVisible();
                this.hideLoading();
            } else {
                this.showError('Impossible de charger le dashboard.<br>Verifiez votre connexion ou reconnectez-vous.');
                this.hideLoading();
            }
        } catch (e) {
            this.showError('Impossible de charger le dashboard.<br>Verifiez votre connexion ou reconnectez-vous.');
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
        this.linkedAccounts = userData.linkedAccounts || [];
    }

    show(userData) {
        if (!userData) return;
        UI.showElement('userDashboard');
        UI.setHTML('userInfo', this.generateDashboardHTML(userData));
        this.bindEvents();
        this.switchTab(this.activeTab);
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

    // --- HTML Generation ---

    generateDashboardHTML(userData) {
        if (!userData) return '<div class="error">Aucune donnee utilisateur a afficher.</div>';
        return `
            ${this.generateTabs()}
            <div class="tab-content" id="tabContent">
                <div class="tab-pane" id="tab-profile">
                    ${this.generateUserProfile(userData)}
                    ${this.generateAvatarTestSection()}
                    ${this.generateUserStats(userData)}
                </div>
                <div class="tab-pane" id="tab-accounts" style="display:none;">
                    ${this.generateAccountsSection()}
                </div>
                <div class="tab-pane" id="tab-merge" style="display:none;">
                    ${this.generateMergeSection()}
                </div>
            </div>
        `;
    }

    generateTabs() {
        const tabs = TABS.map(tab => {
            const activeClass = tab.id === this.activeTab ? 'tab-active' : '';
            return `<button class="tab-btn ${activeClass}" data-action="switch-tab" data-tab="${tab.id}">${tab.icon} ${tab.label}</button>`;
        }).join('');
        return `<div class="dashboard-tabs">${tabs}</div>`;
    }

    generateUserProfile(userData) {
        const avatarLetter = Format.avatarLetter(userData.nickname || userData.email);
        const savedAvatar = Storage.get(STORAGE_KEYS.USER_AVATAR);
        const avatarUrl = savedAvatar || `https://via.placeholder.com/120?text=${avatarLetter}`;
        return `
            <div class="user-profile">
                <img id="userProfileImg" src="${avatarUrl}" alt="Avatar" class="user-profile-img" data-action="select-avatar">
                <div class="user-basic-info">
                    <h3>${userData.nickname || userData.email || 'Utilisateur'}</h3>
                    <p>${userData.email || 'Email non defini'}</p>
                    <p>${userData.emailVerified ? 'Email verifie' : 'Email non verifie'}</p>
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
                <div class="stat-card"><h5>Membre depuis</h5><p>${createdDate}</p></div>
                <div class="stat-card"><h5>Derniere connexion</h5><p>${lastLoginDate}</p></div>
                <div class="stat-card"><h5>Connexions totales</h5><p>${totalConnections}</p></div>
                <div class="stat-card"><h5>Comptes lies</h5><p>${linkedAccountsCount}</p></div>
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
                <h4>Test d'avatars :</h4>
                <div class="avatar-options">${this.generateAvatarOptionsHTML()}</div>
            </div>
        `;
    }

    generateAccountsSection() {
        const providers = Object.entries(OAUTH_PROVIDERS);
        const linked = this.linkedAccounts;
        const linkedProviders = linked.map(a => a.provider);

        const providerCards = providers.map(([key, config]) => {
            const isLinked = linkedProviders.includes(key);
            const account = linked.find(a => a.provider === key);
            const statusClass = isLinked ? 'provider-status-linked' : 'provider-status-unlinked';
            const statusText = isLinked ? 'Lie' : 'Non lie';
            const displayName = account ? (account.displayName || account.providerUserId || '') : '';

            let actionBtn;
            if (isLinked) {
                actionBtn = `<button class="btn btn-danger btn-sm" data-action="unlink-provider" data-provider="${key}">Delier</button>`;
            } else {
                actionBtn = `<button class="btn btn-sm oauth-btn ${config.name.toLowerCase() === 'google' ? 'oauth-google-link' : `oauth-${key}`}" data-action="link-provider" data-provider="${key}">Lier</button>`;
            }

            return `
                <div class="settings-provider-card">
                    <div class="settings-provider-info">
                        <span class="settings-provider-icon oauth-${key}-icon">${config.icon}</span>
                        <div class="settings-provider-details">
                            <strong>${config.name}</strong>
                            ${displayName ? `<small>${displayName}</small>` : ''}
                        </div>
                    </div>
                    <div class="settings-provider-actions">
                        <span class="provider-status ${statusClass}">${statusText}</span>
                        ${actionBtn}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="settings-accounts-section">
                <h4>Comptes OAuth lies</h4>
                <p class="settings-subtitle">Gerez les comptes sociaux lies a votre profil.</p>
                <div class="settings-providers-list">
                    ${providerCards}
                </div>
            </div>
        `;
    }

    generateMergeSection() {
        return `
            <div class="settings-merge-section">
                <h4>Fusionner un compte</h4>
                <p class="settings-subtitle">Absorbez un autre compte dans celui-ci. Les comptes OAuth et l'historique de l'autre compte seront transferes.</p>
                <div class="merge-flow">
                    <div class="merge-steps">
                        <p><strong>1.</strong> Connectez-vous a l'autre compte dans un navigateur prive</p>
                        <p><strong>2.</strong> Copiez son access token depuis le localStorage</p>
                        <p><strong>3.</strong> Collez-le ci-dessous et lancez la fusion</p>
                    </div>
                    <div class="merge-input-group">
                        <input type="text" id="mergeTargetToken" class="merge-input" placeholder="Access token du compte a absorber">
                        <button class="btn btn-primary" data-action="merge-account">Fusionner</button>
                    </div>
                    <div id="mergeFeedback" class="merge-feedback" style="display:none;"></div>
                </div>
            </div>
        `;
    }

    // --- Tab switching ---

    switchTab(tabId) {
        this.activeTab = tabId;
        // Update tab buttons
        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('tab-active', btn.getAttribute('data-tab') === tabId);
        });
        // Update tab panes
        const panes = document.querySelectorAll('.tab-pane');
        panes.forEach(pane => {
            pane.style.display = pane.id === `tab-${tabId}` ? 'block' : 'none';
        });
    }

    // --- Event handling ---

    bindEvents() {
        const userInfo = document.getElementById('userInfo');
        if (!userInfo) return;
        userInfo.onclick = (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.getAttribute('data-action');

            switch (action) {
                case 'switch-tab':
                    this.switchTab(target.getAttribute('data-tab'));
                    break;
                case 'select-avatar':
                    this.selectAvatar();
                    break;
                case 'set-avatar': {
                    const url = target.getAttribute('data-avatar-url');
                    if (url) this.updateAvatar(url);
                    break;
                }
                case 'disconnect-provider':
                case 'unlink-provider': {
                    const provider = target.getAttribute('data-provider');
                    this.unlinkProvider(provider);
                    break;
                }
                case 'link-provider': {
                    const provider = target.getAttribute('data-provider');
                    this.linkProvider(provider);
                    break;
                }
                case 'oauth-login': {
                    const provider = target.getAttribute('data-provider');
                    if (provider && this.authService && typeof this.authService.redirectToOAuth === 'function') {
                        this.authService.redirectToOAuth(provider);
                    }
                    break;
                }
                case 'merge-account':
                    this.mergeAccount();
                    break;
            }
        };
    }

    // --- Actions ---

    updateAvatar(newAvatarUrl) {
        const avatarImg = document.getElementById('userProfileImg');
        if (avatarImg) {
            avatarImg.src = newAvatarUrl;
            Storage.set(STORAGE_KEYS.USER_AVATAR, newAvatarUrl);
            this.showFeedback('Avatar mis a jour !', 'success');
        }
    }

    selectAvatar() {
        alert('Fonctionnalite de telechargement d\'avatar en developpement !\n\nPour le moment, utilisez les avatars de test ci-dessous.');
    }

    async linkProvider(provider) {
        this.showFeedback(`Redirection vers ${Format.capitalize(provider)}...`, 'info');
        try {
            const accessToken = Storage.getAccessToken();
            const baseUrl = API_CONFIG.BASE_URL;
            const response = await HTTP.post(
                `${baseUrl}${API_CONFIG.ENDPOINTS.OAUTH.LINK}/${provider}/link`,
                {},
                accessToken
            );
            if (response.ok && response.data.success && response.data.data?.authUrl) {
                window.location.href = response.data.data.authUrl;
            } else {
                this.showFeedback(response.data.message || 'Erreur lors de la liaison', 'error');
            }
        } catch (e) {
            this.showFeedback('Erreur technique lors de la liaison', 'error');
        }
    }

    async unlinkProvider(provider) {
        if (!confirm(`Delier votre compte ${Format.capitalize(provider)} ?`)) return;
        this.showFeedback(`Deliaison de ${Format.capitalize(provider)}...`, 'info');
        try {
            const accessToken = Storage.getAccessToken();
            const baseUrl = API_CONFIG.BASE_URL;
            const response = await HTTP.delete(
                `${baseUrl}${API_CONFIG.ENDPOINTS.OAUTH.UNLINK}/${provider}/unlink`,
                accessToken
            );
            if (response.ok && response.data.success) {
                this.showFeedback('Compte delie avec succes !', 'success');
                this.invalidateUserCache();
                await this.load();
                this.switchTab('accounts');
            } else {
                this.showFeedback(response.data.message || 'Erreur lors de la deliaison', 'error');
            }
        } catch (e) {
            this.showFeedback('Erreur technique lors de la deliaison', 'error');
        }
    }

    async mergeAccount() {
        const tokenInput = document.getElementById('mergeTargetToken');
        const feedbackEl = document.getElementById('mergeFeedback');
        if (!tokenInput || !tokenInput.value.trim()) {
            this.showMergeFeedback('Veuillez entrer le token du compte a fusionner.', 'error');
            return;
        }
        const targetToken = tokenInput.value.trim();
        if (!confirm('Cette action est irreversible. Le compte cible sera absorbe dans votre compte actuel. Continuer ?')) return;

        this.showMergeFeedback('Fusion en cours...', 'info');
        try {
            const accessToken = Storage.getAccessToken();
            const baseUrl = API_CONFIG.BASE_URL;
            const response = await HTTP.post(
                `${baseUrl}${API_CONFIG.ENDPOINTS.OAUTH.MERGE}`,
                { targetToken },
                accessToken
            );
            if (response.ok && response.data.success) {
                this.showMergeFeedback('Fusion reussie ! Les comptes ont ete fusionnes.', 'success');
                tokenInput.value = '';
                this.invalidateUserCache();
                await this.load();
                this.switchTab('accounts');
            } else {
                this.showMergeFeedback(response.data.message || 'Erreur lors de la fusion', 'error');
            }
        } catch (e) {
            this.showMergeFeedback('Erreur technique lors de la fusion', 'error');
        }
    }

    // --- Feedback ---

    showFeedback(message, type = 'info') {
        const colors = { success: '#48bb78', error: '#f56565', info: '#4299e1', warning: '#ed8936' };
        UI.showElement('dashboardResponse');
        UI.setHTML('dashboardResponse', `<div style="color: ${colors[type]};">${message}</div>`);
        if (type === 'success' || type === 'error') {
            setTimeout(() => { UI.hideElement('dashboardResponse'); }, 3000);
        }
    }

    showMergeFeedback(message, type = 'info') {
        const feedbackEl = document.getElementById('mergeFeedback');
        if (!feedbackEl) return;
        const colors = { success: '#48bb78', error: '#f56565', info: '#4299e1' };
        feedbackEl.style.display = 'block';
        feedbackEl.style.color = colors[type] || colors.info;
        feedbackEl.textContent = message;
        if (type === 'success' || type === 'error') {
            setTimeout(() => { feedbackEl.style.display = 'none'; }, 5000);
        }
    }

    invalidateUserCache() {
        this.userCache.data = null;
        this.userCache.timestamp = null;
    }
}
