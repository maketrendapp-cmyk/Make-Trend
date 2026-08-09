// components/PushNotificationSetup.js
import { useEffect, useRef } from 'react';
import { useAuth } from './AuthScreen';
import { auth, messaging, getToken, onMessage } from '../services/firebase';
import toast from 'react-hot-toast';

export default function PushNotificationSetup() {
  const { isAuthenticated } = useAuth();
  const tokenRef = useRef(null);
  const unsubForegroundRef = useRef(null);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (unsubForegroundRef.current) {
        unsubForegroundRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      // ── Logout: remove token from backend ──
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
        } catch (_) { /* ignore */ }
        tokenRef.current = null;
      };
      if (tokenRef.current) {
        removeToken();
      }
      return;
    }

    // ── Login: set up push ──
    const setupPush = async () => {
      try {
        // 1. Wait for Firebase Auth to be ready
        await auth.authStateReady();
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;

        // 2. Check messaging availability
        if (!messaging || typeof Notification === 'undefined') return;

        // 3. Request permission if needed
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;
        } else if (Notification.permission !== 'granted') {
          return;
        }

        // 4. Get FCM token (hardcoded VAPID as safe fallback)
        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY ||
          'BIwsoKSztzXOFZ2buSvIho2u7YnMgzSh2mBYZP6OkBgWcOfi0hj4zMUtJD3hraDiO6Lsl31qgLIJGN6rwdUbyXQ';
        const token = await getToken(messaging, { vapidKey });
        if (!token) return;

        tokenRef.current = token;

        // 5. Send token to backend
        const idToken = await firebaseUser.getIdToken();
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/fcm-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ token }),
        });

        // 6. Remove any previous foreground listener
        if (unsubForegroundRef.current) {
          unsubForegroundRef.current();
        }

        // 7. Listen for foreground messages (show toast)
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
                    <img className="h-10 w-10 rounded-full" src="/logo.png" alt="MakeTrend" />
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
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-purple-600 hover:text-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  Close
                </button>
              </div>
            </div>
          ), { duration: 5000 });
        });
      } catch (_) {
        // Silent fail – no user‑visible errors
      }
    };

    setupPush();
  }, [isAuthenticated]);

  return null;
}