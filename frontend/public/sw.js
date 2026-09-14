// Service Worker for MARAL OS PWA - Auto Purge Stale Caches
const CACHE_NAME = 'maral-os-v3-' + Date.now();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET o que vayan al API
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  // Para navegaciones (HTML), SIEMPRE red directa, nunca cachear HTML viejo
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Network-first con fallback a cache para assets estáticos
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && event.request.url.includes('/assets/')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

