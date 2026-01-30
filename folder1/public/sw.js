const CACHE_NAME = 'agri-connect-v2';

// Only cache files that 100% exist
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/agri-icon.png'
];

/* ===============================
   INSTALL – Pre-cache safe assets
================================ */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      try {
        console.log('[SW] Opened cache');
        await cache.addAll(PRECACHE_URLS);
        self.skipWaiting();
      } catch (err) {
        console.error('[SW] Precache failed:', err);
      }
    })
  );
});

/* ===============================
   ACTIVATE – Clean old caches
================================ */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* ===============================
   FETCH – Network first, cache fallback
================================ */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Ignore non-GET requests
  if (request.method !== 'GET') return;

  // Ignore Firebase / API / OAuth calls
  if (
    request.url.includes('firebase') ||
    request.url.includes('googleapis') ||
    request.url.includes('identitytoolkit') ||
    request.url.includes('/api/')
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache only valid same-origin responses
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic'
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(request).then(cached => {
          if (cached) return cached;

          // Fallback for navigation (page refresh)
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

/* ===============================
   PUSH NOTIFICATIONS
================================ */
self.addEventListener('push', event => {
  try {
    const data = event.data ? event.data.json() : {};
    const notification = data.notification || {};

    const title = notification.title || 'AgriConnect Alert';
    const body = notification.body || 'You have a new message';

    const options = {
      body,
      icon: '/agri-icon.png',
      badge: '/agri-icon.png',
      data: data.data || {},
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View' },
        { action: 'close', title: 'Close' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    event.waitUntil(
      self.registration.showNotification('AgriConnect Alert', {
        body: 'You have a new message',
        icon: '/agri-icon.png'
      })
    );
  }
});

/* ===============================
   NOTIFICATION CLICK
================================ */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
