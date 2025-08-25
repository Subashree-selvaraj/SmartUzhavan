const CACHE_NAME = 'agri-connect-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/agri-icon.png',
  '/logo.jpg',
  '/hero-bg.jpg',
  '/about-image.jpg',
  '/recommendation-bg.jpg',
  '/paddy-field-bg.jpg',
  '/tomato-leaf-curl.jpg'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Implement background sync logic here
  console.log('Background sync triggered');
  return Promise.resolve();
}

// Push notification handling (existing from firebase-messaging-sw.js)
self.addEventListener('push', function(event) {
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
      renotify: true,
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/agri-icon.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/agri-icon.png'
        }
      ]
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // Fallback: show a generic notification
    event.waitUntil(self.registration.showNotification('AgriConnect Alert', { 
      body: 'You have a new message',
      icon: '/agri-icon.png'
    }));
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const targetUrl = event.notification?.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
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