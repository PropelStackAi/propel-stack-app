/* Propel Stack AI -- Life OS service worker (Session 6).
 * Cache-first for static assets, network-first for API calls and navigations,
 * with a branded offline fallback. */
const CACHE = 'psai-cache-v1';
const APP_SHELL = ['/', '/offline.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Network-first for API calls.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then(
          (cached) =>
            cached ||
            new Response(JSON.stringify({ error: 'You are offline.' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }),
        ),
      ),
    );
    return;
  }

  // Network-first for navigations, falling back to the offline page.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html').then((r) => r || caches.match('/'))));
    return;
  }

  // Cache-first for other static assets.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
            return resp;
          })
          .catch(() => caches.match('/offline.html')),
    ),
  );
});
