// Service de gestion du contenu de la documentation
import { DOCS_CONFIG, CONTENT_SOURCES, MESSAGES } from './config.js';
import { DocsUtils } from './utils.js';

export class ContentService {
    constructor() {
        this.cache = new Map();
        this.currentTab = DOCS_CONFIG.TABS.ARCHITECTURE;
    }
    
    // Chargement du contenu d'un onglet
    async loadTabContent(tabName) {
        const container = document.getElementById(`tab-${tabName}`);
        if (!container) return;
        
        // Mettre à jour l'onglet actuel
        this.currentTab = tabName;
        
        // Vérifier le cache
        if (this.cache.has(tabName)) {
            container.innerHTML = this.cache.get(tabName);
            this.initializeTabFeatures(container);
            return;
        }
        
        // Afficher le loading
        DocsUtils.showLoading(container, MESSAGES.LOADING);
        
        try {
            const contentFile = CONTENT_SOURCES[tabName];
            if (!contentFile) {
                throw new Error(`Contenu non trouvé pour l'onglet: ${tabName}`);
            }
            
            const content = await DocsUtils.fetchContent(`${DOCS_CONFIG.CONTENT_PATH}${contentFile}`);
            
            // Mettre en cache et afficher
            this.cache.set(tabName, content);
            container.innerHTML = content;
            
            // Initialiser les fonctionnalités
            this.initializeTabFeatures(container);
            
        } catch (error) {
            console.error('Erreur lors du chargement du contenu:', error);
            DocsUtils.showError(container, `${MESSAGES.ERROR}: ${error.message}`);
        }
    }
    
    // Initialisation des fonctionnalités spécifiques à chaque onglet
    initializeTabFeatures(container) {
        // Copie des blocs de code
        this.initializeCodeBlocks(container);
        
        // Accordéons pour l'onglet tests
        this.initializeAccordions(container);
        
        // Navigation interne
        this.initializeInternalNavigation(container);
        
        // Recherche dans le contenu
        this.initializeSearch(container);
        
        // Fonctionnalités OAuth pour l'onglet intégration
        if (this.currentTab === 'integration') {
            this.initializeOAuthFeatures(container);
        }
    }
    
    // Gestion de la copie des blocs de code
    initializeCodeBlocks(container) {
        const codeBlocks = container.querySelectorAll('.code-block');
        
        codeBlocks.forEach(block => {
            block.addEventListener('click', async () => {
                const text = block.textContent.replace('📋 Cliquer pour copier\n', '');
                const success = await DocsUtils.copyToClipboard(text);
                
                if (success) {
                    DocsUtils.showFeedback(MESSAGES.COPIED);
                    
                    // Animation visuelle
                    const originalBg = block.style.background;
                    block.style.background = '#4a5568';
                    setTimeout(() => {
                        block.style.background = originalBg;
                    }, 200);
                }
            });
        });
    }
    
    // Gestion des accordéons
    initializeAccordions(container) {
        const accordionHeaders = container.querySelectorAll('.accordion-header');
        
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const accordionItem = header.parentElement;
                const isActive = accordionItem.classList.contains('active');
                
                // Fermer tous les autres accordéons
                const allItems = container.querySelectorAll('.accordion-item');
                allItems.forEach(item => item.classList.remove('active'));
                
                // Ouvrir celui-ci si il n'était pas actif
                if (!isActive) {
                    accordionItem.classList.add('active');
                }
            });
        });
    }
    
    // Navigation interne avec ancres
    initializeInternalNavigation(container) {
        const links = container.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);
                
                if (target) {
                    DocsUtils.smoothScrollTo(target);
                }
            });
        });
    }
    
    // Recherche dans le contenu
    initializeSearch(container) {
        // Créer la barre de recherche si elle n'existe pas
        let searchBox = container.querySelector('.search-box');
        if (!searchBox) {
            searchBox = document.createElement('input');
            searchBox.type = 'text';
            searchBox.className = 'search-box';
            searchBox.placeholder = MESSAGES.SEARCH_PLACEHOLDER;
            
            // Insérer au début du contenu
            const firstChild = container.firstElementChild;
            if (firstChild) {
                container.insertBefore(searchBox, firstChild);
            }
        }
        
        // Fonctionnalité de recherche avec debounce
        const debouncedSearch = DocsUtils.debounce((searchTerm) => {
            DocsUtils.highlightSearchTerms(container, searchTerm);
        }, DOCS_CONFIG.SEARCH_DEBOUNCE);
        
        searchBox.addEventListener('input', (e) => {
            debouncedSearch(e.target.value.trim());
        });
    }
    
    // Initialisation des fonctionnalités OAuth pour l'onglet intégration
    initializeOAuthFeatures(container) {
        console.log('🔧 Initializing OAuth features for integration tab...');
        
        // Vérifier que les fonctions OAuth sont disponibles
        const oauthAvailable = typeof window.testOAuthProviders === 'function';
        console.log('OAuth functions available:', {
            testOAuthProviders: typeof window.testOAuthProviders,
            testOAuthProvider: typeof window.testOAuthProvider,
            testAllOAuth: typeof window.testAllOAuth
        });
        
        if (!oauthAvailable) {
            console.warn('OAuth functions not available, trying to re-initialize...');
            // Donner un peu de temps pour que oauth-tester.js se charge
            setTimeout(() => {
                this.initializeOAuthFeatures(container);
            }, 200);
            return;
        }
        
        // Trouver tous les boutons OAuth et attacher les événements
        const oauthButtons = container.querySelectorAll('[onclick*="testOAuth"]');
        console.log(`Found ${oauthButtons.length} OAuth test buttons`);
        
        oauthButtons.forEach(button => {
            // Supprimer l'attribut onclick existant et ajouter un gestionnaire d'événement moderne
            const onclickContent = button.getAttribute('onclick');
            console.log('Original onclick:', onclickContent);
            
            // Extraire le nom de la fonction et les paramètres
            if (onclickContent) {
                button.removeAttribute('onclick');
                
                // Attacher le nouvel événement avec parsing manuel au lieu d'eval
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log('OAuth button clicked:', onclickContent);
                    
                    try {
                        // Parser manuellement au lieu d'utiliser eval pour éviter CSP
                        if (onclickContent.includes('testOAuthProviders()')) {
                            if (typeof window.testOAuthProviders === 'function') {
                                window.testOAuthProviders();
                            } else {
                                console.error('testOAuthProviders function not available');
                            }
                        } else if (onclickContent.includes('testOAuthProvider(')) {
                            // Extraire le provider entre quotes
                            const match = onclickContent.match(/testOAuthProvider\(['"]([^'"]+)['"]\)/);
                            if (match && match[1]) {
                                const provider = match[1];
                                if (typeof window.testOAuthProvider === 'function') {
                                    window.testOAuthProvider(provider);
                                } else {
                                    console.error('testOAuthProvider function not available');
                                }
                            }
                        } else if (onclickContent.includes('testAllOAuth()')) {
                            if (typeof window.testAllOAuth === 'function') {
                                window.testAllOAuth();
                            } else {
                                console.error('testAllOAuth function not available');
                            }
                        } else {
                            console.warn('Unknown OAuth function:', onclickContent);
                        }
                    } catch (error) {
                        console.error('Error executing OAuth function:', error);
                    }
                });
                
                console.log('✅ Event attached to button:', button.textContent.trim());
            }
        });
        
        // Alternative: attacher directement par type de bouton
        this.attachOAuthButtonEvents(container);
    }
    
    // Méthode alternative pour attacher les événements OAuth
    attachOAuthButtonEvents(container) {
        console.log('🔗 Attaching OAuth button events...');
        
        // Bouton test providers
        const providersBtn = container.querySelector('button[onclick*="testOAuthProviders"]');
        if (providersBtn) {
            providersBtn.removeAttribute('onclick');
            providersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Providers button clicked');
                if (typeof window.testOAuthProviders === 'function') {
                    window.testOAuthProviders();
                } else {
                    console.error('testOAuthProviders function not available');
                }
            });
            console.log('✅ Providers button event attached');
        }
        
        // Boutons test provider individuels
        const providerButtons = [
            { selector: 'button[onclick*="testOAuthProvider(\'discord\')"]', provider: 'discord' },
            { selector: 'button[onclick*="testOAuthProvider(\'twitch\')"]', provider: 'twitch' },
            { selector: 'button[onclick*="testOAuthProvider(\'google\')"]', provider: 'google' },
            { selector: 'button[onclick*="testOAuthProvider(\'github\')"]', provider: 'github' }
        ];
        
        providerButtons.forEach(({ selector, provider }) => {
            const btn = container.querySelector(selector);
            if (btn) {
                btn.removeAttribute('onclick');
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log(`${provider} button clicked`);
                    if (typeof window.testOAuthProvider === 'function') {
                        window.testOAuthProvider(provider);
                    } else {
                        console.error('testOAuthProvider function not available');
                    }
                });
                console.log(`✅ ${provider} button event attached`);
            }
        });
        
        // Bouton test all
        const allBtn = container.querySelector('button[onclick*="testAllOAuth"]');
        if (allBtn) {
            allBtn.removeAttribute('onclick');
            allBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Test all button clicked');
                if (typeof window.testAllOAuth === 'function') {
                    window.testAllOAuth();
                } else {
                    console.error('testAllOAuth function not available');
                }
            });
            console.log('✅ Test all button event attached');
        }
    }
    
    // Changement d'onglet
    async switchTab(newTabName) {
        if (this.currentTab === newTabName) return;
        
        // Masquer l'onglet actuel
        const currentPane = document.getElementById(`tab-${this.currentTab}`);
        const newPane = document.getElementById(`tab-${newTabName}`);
        
        if (currentPane) {
            currentPane.classList.remove('active');
        }
        
        // Charger et afficher le nouveau contenu
        if (newPane) {
            await this.loadTabContent(newTabName);
            newPane.classList.add('active');
        }
        
        this.currentTab = newTabName;
    }
    
    // Préchargement de tous les contenus
    async preloadAllContent() {
        const tabs = Object.values(DOCS_CONFIG.TABS);
        
        for (const tab of tabs) {
            if (!this.cache.has(tab)) {
                try {
                    const contentFile = CONTENT_SOURCES[tab];
                    if (contentFile) {
                        const content = await DocsUtils.fetchContent(`${DOCS_CONFIG.CONTENT_PATH}${contentFile}`);
                        this.cache.set(tab, content);
                    }
                } catch (error) {
                    console.warn(`Impossible de précharger ${tab}:`, error);
                }
            }
        }
    }
}
