/* ============================================================
   sw.js — Service Worker (Precache + Offline)
   ============================================================ */
const CACHE_NAME = 'xai-lab-v5';
const PRECACHE_URLS = [
    './',
    './index.html',
    './style.css',
    './data.js',
    './charts.js',
    './app.js',
    './manifest.json'
];

// Install — precache all assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch — Network-first strategy
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
        }).catch(() => {
            return caches.match(event.request).then(cached => {
                if (cached) return cached;
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
