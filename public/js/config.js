// URLs de callback OAuth2 centralisées pour chaque provider
export const OAUTH_REDIRECT_URIS = {
  discord: 'http://localhost:3000/auth/discord/callback',
  google: 'http://localhost:3000/api/v1/auth/provider/google/callback',
  github: 'http://localhost:3000/api/v1/auth/provider/github/callback',
  twitch: 'http://localhost:3000/api/v1/auth/provider/twitch/callback',
  // Ajoutez d'autres providers si besoin
};
/**
 * Configuration globale de SuperOAuth
 * @version 1.0.0
 */

// Configuration de l'API
export const API_CONFIG = {
    BASE_URL: window.location.origin,
    VERSION: 'v1',
    ENDPOINTS: {
        HEALTH: '/health',
        AUTH: {
            REGISTER: '/api/v1/auth/register',
            LOGIN: '/api/v1/auth/login',
            LOGOUT: '/api/v1/auth/logout',
            REFRESH: '/api/v1/auth/refresh',
            ME: '/api/v1/auth/me',
            OAUTH: '/api/v1/auth/oauth',
            DOCS: '/api/v1/auth/docs'
        }
    }
};

// Configuration des providers OAuth
export const OAUTH_PROVIDERS = {
    discord: {
        name: 'Discord',
        icon: '🎮',
        color: '#5865F2'
    },
    twitch: {
        name: 'Twitch',
        icon: '📺',
        color: '#9146FF'
    },
    google: {
        name: 'Google',
        icon: '📧',
        color: '#db4437'
    },
    github: {
        name: 'GitHub',
        icon: '🐱',
        color: '#333'
    }
};

// Configuration du localStorage
export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER_AVATAR: 'userAvatar'
};

// Messages et textes
export const MESSAGES = {
    SUCCESS: {
        LOGIN: '✅ Connexion réussie !',
        REGISTER: '✅ Inscription réussie !',
        LOGOUT: '✅ Déconnecté avec succès !',
        AVATAR_UPDATE: '✅ Avatar mis à jour !',
        DATA_REFRESH: '✅ Données actualisées !'
    },
    ERROR: {
        MISSING_FIELDS: '❌ Veuillez remplir tous les champs requis',
        PASSWORD_MISMATCH: '❌ Les mots de passe ne correspondent pas !',
        NO_TOKEN: '❌ Aucun token trouvé. Vous n\'êtes pas connecté.',
        NETWORK_ERROR: '❌ Erreur de connexion réseau'
    },
    INFO: {
        LOADING: '🔄 Chargement...',
        REDIRECTING: '🔄 Redirection en cours...'
    }
};

// Avatars de test par défaut
export const DEFAULT_AVATARS = [
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=face'
];
