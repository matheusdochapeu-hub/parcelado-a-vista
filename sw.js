const CACHE_NAME = 'faturas-pwa-v11';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Instalação do Service Worker e pré-cache dos arquivos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia de requisições:
// - Para o Google Apps Script (sincronização): sempre via rede (network only)
// - Para navegação HTML (index.html): Network-First com fallback para cache offline
// - Para ícones e assets estáticos: Cache-First com fallback para rede
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // Ignorar chamadas ao Google Apps Script ou extensões para não interferir na sincronização
  if (url.includes('script.google.com') || url.includes('googleusercontent.com') || url.startsWith('chrome-extension')) {
    return;
  }

  // Apenas requisições GET podem ser cacheadas
  if (request.method !== 'GET') {
    return;
  }

  // Navegações de página HTML sempre tentam a rede primeiro para garantir código atualizado
  if (request.mode === 'navigate' || url.endsWith('index.html') || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Para ícones, manifest e assets estáticos: Cache-First com fallback seguro
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html').then((fallback) => {
            return fallback || new Response('', { status: 408, statusText: 'Offline' });
          });
        }
        return new Response('', { status: 404, statusText: 'Asset not found in offline cache' });
      });
    })
  );
});
