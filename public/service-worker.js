/**
 * Service Worker for Push Notifications
 * TCG Dojo PWA
 */

// Service worker version (increment to force update)
const VERSION = '1.0.0';
const CACHE_NAME = `tcg-dojo-v${VERSION}`;

// Install event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version', VERSION);
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version', VERSION);

  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  return self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  let data = {
    title: 'TCG Dojo',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
  };

  // Parse push data
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  // Show notification
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    image: data.image,
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification);

  event.notification.close();

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Handle different notification types
  let url = '/';

  if (action === 'view') {
    // Handle "view" action
    if (data.type === 'order_update' && data.orderId) {
      url = `/orders/${data.orderId}`;
    } else if (data.type === 'new_message' && data.senderId) {
      url = `/messages/${data.senderId}`;
    } else if (data.type === 'price_drop' && data.productId) {
      url = `/products/${data.productId}`;
    }
  } else if (action === 'reply') {
    // Handle "reply" action
    if (data.type === 'new_message' && data.senderId) {
      url = `/messages/${data.senderId}`;
    }
  } else {
    // Default click (no action button)
    if (data.type === 'order_update' && data.orderId) {
      url = `/orders/${data.orderId}`;
    } else if (data.type === 'new_message' && data.senderId) {
      url = `/messages`;
    } else if (data.type === 'price_drop' && data.productId) {
      url = `/products/${data.productId}`;
    }
  }

  // Open or focus the appropriate page
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }

      // No matching window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event.notification);

  // Track notification dismissal (optional)
  const data = event.notification.data;
  if (data?.type) {
    // You can send analytics here
    console.log(`Notification dismissed: ${data.type}`);
  }
});

// Background sync (optional - for offline actions)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // Sync any pending notifications when back online
  console.log('[Service Worker] Syncing notifications...');
  // Implementation depends on your caching strategy
}

// Message event - communication with main thread
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
