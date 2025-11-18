// Configuration pour la documentation
export const DOCS_CONFIG = {
    CONTENT_PATH: './content/',
    TABS: {
        ARCHITECTURE: 'architecture',
        DEVELOPERS: 'developers',
        API: 'api',
        OPENAPI: 'openapi',
        COMPONENTS: 'components',
        TOAST: 'toast',
        SECURITY: 'security',
        DEPLOYMENT: 'deployment',
        TESTS: 'tests',
        PERFORMANCE: 'performance',
        INTEGRATION: 'integration',
        SCRIPTS: 'scripts'
    },
    ANIMATION_DURATION: 300,
    SEARCH_DEBOUNCE: 300
};

export const CONTENT_SOURCES = {
    [DOCS_CONFIG.TABS.ARCHITECTURE]: 'architecture.html',
    [DOCS_CONFIG.TABS.DEVELOPERS]: 'developers.html',
    [DOCS_CONFIG.TABS.API]: 'api-reference.html',
    [DOCS_CONFIG.TABS.OPENAPI]: 'openapi-spec.html',
    [DOCS_CONFIG.TABS.COMPONENTS]: 'components.html',
    [DOCS_CONFIG.TABS.TOAST]: 'toast-system.html',
    [DOCS_CONFIG.TABS.SECURITY]: 'security.html',
    [DOCS_CONFIG.TABS.DEPLOYMENT]: 'deployment.html',
    [DOCS_CONFIG.TABS.TESTS]: 'tests.html',
    [DOCS_CONFIG.TABS.PERFORMANCE]: 'performance.html',
    [DOCS_CONFIG.TABS.INTEGRATION]: 'integration.html',
    [DOCS_CONFIG.TABS.SCRIPTS]: 'scripts.html'
};

export const MESSAGES = {
    LOADING: 'Chargement du contenu...',
    ERROR: 'Erreur lors du chargement du contenu',
    COPIED: 'Code copié dans le presse-papier !',
    SEARCH_PLACEHOLDER: 'Rechercher dans la documentation...'
};
