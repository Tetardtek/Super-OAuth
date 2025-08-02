/**
 * SuperOAuth Service Worker
 * Cache intelligent pour optimiser les performances
 * @version 1.0.0
 */

const CACHE_NAME = 'superoauth-v1.0.0';
const CACHE_STATIC_NAME = 'superoauth-static-v1.0.0';
const CACHE_DYNAMIC_NAME = 'superoauth-dynamic-v1.0.0';

// Ressources à mettre en cache immédiatement
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/variables.css',
  '/css/dashboard.css',
  '/css/components.css',
  '/js/app.js',
  '/js/auth-service.js',
  '/js/auth-component.js',
  '/js/dashboard-component.js',
  '/js/server-monitor.js',
  '/js/shared-utils.js',
  '/js/utils.js',
  '/js/config.js',
  '/docs/index.html',
  '/docs/js/docs-app.js',
  '/docs/styles/main.css'
];

// Ressources dynamiques à mettre en cache à la demande
const DYNAMIC_CACHE_PATTERNS = [
  /^\/api\/auth\//,
  /^\/api\/user\//,
  /^\/api\/health/,
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(?:woff|woff2|ttf|eot)$/
];

// Stratégies de cache
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Configuration des stratégies par ressource
const RESOURCE_STRATEGIES = {
  '/api/auth/': CACHE_STRATEGIES.NETWORK_FIRST,
  '/api/user/': CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
  '/api/health': CACHE_STRATEGIES.NETWORK_FIRST,
  'static': CACHE_STRATEGIES.CACHE_FIRST,
  'images': CACHE_STRATEGIES.CACHE_FIRST,
  'fonts': CACHE_STRATEGIES.CACHE_FIRST
};

/**
 * Installation du Service Worker
 */
self.addEventListener('install', event => {
  console.log('🔧 Service Worker: Installation en cours...');
  
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(cache => {
        console.log('📦 Service Worker: Cache statique ouvert');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Ressources statiques mises en cache');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Service Worker: Erreur installation', error);
      })
  );
});

/**
 * Activation du Service Worker
 */
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activation...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Supprimer les anciens caches
            if (cacheName !== CACHE_STATIC_NAME && 
                cacheName !== CACHE_DYNAMIC_NAME &&
                cacheName.startsWith('superoauth-')) {
              console.log('🗑️ Service Worker: Suppression ancien cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation terminée');
        return self.clients.claim();
      })
  );
});

/**
 * Interception des requêtes réseau
 */
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Déterminer la stratégie de cache
  const strategy = getStrategy(request);
  
  switch (strategy) {
    case CACHE_STRATEGIES.CACHE_FIRST:
      event.respondWith(cacheFirst(request));
      break;
    case CACHE_STRATEGIES.NETWORK_FIRST:
      event.respondWith(networkFirst(request));
      break;
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      event.respondWith(staleWhileRevalidate(request));
      break;
    case CACHE_STRATEGIES.NETWORK_ONLY:
      // Laisser passer sans intervention
      break;
    default:
      event.respondWith(cacheFirst(request));
  }
});

/**
 * Détermine la stratégie de cache pour une requête
 */
function getStrategy(request) {
  const url = request.url;
  
  // API Auth - toujours network first
  if (url.includes('/api/auth/')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // API User - stale while revalidate
  if (url.includes('/api/user/')) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }
  
  // Health check - network first
  if (url.includes('/api/health')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }
  
  // Images et fonts - cache first
  if (/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/i.test(url)) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // CSS et JS - cache first
  if (/\.(css|js)$/i.test(url)) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }
  
  // Par défaut - cache first pour les ressources statiques
  return CACHE_STRATEGIES.CACHE_FIRST;
}

/**
 * Stratégie Cache First
 */
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    await cacheResponse(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Cache First error', error);
    return new Response('Service indisponible', { status: 503 });
  }
}

/**
 * Stratégie Network First
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    await cacheResponse(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.warn('Service Worker: Network failed, trying cache', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Service indisponible', { status: 503 });
  }
}

/**
 * Stratégie Stale While Revalidate
 */
async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  // Mise à jour en arrière-plan
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      cacheResponse(request, networkResponse.clone());
      return networkResponse;
    })
    .catch(error => {
      console.warn('Service Worker: Background fetch failed', error);
    });
  
  // Retourner le cache immédiatement si disponible
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Sinon attendre la réponse réseau
  return fetchPromise;
}

/**
 * Met en cache une réponse
 */
async function cacheResponse(request, response) {
  // Ne pas cacher les erreurs
  if (!response.ok) {
    return;
  }
  
  const cacheName = request.url.includes('/api/') ? 
    CACHE_DYNAMIC_NAME : CACHE_STATIC_NAME;
  
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
}

/**
 * Gestion des messages depuis le client
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    getCacheStats().then(stats => {
      event.ports[0].postMessage(stats);
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearCache().then(result => {
      event.ports[0].postMessage(result);
    });
  }
});

/**
 * Obtient les statistiques du cache
 */
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = {
      count: keys.length,
      size: await calculateCacheSize(cache)
    };
  }
  
  return stats;
}

/**
 * Calcule la taille approximative d'un cache
 */
async function calculateCacheSize(cache) {
  let totalSize = 0;
  const keys = await cache.keys();
  
  for (const request of keys) {
    try {
      const response = await cache.match(request);
      if (response && response.headers.get('content-length')) {
        totalSize += parseInt(response.headers.get('content-length'));
      }
    } catch (error) {
      // Ignorer les erreurs de calcul
    }
  }
  
  return totalSize;
}

/**
 * Vide tous les caches
 */
async function clearCache() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    return { success: true, message: 'Cache vidé avec succès' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

console.log('🎯 SuperOAuth Service Worker chargé et prêt !');
