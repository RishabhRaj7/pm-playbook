/* ============================================================
   PM Playbook — Service Worker
   Strategy:
     - App shell (index.html): cache-first, background update
     - Google Fonts: stale-while-revalidate
     - Everything else: network-first with cache fallback
   ============================================================ */

const CACHE = 'pm-playbook-v3';
const SHELL  = ['./', './index.html', './manifest.json', './icons/icon-192.svg', './icons/icon-512.svg', './icons/icon-maskable.svg'];

/* --- install: pre-cache the app shell --- */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* --- activate: remove stale caches --- */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* --- fetch: tiered caching strategy --- */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Google Fonts — stale-while-revalidate */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }

  /* Navigation (the app shell) — cache-first, update in bg */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.open(CACHE).then(async c => {
        const key = new URL(e.request.url).pathname === '/' ? '/' : new URL(e.request.url).pathname;
        const cached = await c.match(key);
        /* fetch update in background regardless */
        const fresh = fetch(e.request).then(res => {
          if (res.ok) c.put(key, res.clone());
          return res;
        }).catch(() => null);
        return cached || fresh;
      })
    );
    return;
  }

  /* Everything else — network-first */
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fresh  = fetch(request).then(res => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return cached || fresh;
}
