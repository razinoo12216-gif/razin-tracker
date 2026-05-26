// 12 World — Service Worker
const CACHE_NAME = '12world-v1';
const VAPID_PUBLIC_KEY = 'BCnB_hxXxjnesi55cjR6P_ghPaoAyEn_-6p-b1UuRjxpAF0TMEt0BFnRVIi_eWpa2bzVoeVs4Pr54vDOz-PJvp8';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/', '/index.html', '/src/app.js', '/src/style.css'])
    ).catch(() => {})
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('push', event => {
  let data = { title: '12 World', body: 'You have an upcoming deadline.', url: '/' };
  try { data = event.data ? { ...data, ...event.data.json() } : data; } catch (e) {}
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'deadline',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});