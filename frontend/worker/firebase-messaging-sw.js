// worker/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.x.x/firebase-messaging-compat.js');

// ── Use environment variables (injected by Next.js build) ──
firebase.initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

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