// Gestion des onglets de navigation
import { DOCS_CONFIG } from './config.js';
import { DocsUtils } from './utils.js';

export class TabManager {
    constructor(contentService) {
        this.contentService = contentService;
        this.activeTab = DOCS_CONFIG.TABS.ARCHITECTURE;
        this.init();
    }
    
    init() {
        this.bindTabEvents();
        this.updateTabStates();
        this.setupTabScroll();
    }
    
    // Liaison des événements sur les onglets
    bindTabEvents() {
        const tabs = document.querySelectorAll('.tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', async (e) => {
                e.preventDefault();
                const tabName = tab.dataset.tab;
                
                if (tabName && tabName !== this.activeTab) {
                    await this.switchTo(tabName);
                }
            });
            
            // Effet hover amélioré
            tab.addEventListener('mouseenter', () => {
                if (!tab.classList.contains('active')) {
                    tab.style.transform = 'translateY(-2px)';
                }
            });
            
            tab.addEventListener('mouseleave', () => {
                if (!tab.classList.contains('active')) {
                    tab.style.transform = 'translateY(0)';
                }
            });
        });
    }
    
    // Changement d'onglet avec animation
    async switchTo(tabName) {
        if (!Object.values(DOCS_CONFIG.TABS).includes(tabName)) {
            console.error(`Onglet invalide: ${tabName}`);
            return;
        }
        
        // Désactiver temporairement les clics
        this.setTabsInteractive(false);
        
        try {
            // Animation de sortie de l'onglet actuel
            const currentPane = document.getElementById(`tab-${this.activeTab}`);
            if (currentPane) {
                await this.animateTabOut(currentPane);
            }
            
            // Changer l'état des boutons
            this.updateTabButton(this.activeTab, false);
            this.updateTabButton(tabName, true);
            
            // Charger le nouveau contenu
            await this.contentService.switchTab(tabName);
            
            // Animation d'entrée du nouvel onglet
            const newPane = document.getElementById(`tab-${tabName}`);
            if (newPane) {
                await this.animateTabIn(newPane);
            }
            
            this.activeTab = tabName;
            
            // Scroll vers l'onglet actif si nécessaire
            if (this.scrollToActiveTab) {
                this.scrollToActiveTab();
            }
            
        } catch (error) {
            console.error('Erreur lors du changement d\'onglet:', error);
            DocsUtils.showFeedback('Erreur lors du changement d\'onglet', 'error');
        } finally {
            // Réactiver les clics
            this.setTabsInteractive(true);
        }
    }
    
    // Animation de sortie d'onglet
    animateTabOut(pane) {
        return new Promise(resolve => {
            pane.style.transition = `opacity ${DOCS_CONFIG.ANIMATION_DURATION}ms ease`;
            pane.style.opacity = '0';
            
            setTimeout(() => {
                pane.classList.remove('active');
                resolve();
            }, DOCS_CONFIG.ANIMATION_DURATION);
        });
    }
    
    // Animation d'entrée d'onglet
    animateTabIn(pane) {
        return new Promise(resolve => {
            pane.classList.add('active');
            pane.style.opacity = '0';
            pane.style.transition = `opacity ${DOCS_CONFIG.ANIMATION_DURATION}ms ease`;
            
            // Force reflow
            pane.offsetHeight;
            
            pane.style.opacity = '1';
            
            setTimeout(resolve, DOCS_CONFIG.ANIMATION_DURATION);
        });
    }
    
    // Mise à jour de l'état d'un bouton d'onglet
    updateTabButton(tabName, isActive) {
        const button = document.querySelector(`[data-tab="${tabName}"]`);
        if (button) {
            if (isActive) {
                button.classList.add('active');
                button.style.transform = 'translateY(0)';
            } else {
                button.classList.remove('active');
            }
        }
    }
    
    // Activation/désactivation de l'interactivité des onglets
    setTabsInteractive(interactive) {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.style.pointerEvents = interactive ? 'auto' : 'none';
            if (!interactive) {
                tab.style.opacity = '0.7';
            } else {
                tab.style.opacity = '1';
            }
        });
    }
    
    // Mise à jour de tous les états d'onglets
    updateTabStates() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            const tabName = tab.dataset.tab;
            this.updateTabButton(tabName, tabName === this.activeTab);
        });
    }
    
    // Configuration du scroll horizontal pour les onglets
    setupTabScroll() {
        const navTabs = document.querySelector('.nav-tabs');
        const tabsContainer = document.querySelector('.tabs-container');
        const prevBtn = document.getElementById('navPrev');
        const nextBtn = document.getElementById('navNext');
        
        if (!navTabs || !tabsContainer) return;
        
        // Vérifie si le scroll est nécessaire
        const checkScrollNeeded = () => {
            const isScrollable = navTabs.scrollWidth > navTabs.clientWidth;
            tabsContainer.classList.toggle('scrollable', isScrollable);
            navTabs.classList.toggle('scrollable', isScrollable);
            
            // Masque le texte d'aide si pas de scroll nécessaire
            if (!isScrollable) {
                tabsContainer.style.setProperty('--show-help', 'none');
            } else {
                tabsContainer.style.removeProperty('--show-help');
            }
            
            // Met à jour l'état des boutons
            updateNavButtons();
        };
        
        // Met à jour l'état des boutons de navigation
        const updateNavButtons = () => {
            if (!prevBtn || !nextBtn) return;
            
            const isAtStart = navTabs.scrollLeft <= 0;
            const isAtEnd = navTabs.scrollLeft >= navTabs.scrollWidth - navTabs.clientWidth;
            
            prevBtn.disabled = isAtStart;
            nextBtn.disabled = isAtEnd;
        };
        
        // Gestion des boutons de navigation
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                navTabs.scrollBy({ left: -200, behavior: 'smooth' });
                setTimeout(updateNavButtons, 300);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                navTabs.scrollBy({ left: 200, behavior: 'smooth' });
                setTimeout(updateNavButtons, 300);
            });
        }
        
        // Écouteur de scroll pour mettre à jour les boutons
        navTabs.addEventListener('scroll', updateNavButtons);
        
        // Vérification initiale et au redimensionnement
        checkScrollNeeded();
        window.addEventListener('resize', checkScrollNeeded);
        
        // Navigation au clavier pour le scroll
        navTabs.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                navTabs.scrollBy({ left: -100, behavior: 'smooth' });
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                navTabs.scrollBy({ left: 100, behavior: 'smooth' });
                e.preventDefault();
            }
        });
        
        // Scroll automatique vers l'onglet actif
        this.scrollToActiveTab = () => {
            const activeTab = navTabs.querySelector('.tab.active');
            if (activeTab) {
                const tabRect = activeTab.getBoundingClientRect();
                const containerRect = navTabs.getBoundingClientRect();
                
                if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
                    activeTab.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'nearest',
                        inline: 'center'
                    });
                }
                setTimeout(updateNavButtons, 300);
            }
        };
    }
    
    // Navigation par clavier
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Navigation avec les flèches gauche/droite
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const tabs = Object.values(DOCS_CONFIG.TABS);
                const currentIndex = tabs.indexOf(this.activeTab);
                
                let newIndex;
                if (e.key === 'ArrowLeft') {
                    newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
                } else {
                    newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
                }
                
                this.switchTo(tabs[newIndex]);
                e.preventDefault();
            }
        });
    }
}
