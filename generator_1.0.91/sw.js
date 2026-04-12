const CACHE_NAME = 'generator-v1.0.92';

// Ресурсы для кэширования при установке
const STATIC_ASSETS = [
  '/generator_new.html',
  '/styles.css',
  '/app.js',
  '/app.js?v=1.0.9',
  '/manifest.json',
  '/config.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// === INSTALL ===
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      // Кэшируем то, что доступно; ошибки игнорируем (иконки могут отсутствовать)
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err.message);
      });
    }).then(() => self.skipWaiting())
  );
});

// === ACTIVATE ===
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// === FETCH ===
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API-запросы — никогда не кэшируем
  if (url.pathname.startsWith('/send-to-telegram') ||
      url.pathname.startsWith('/send-to-zimbra') ||
      url.pathname.startsWith('/poll-zimbra') ||
      url.pathname.startsWith('/check-update') ||
      url.pathname.startsWith('/do-update')) {
    return; // Let browser handle normally
  }

  // Стратегия: Cache First, затем Network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Кэшируем успешные GET-запросы
        if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback для HTML — оффлайн-страница
        if (request.headers.get('Accept').includes('text/html')) {
          return caches.match('/generator_new.html');
        }
        // Fallback для CSS/JS
        if (request.url.endsWith('.css') || request.url.endsWith('.js')) {
          return caches.match(request.url.includes('styles.css') ? '/styles.css' : '/app.js');
        }
      });
    })
  );
});

// === PUSH (для будущих push-уведомлений) ===
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Генератор', body: event.data.text() };
  }

  const options = {
    body: data.body || 'Новое уведомление',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'default',
    renotify: true,
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Генератор уведомлений', options)
  );
});

// === NOTIFICATION CLICK ===
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Если уже есть открытая вкладка — фокусируем её
      for (const client of clients) {
        if (client.url.includes('generator_new.html')) {
          return client.focus();
        }
      }
      // Иначе открываем новую
      return self.clients.openWindow('/generator_new.html');
    })
  );
});
