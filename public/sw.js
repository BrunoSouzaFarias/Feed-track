// Service worker — estratégia:
//  - Navegação (HTML): REDE primeiro, cache só como fallback offline. Assim um
//    deploy novo (ou correção de segurança) chega ao usuário imediatamente.
//  - /assets/* (arquivos com hash do Vite, imutáveis): cache primeiro.
//  - Todo o resto (APIs, manifest, checagens de conectividade): passa direto
//    para a rede, sem cache.
// Nunca interceptamos requisições cross-origin (Firebase/Google).
const CACHE_VERSION = 'v2';
const CACHE_NAME = `feed-track-${CACHE_VERSION}`;
const SHELL_URL = '/index.html';
const PRECACHE = ['/favicon.svg', '/icons.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // allSettled: um recurso ausente não pode impedir a instalação do SW.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(SHELL_URL, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(SHELL_URL)) || Response.error())
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
