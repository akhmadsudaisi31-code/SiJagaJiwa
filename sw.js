const CACHE_NAME = 'sijagajiwa-v3';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/auth.js',
  './js/data.js',
  './js/pages.js',
  './js/ui.js',
  './js/firebase-config.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth-compat.js',
  './assets/icon.svg'
];

const FIREBASE_PROJECT_ID = 'sijagajiwa';
const FIREBASE_API_KEY = 'AIzaSyA5OLOp2l4yv-fjquaSc4XlA8EG5mKS8NQ';

// ============ INSTALL ============
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching shell assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ============ ACTIVATE ============
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ============ FETCH ============
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cacheRes) => cacheRes || fetch(event.request))
  );
});

// ============ PUSH NOTIFICATION ============
// Triggered by push event (from FCM or Web Push)
self.addEventListener('push', (event) => {
  let data = { title: 'SiJagaJiwa', body: 'Ada notifikasi baru untuk Anda', icon: './assets/icon.svg', badge: './assets/icon.svg' };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || './assets/icon.svg',
      badge: data.badge || './assets/icon.svg',
      tag: data.tag || 'sijagajiwa-notif',
      data: { url: data.url || '/', page: data.page || 'dashboard' },
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

// ============ NOTIFICATION CLICK ============
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPage = event.notification.data?.page || 'dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE_TO', page: targetPage });
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// ============ BACKGROUND SYNC — Polling for new notifs ============
// Uses Periodic Background Sync when the app is closed
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifs') {
    event.waitUntil(checkForNewNotifications());
  }
});

async function checkForNewNotifications() {
  // Retrieve saved session from client storage via IDB or injected data
  const sessionRaw = await getFromIDB('sijagajiwa_session');
  if (!sessionRaw) return;

  let session;
  try { session = JSON.parse(sessionRaw); } catch (e) { return; }
  if (!session || !session.username) return;

  const lastChecked = (await getFromIDB('notif_last_checked')) || '1970-01-01T00:00:00.000Z';
  const now = new Date().toISOString();

  try {
    // Query Firestore REST API for unread notifs for this user since last check
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'notifs' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'forUser' }, op: 'EQUAL', value: { stringValue: session.username } } },
              { fieldFilter: { field: { fieldPath: 'unread' }, op: 'EQUAL', value: { booleanValue: true } } },
              { fieldFilter: { field: { fieldPath: 'timestamp' }, op: 'GREATER_THAN', value: { stringValue: lastChecked } } },
            ]
          }
        },
        orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }],
        limit: 5
      }
    };

    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const docs = await res.json();

    const newNotifs = docs.filter(d => d.document).map(d => {
      const fields = d.document.fields;
      return {
        title: fields?.title?.stringValue || 'SiJagaJiwa',
        desc: fields?.desc?.stringValue || '',
        icon: fields?.icon?.stringValue || '🔔',
        page: fields?.act?.stringValue || 'dashboard',
      };
    });

    for (const notif of newNotifs) {
      await self.registration.showNotification(`${notif.icon} ${notif.title}`, {
        body: notif.desc,
        icon: './assets/icon.svg',
        badge: './assets/icon.svg',
        tag: `sijagajiwa-${Date.now()}`,
        data: { page: notif.page },
        vibrate: [200, 100, 200],
      });
    }

    if (newNotifs.length > 0) {
      await setToIDB('notif_last_checked', now);
    }
  } catch (e) {
    console.warn('[SW] Background notif check failed:', e);
  }
}

// ============ MESSAGES FROM APP ============
// App sends the session data when user logs in so SW can use it
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SAVE_SESSION') {
    setToIDB('sijagajiwa_session', JSON.stringify(event.data.session));
    setToIDB('notif_last_checked', new Date().toISOString());
  }
  if (event.data?.type === 'CLEAR_SESSION') {
    setToIDB('sijagajiwa_session', null);
  }
});

// ============ IndexedDB helpers for SW storage ============
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('sijagajiwa_sw', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('kv');
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function getFromIDB(key) {
  const db = await openIDB();
  return new Promise((resolve) => {
    const tx = db.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function setToIDB(key, value) {
  const db = await openIDB();
  return new Promise((resolve) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = resolve;
  });
}
