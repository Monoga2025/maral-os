// Service Worker for MARAL OS PWA
const CACHE_NAME = 'maral-os-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET o que vayan al API
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  // Para navegaciones de rutas SPA (HTML de páginas), siempre servir desde la red con fallback a index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match('/index.html');
        return cached || fetch('/index.html');
      })
    );
    return;
  }

  // Para assets estáticos (CSS, JS, imágenes)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear respuestas exitosas de assets estáticos
        if (response.status === 200 && event.request.url.includes('/assets/')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
