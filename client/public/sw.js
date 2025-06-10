// Service Worker para Virtual Agent PWA
const CACHE_NAME = 'virtual-agent-v1';
const urlsToCache = [
  '/',
  '/assets/logo.png',
  '/assets/ciudad.jpeg',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna la versión en caché si está disponible
        if (response) {
          return response;
        }
        // Sino, realiza la petición a la red
        return fetch(event.request);
      })
  );
});