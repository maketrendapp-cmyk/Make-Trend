// components/PushNotificationSetup.js
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthScreen';
import { auth, messaging, getToken, onMessage } from '../services/firebase';
import toast from 'react-hot-toast';
import NotificationPermissionModal from './NotificationPermissionModal';

export default function PushNotificationSetup() {
  const { isAuthenticated } = useAuth();
  const tokenRef = useRef(null);
  const unsubForegroundRef = useRef(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (unsubForegroundRef.current) {
        unsubForegroundRef.current();
      }
    };
  }, []);

  // ── Check permission and show modal if needed ──
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkPermission = async () => {
      await auth.authStateReady();
      // Only show modal if permission is 'default'
      if (Notification.permission === 'default') {
        setShowPermissionModal(true);
      } else if (Notification.permission === 'granted') {
        // Already granted – set up silently
        await setupPush();
      }
      // If denied, do nothing – user can enable later manually
    };

    checkPermission();
  }, [isAuthenticated]);

  // ── Handle permission request from modal ──
  const handleRequestPermission = async () => {
    setShowPermissionModal(false);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await setupPush();
        toast.success('Notifications enabled! 🔔', { duration: 3000 });
      } else {
        toast.error('Notifications disabled – you can enable them later in browser settings.', { duration: 4000 });
      }
    } catch (_) {
      // ignore
    }
  };

  // ── Dismiss modal ──
  const handleDismissModal = () => {
    setShowPermissionModal(false);
    toast('You can enable notifications later in your browser settings.', {
      duration: 4000,
      icon: '🔔',
    });
  };

  // ── Core push setup ──
  const setupPush = async () => {
    try {
      await auth.authStateReady();
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      if (!messaging || typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;

      const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY ||
        'BIwsoKSztzXOFZ2buSvIho2u7YnMgzSh2mBYZP6OkBgWcOfi0hj4zMUtJD3hraDiO6Lsl31qgLIJGN6rwdUbyXQ';
      const token = await getToken(messaging, { vapidKey });
      if (!token) return;

      tokenRef.current = token;

      const idToken = await firebaseUser.getIdToken();
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ token }),
      });

      // Remove any previous foreground listener
      if (unsubForegroundRef.current) {
        unsubForegroundRef.current();
      }

      // Listen for foreground messages (show toast)
      unsubForegroundRef.current = onMessage(messaging, (payload) => {
        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <img className="h-10 w-10 rounded-full" src="/favicon.ico" alt="MakeTrend" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {payload.notification?.title || 'MakeTrend'}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {payload.notification?.body || 'New notification'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-purple-600 hover:text-purple-500"
              >
                Close
              </button>
            </div>
          </div>
        ), { duration: 5000 });
      });
    } catch (_) {
      // silent fail – no user‑visible error
    }
  };

  // ── Remove token on logout ──
  useEffect(() => {
    if (isAuthenticated) return;

    const removeToken = async () => {
      const savedToken = tokenRef.current;
      if (!savedToken) return;
      try {
        await auth.authStateReady();
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;
        const idToken = await firebaseUser.getIdToken();
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/fcm-token`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ token: savedToken }),
        });
      } catch (_) {}
      tokenRef.current = null;
    };
    if (tokenRef.current) {
      removeToken();
    }
  }, [isAuthenticated]);

  return (
    <NotificationPermissionModal
      isOpen={showPermissionModal}
      onRequestPermission={handleRequestPermission}
      onDismiss={handleDismissModal}
    />
  );
}