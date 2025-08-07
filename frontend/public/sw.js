const CACHE_NAME = 'forex-academy-v1';
const STATIC_CACHE_NAME = 'forex-academy-static-v1';
const API_CACHE_NAME = 'forex-academy-api-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/health',
  '/api/courses',
  '/api/market/news',
  '/api/subscription/plans',
  '/api/subscription/features',
  '/api/telegram/info'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      }),
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('[SW] Pre-caching API endpoints');
        // Pre-cache some API responses
        return Promise.all(
          API_ENDPOINTS.map(url => {
            return fetch(url).then(response => {
              if (response.ok) {
                cache.put(url, response.clone());
              }
              return response;
            }).catch(err => {
              console.log(`[SW] Failed to pre-cache ${url}:`, err);
            });
          })
        );
      })
    ])
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== API_CACHE_NAME && 
              cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      handleApiRequest(request)
    );
    return;
  }

  // Handle static files
  event.respondWith(
    handleStaticRequest(request)
  );
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', url.pathname);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for specific endpoints
    return getOfflineApiResponse(url.pathname);
  }
}

// Handle static files with cache-first strategy
async function handleStaticRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Not in cache, try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Both cache and network failed for:', request.url);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return getOfflinePage();
    }
    
    throw error;
  }
}

// Generate offline API responses
function getOfflineApiResponse(pathname) {
  const offlineData = {
    '/api/health': {
      status: 'offline',
      message: 'App is running offline'
    },
    '/api/courses': [
      {
        module_id: 'offline_basic',
        title: 'Contenido Offline Disponible',
        description: 'Algunos cursos están disponibles offline',
        level: 'beginner',
        pair: 'EURUSD',
        content: 'Este contenido está disponible offline para tu aprendizaje continuo.',
        video_content: 'Videos disponibles offline'
      }
    ],
    '/api/market/news': [
      {
        title: 'Modo Offline Activado',
        content: 'Las noticias estarán disponibles cuando recuperes la conexión.',
        impact: 'info',
        pairs_affected: ['OFFLINE'],
        timestamp: new Date().toISOString()
      }
    ]
  };

  const data = offlineData[pathname] || { 
    error: 'No offline data available',
    offline: true 
  };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Served-By': 'ServiceWorker'
    }
  });
}

// Generate offline page
function getOfflinePage() {
  const offlineHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Forex Academy - Modo Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          margin: 0;
          padding: 2rem;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
        }
        .offline-container {
          max-width: 400px;
          padding: 2rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        h1 { margin-bottom: 1rem; }
        .offline-icon { font-size: 4rem; margin-bottom: 1rem; }
        .retry-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          padding: 1rem 2rem;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          margin-top: 1rem;
        }
        .retry-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="offline-icon">📱</div>
        <h1>Forex Academy</h1>
        <h2>Modo Offline</h2>
        <p>No hay conexión a internet. Algunos contenidos están disponibles offline.</p>
        <button class="retry-btn" onclick="window.location.reload()">
          Intentar de nuevo
        </button>
      </div>
    </body>
    </html>
  `;

  return new Response(offlineHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html'
    }
  });
}

// Handle background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'forex-data-sync') {
    event.waitUntil(syncForexData());
  }
});

// Background sync function
async function syncForexData() {
  console.log('[SW] Syncing forex data in background...');
  
  try {
    // Refresh cached API data
    const apiCache = await caches.open(API_CACHE_NAME);
    
    for (const endpoint of API_ENDPOINTS) {
      try {
        const response = await fetch(endpoint);
        if (response.ok) {
          await apiCache.put(endpoint, response.clone());
          console.log('[SW] Synced:', endpoint);
        }
      } catch (error) {
        console.log('[SW] Failed to sync:', endpoint, error);
      }
    }
  } catch (error) {
    console.log('[SW] Background sync failed:', error);
  }
}

// Handle push notifications for market alerts
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nueva actualización disponible',
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      data: data.data || {},
      actions: [
        {
          action: 'open',
          title: 'Abrir App'
        },
        {
          action: 'dismiss',
          title: 'Descartar'
        }
      ],
      requireInteraction: data.priority === 'high',
      silent: data.priority === 'low'
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Forex Academy', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

console.log('[SW] Service Worker loaded - Forex Academy v1');
