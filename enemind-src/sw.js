const CACHE_NAME = 'enemind-shell-v4';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icons/enemind-192.png', './icons/enemind-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// Do not cache config.js or authentication/network requests: stale config can break sign-in.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname.endsWith('/config.js') || url.pathname.includes('/firebase') ||
      url.pathname.includes('/auth/')) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    try {
      const fresh = await fetch(request);
      if (fresh.ok && request.destination !== 'document') {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch {
      return cached || Response.error();
    }
  })());
});
