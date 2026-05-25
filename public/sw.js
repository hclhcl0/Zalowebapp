const CACHE_NAME = 'zcdc-pwa-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Just cache basic assets to make it installable, or rely on network
      return cache.addAll(['/']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // A minimal fetch handler to satisfy PWA requirements
  // We prefer network first, fallback to cache
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
