/**
 * Module Loader - Lazy Loading Optimisé
 * Charge les modules JavaScript de manière asynchrone pour améliorer les performances
 * @version 1.0.0
 */

class ModuleLoader {
    constructor() {
        this.loadedModules = new Map();
        this.loadingPromises = new Map();
        this.preloadedModules = new Set();
        
        // Configuration des modules avec priorités
        this.moduleConfig = {
            // Modules critiques - chargés immédiatement
            critical: [
                'auth-service',
                'utils',
                'config'
            ],
            
            // Modules haute priorité - preload
            high: [
                'auth-component',
                'dashboard-component'
            ],
            
            // Modules moyens - lazy load à la demande
            medium: [
                'server-monitor',
                'shared-utils'
            ],
            
            // Modules bas - lazy load différé
            low: [
                'docs-app',
                'content-service'
            ]
        };
        
        // Configuration des dépendances
        this.dependencies = {
            'auth-component': ['auth-service', 'utils'],
            'dashboard-component': ['auth-service', 'utils'],
            'server-monitor': ['auth-service', 'utils'],
            'docs-app': ['utils']
        };
    }

    /**
     * Initialise le module loader
     */
    async initialize() {
        console.log('🔧 Module Loader: Initialisation...');
        
        // Preload des modules haute priorité
        await this.preloadModules();
        
        // Observer les intersections pour lazy loading
        this.setupIntersectionObserver();
        
        console.log('✅ Module Loader: Initialisé avec succès');
    }

    /**
     * Preload des modules haute priorité
     */
    async preloadModules() {
        const highPriorityModules = this.moduleConfig.high;
        
        for (const moduleName of highPriorityModules) {
            try {
                this.preloadModule(moduleName);
                this.preloadedModules.add(moduleName);
            } catch (error) {
                console.warn(`⚠️ Preload failed for ${moduleName}:`, error);
            }
        }
    }

    /**
     * Preload un module sans l'exécuter
     */
    preloadModule(moduleName) {
        const link = document.createElement('link');
        link.rel = 'modulepreload';
        link.href = this.getModulePath(moduleName);
        document.head.appendChild(link);
    }

    /**
     * Charge un module de manière asynchrone
     */
    async loadModule(moduleName, options = {}) {
        const { force = false, timeout = 10000 } = options;
        
        // Vérifier si déjà chargé
        if (!force && this.loadedModules.has(moduleName)) {
            return this.loadedModules.get(moduleName);
        }
        
        // Vérifier si déjà en cours de chargement
        if (this.loadingPromises.has(moduleName)) {
            return this.loadingPromises.get(moduleName);
        }
        
        console.log(`📦 Module Loader: Chargement de ${moduleName}...`);
        
        // Créer la promesse de chargement
        const loadingPromise = this.performModuleLoad(moduleName, timeout);
        this.loadingPromises.set(moduleName, loadingPromise);
        
        try {
            const module = await loadingPromise;
            this.loadedModules.set(moduleName, module);
            this.loadingPromises.delete(moduleName);
            
            console.log(`✅ Module Loader: ${moduleName} chargé avec succès`);
            return module;
        } catch (error) {
            this.loadingPromises.delete(moduleName);
            console.error(`❌ Module Loader: Échec du chargement de ${moduleName}`, error);
            throw error;
        }
    }

    /**
     * Effectue le chargement réel du module
     */
    async performModuleLoad(moduleName, timeout) {
        // Charger les dépendances d'abord
        await this.loadDependencies(moduleName);
        
        const modulePath = this.getModulePath(moduleName);
        
        // Chargement avec timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const module = await import(modulePath);
            clearTimeout(timeoutId);
            return module;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Module ${moduleName} timeout après ${timeout}ms`);
            }
            throw error;
        }
    }

    /**
     * Charge les dépendances d'un module
     */
    async loadDependencies(moduleName) {
        const deps = this.dependencies[moduleName];
        if (!deps || deps.length === 0) return;
        
        console.log(`🔗 Module Loader: Chargement des dépendances de ${moduleName}:`, deps);
        
        const loadPromises = deps.map(dep => this.loadModule(dep));
        await Promise.all(loadPromises);
    }

    /**
     * Génère le chemin du module
     */
    getModulePath(moduleName) {
        // Mapping des noms de modules vers les chemins
        const pathMap = {
            'auth-service': '/js/auth-service.js',
            'auth-component': '/js/auth-component.js',
            'dashboard-component': '/js/dashboard-component.js',
            'server-monitor': '/js/server-monitor.js',
            'shared-utils': '/js/shared-utils.js',
            'utils': '/js/utils.js',
            'config': '/js/config.js',
            'docs-app': '/docs/js/docs-app.js',
            'content-service': '/docs/js/content-service.js'
        };
        
        return pathMap[moduleName] || `/js/${moduleName}.js`;
    }

    /**
     * Charge plusieurs modules en parallèle
     */
    async loadModules(moduleNames, options = {}) {
        const loadPromises = moduleNames.map(name => this.loadModule(name, options));
        return Promise.all(loadPromises);
    }

    /**
     * Configuration de l'Intersection Observer pour lazy loading
     */
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const moduleName = entry.target.dataset.lazyModule;
                    if (moduleName) {
                        this.loadModule(moduleName);
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
        
        // Observer les éléments avec data-lazy-module
        const lazyElements = document.querySelectorAll('[data-lazy-module]');
        lazyElements.forEach(el => observer.observe(el));
        
        // Observer pour les nouveaux éléments
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        const lazyElements = node.querySelectorAll('[data-lazy-module]');
                        lazyElements.forEach(el => observer.observe(el));
                    }
                });
            });
        });
        
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Précharge tous les modules selon leur priorité
     */
    async preloadByPriority() {
        const { critical, high, medium } = this.moduleConfig;
        
        // Modules critiques - immédiatement
        await this.loadModules(critical);
        
        // Modules haute priorité - après un court délai
        setTimeout(() => this.loadModules(high), 100);
        
        // Modules moyens - après une pause plus longue
        setTimeout(() => this.loadModules(medium), 1000);
    }

    /**
     * Obtient les statistiques des modules chargés
     */
    getStats() {
        return {
            loaded: this.loadedModules.size,
            loading: this.loadingPromises.size,
            preloaded: this.preloadedModules.size,
            loadedModules: Array.from(this.loadedModules.keys()),
            loadingModules: Array.from(this.loadingPromises.keys()),
            preloadedModules: Array.from(this.preloadedModules)
        };
    }

    /**
     * Recharge un module
     */
    async reloadModule(moduleName) {
        this.loadedModules.delete(moduleName);
        return this.loadModule(moduleName, { force: true });
    }

    /**
     * Décharge un module
     */
    unloadModule(moduleName) {
        this.loadedModules.delete(moduleName);
        this.loadingPromises.delete(moduleName);
        console.log(`🗑️ Module Loader: ${moduleName} déchargé`);
    }
}

// Instance globale
const moduleLoader = new ModuleLoader();

// Export pour ES6 modules
export { ModuleLoader, moduleLoader };

// Exposition globale pour compatibilité
window.ModuleLoader = ModuleLoader;
window.moduleLoader = moduleLoader;

console.log('🎯 Module Loader configuré et prêt !');
