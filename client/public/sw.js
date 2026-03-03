const CACHE_NAME = 'virtual-agent-v9';
const STATIC_CACHE = 'virtual-agent-static-v9';
const DYNAMIC_CACHE = 'virtual-agent-dynamic-v9';

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/assets/logo.png',
  '/assets/logo-full.png',
  '/assets/ciudad.jpeg',
  '/manifest.json'
];

const API_PATTERNS = ['/api/', '/uploads/'];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v2...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn('Service Worker: Some static assets failed to cache', error);
        });
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating v2...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map((name) => {
              console.log('Service Worker: Deleting old cache', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  const isAPI = API_PATTERNS.some(pattern => url.pathname.startsWith(pattern));

  if (isAPI) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed for API, returning error');
    return new Response(
      JSON.stringify({ error: 'Sin conexión', offline: true }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(async () => {
      if (cachedResponse) {
        return cachedResponse;
      }
      if (request.destination === 'document') {
        const offlineCache = await caches.open(STATIC_CACHE);
        return offlineCache.match('/offline.html');
      }
      return new Response('Offline', { status: 503 });
    });

  return cachedResponse || fetchPromise;
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
