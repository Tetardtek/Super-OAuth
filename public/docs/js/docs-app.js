// Application principale de la documentation modulaire
import { ContentService } from './content-service.js';
import { TabManager } from './tab-manager.js';
import { DOCS_CONFIG, MESSAGES } from './config.js';
import { DocsUtils } from './utils.js';

class DocsApp {
    constructor() {
        this.contentService = new ContentService();
        this.tabManager = null;
        this.isInitialized = false;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('🚀 Initialisation de la documentation modulaire...');
            
            // Initialisation des services
            await this.initializeServices();
            
            // Chargement du contenu initial
            await this.loadInitialContent();
            
            // Configuration des fonctionnalités
            this.setupGlobalFeatures();
            
            // Préchargement en arrière-plan
            this.preloadContent();
            
            this.isInitialized = true;
            console.log('✅ Documentation initialisée avec succès');
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.showInitializationError(error);
        }
    }
    
    async initializeServices() {
        // Initialisation du gestionnaire d'onglets
        this.tabManager = new TabManager(this.contentService);
        
        // Configuration de la navigation clavier
        this.tabManager.setupKeyboardNavigation();
        
        // Note: OAuth tester est maintenant chargé globalement via oauth-tester.js
        console.log('OAuth Tester functions available:', {
            testOAuthProviders: typeof window.testOAuthProviders,
            testOAuthProvider: typeof window.testOAuthProvider,
            testAllOAuth: typeof window.testAllOAuth
        });
    }
    
    async loadInitialContent() {
        // Charger le contenu de l'onglet par défaut
        await this.contentService.loadTabContent(DOCS_CONFIG.TABS.ARCHITECTURE);
    }
    
    setupGlobalFeatures() {
        // Mise à jour de la date
        this.updateLastUpdateDate();
        
        // Configuration du scroll smoothe global
        this.setupSmoothScrolling();
        
        // Gestion des erreurs globales
        this.setupErrorHandling();
        
        // Raccourcis clavier
        this.setupKeyboardShortcuts();
        
        // Responsive improvements
        this.setupResponsiveFeatures();
        
        // Configuration des boutons de démonstration des toasts
        this.setupToastDemos();
    }
    
    updateLastUpdateDate() {
        const lastUpdateElement = document.getElementById('lastUpdate');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }
    
    setupSmoothScrolling() {
        // Améliorer le scroll smoothe pour tous les liens d'ancre
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (link) {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);
                
                if (target) {
                    DocsUtils.smoothScrollTo(target);
                }
            }
        });
    }
    
    setupErrorHandling() {
        // Gestion des erreurs globales
        window.addEventListener('error', (e) => {
            console.error('Erreur globale:', e.error);
            DocsUtils.showFeedback('Une erreur inattendue s\'est produite', 'error');
        });
        
        // Gestion des promesses rejetées
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Promise rejetée:', e.reason);
            DocsUtils.showFeedback('Erreur de chargement', 'error');
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K pour la recherche
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchBox = document.querySelector('.search-box');
                if (searchBox) {
                    searchBox.focus();
                }
            }
            
            // Échap pour fermer les éléments
            if (e.key === 'Escape') {
                // Supprimer les highlights de recherche
                const container = document.querySelector('.tab-pane.active');
                if (container) {
                    DocsUtils.highlightSearchTerms(container, '');
                }
                
                // Vider la recherche
                const searchBox = document.querySelector('.search-box');
                if (searchBox && searchBox === document.activeElement) {
                    searchBox.value = '';
                    searchBox.blur();
                }
            }
        });
    }
    
    setupResponsiveFeatures() {
        // Détection du changement d'orientation mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // Recalculer les positions après rotation
                window.scrollTo(0, 0);
            }, 100);
        });
        
        // Optimisation tactile
        if ('ontouchstart' in window) {
            document.body.classList.add('touch-device');
        }
    }
    
    async preloadContent() {
        // Préchargement des autres onglets en arrière-plan
        setTimeout(async () => {
            try {
                await this.contentService.preloadAllContent();
                console.log('📦 Contenu préchargé avec succès');
            } catch (error) {
                console.warn('⚠️ Erreur lors du préchargement:', error);
            }
        }, 1000);
    }
    
    showInitializationError(error) {
        const container = document.querySelector('.tab-content');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>❌ Erreur d'initialisation</h3>
                    <p>Impossible de charger la documentation.</p>
                    <p><strong>Détails:</strong> ${error.message}</p>
                    <button onclick="location.reload()" style="
                        background: var(--primary-color);
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin-top: 15px;
                    ">🔄 Recharger la page</button>
                </div>
            `;
        }
    }
    
    // Méthodes utilitaires pour l'extension
    addCustomTab(tabName, tabLabel, contentUrl) {
        // Possibilité d'ajouter des onglets dynamiquement
        DOCS_CONFIG.TABS[tabName.toUpperCase()] = tabName;
        CONTENT_SOURCES[tabName] = contentUrl;

        // Ajouter le bouton d'onglet
        const navTabs = document.querySelector('.nav-tabs');
        const newTab = document.createElement('button');
        newTab.className = 'tab';
        newTab.dataset.tab = tabName;
        newTab.textContent = tabLabel;
        newTab.setAttribute('aria-label', tabLabel);
        newTab.setAttribute('tabindex', '0');

        navTabs.appendChild(newTab);

        // Ajouter le conteneur
        const tabContent = document.querySelector('.tab-content');
        const newPane = document.createElement('div');
        newPane.id = `tab-${tabName}`;
        newPane.className = 'tab-pane';

        tabContent.appendChild(newPane);

        // Réinitialiser les événements
        this.tabManager.bindTabEvents();
    }
    
    setupToastDemos() {
        // Configuration des boutons de démonstration des toasts
        // Utilise une approche par délégation d'événements pour gérer les boutons
        // même quand ils sont chargés dynamiquement
        document.addEventListener('click', (e) => {
            // Vérifier si le ToastManager est disponible
            if (typeof window.Toast === 'undefined') {
                console.warn('ToastManager non disponible');
                return;
            }
            
            // Gestion des boutons de démonstration
            if (e.target.id === 'demoToastSuccess') {
                e.preventDefault();
                window.Toast.success('Connexion réussie ! 🎉');
            } else if (e.target.id === 'demoToastError') {
                e.preventDefault();
                window.Toast.error('Erreur de connexion ❌');
            } else if (e.target.id === 'demoToastWarning') {
                e.preventDefault();
                window.Toast.warning('Attention aux données ⚠️');
            } else if (e.target.id === 'demoToastInfo') {
                e.preventDefault();
                window.Toast.info('Information importante ℹ️');
            }
        });
        
        // Vérifier périodiquement si les boutons sont présents et les configurer
        const checkToastButtons = () => {
            const buttons = document.querySelectorAll('[id^="demoToast"]');
            if (buttons.length > 0 && typeof window.Toast !== 'undefined') {
                console.log('✅ Boutons de démonstration des toasts configurés');
                return true;
            }
            return false;
        };
        
        // Vérification initiale et périodique
        if (!checkToastButtons()) {
            const interval = setInterval(() => {
                if (checkToastButtons()) {
                    clearInterval(interval);
                }
            }, 1000);
            
            // Arrêter après 10 secondes pour éviter les fuites mémoire
            setTimeout(() => clearInterval(interval), 10000);
        }
    }
    
    // API publique
    switchToTab(tabName) {
        return this.tabManager.switchTo(tabName);
    }
    
    searchInCurrentTab(searchTerm) {
        const container = document.querySelector('.tab-pane.active');
        if (container) {
            DocsUtils.highlightSearchTerms(container, searchTerm);
        }
    }
}

// Initialisation automatique au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    window.docsApp = new DocsApp();
    window.docsApp.init();
});

// Export pour utilisation externe
export { DocsApp };
