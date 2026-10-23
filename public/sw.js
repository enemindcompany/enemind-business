const CACHE_NAME = 'enemind-pages-20261023-layout-fix-v2';
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('enemind-') && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Use the network for HTML and JS so deployments cannot get stuck on an old app bundle.
  if (request.mode === 'navigate' || /\\.(?:js|mjs|html|json)$/.test(url.pathname)) return;
  event.respondWith((async () => {
    try { return await fetch(request); }
    catch { return (await caches.match(request)) || Response.error(); }
  })());
});
