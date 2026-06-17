/* Elevate Angel Lead Tracker — service worker
   Caches ONLY the app shell (same-origin static files) so the app loads offline.
   It must NEVER cache cross-origin requests (the Supabase database API, fonts,
   CDN) — doing so served stale lead data. Cross-origin requests are left alone
   and always hit the network. The app HTML is network-first so new deploys show. */
const CACHE = 'ea-tracker-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './ea-icon-192.png',
  './ea-icon-512.png',
  './ea-icon-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                  // never touch writes (POST/PATCH/DELETE)
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;        // ignore Supabase / fonts / CDN — always live from network
  // Same-origin app shell: network-first so updates land, cache as offline fallback.
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
