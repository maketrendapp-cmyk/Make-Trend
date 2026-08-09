// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// ── Hardcoded Firebase config (safe to expose) ──
firebase.initializeApp({
  apiKey: "AIzaSyCPQ7tqjbA2HELnJd0-wEF1g_w1oIh7oe8",
  authDomain: "make-trend.firebaseapp.com",
  projectId: "make-trend",
  storageBucket: "make-trend.firebasestorage.app",
  messagingSenderId: "241555047055",
  appId: "1:241555047055:web:c5f8eef5a0af227e5f66fa",
});

const messaging = firebase.messaging();

// ── Background message handler ──
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'MakeTrend';
  const options = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/favicon.ico',      // ✅ Uses your favicon
    badge: '/favicon.ico',     // ✅ Same for badge
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

// ── Click handler – opens the redirect URL ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.redirectUrl || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});