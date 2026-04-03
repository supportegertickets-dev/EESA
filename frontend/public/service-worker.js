/* ============================================================
   EESA — Service Worker (Offline Caching)
   ============================================================ */
const CACHE_NAME = 'eesa-v1';
const PRECACHE_URLS = [
  '/',
  '/portal',
  '/css/style.css',
  '/js/portal.js',
  '/js/admin.js',
  '/js/lecturer.js',
  '/images/eesa-logo.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  // Skip non-GET and API requests
  if (request.method !== 'GET' || request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
