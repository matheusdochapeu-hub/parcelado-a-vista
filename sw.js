/* Faturas · Service Worker v24
   Estratégias:
   - Navegação/HTML: Network-First (sempre pega a versão publicada)
   - Assets estáticos: Stale-While-Revalidate (abre rápido e atualiza em segundo plano)
   - Google Apps Script: Network-Only (nunca cacheia dados financeiros)
   A ativação NÃO é automática: o app mostra o banner "Nova versão disponível" e
   envia SKIP_WAITING quando o usuário toca em Atualizar. */
const CACHE_NAME = 'faturas-pwa-v30';
const STATIC_ASSETS = [
  './nexo-theme.css',
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// O app pede a troca quando o usuário aceita atualizar
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // Chamadas à API (Sheets) e extensões nunca passam pelo cache
  if (url.includes('script.google.com') || url.includes('googleusercontent.com') || url.startsWith('chrome-extension')) {
    return;
  }
  if (request.method !== 'GET') return;

  const isHtml = request.mode === 'navigate'
    || url.endsWith('index.html')
    || (request.headers.get('accept') || '').includes('text/html');

  if (isHtml) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => cached || new Response('', { status: 504, statusText: 'Offline' }));

      return cached || network;
    })
  );
});
