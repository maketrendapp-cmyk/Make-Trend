// public/firebase-messaging-sw.js
// Use a specific version (9.23.0 works) – avoid `9.x.x`
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// ── Complete config (include authDomain & storageBucket – safe to add) ──
firebase.initializeApp({
  apiKey: "AIzaSyCPQ7tqjbA2HELnJd0-wEF1g_w1oIh7oe8",
  authDomain: "make-trend.firebaseapp.com",
  projectId: "make-trend",
  storageBucket: "make-trend.firebasestorage.app",
  messagingSenderId: "241555047055",
  appId: "1:241555047055:web:c5f8eef5a0af227e5f66fa",
});

const messaging = firebase.messaging();

// ── Optional: log that the worker started (visible in browser console) ──
console.log('✅ Firebase messaging service worker loaded');

// ── Background message handler ──
messaging.onBackgroundMessage((payload) => {
  console.log('📩 Background message:', payload);
  const title = payload.notification?.title || 'MakeTrend';
  const options = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/logo.png',
    data: payload.data || {},
    badge: '/logo.png',
  };
  self.registration.showNotification(title, options);
});

// ── Notification click handler ──
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