// components/PushNotificationSetup.js
import { useEffect, useRef } from 'react';
import { useAuth } from './AuthScreen';
import { messaging, getToken, onMessage } from '../services/firebase';
import toast from 'react-hot-toast';

export default function PushNotificationSetup() {
  const { user, isAuthenticated } = useAuth();
  const tokenRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // ── Remove token on logout ──
      const removeToken = async () => {
        const savedToken = tokenRef.current;
        if (!savedToken) return;
        try {
          const idToken = await user?.getIdToken?.();
          if (!idToken) return;
          await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/fcm-token`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ token: savedToken }),
          });
          console.log('🗑️ FCM token removed from backend');
          tokenRef.current = null;
        } catch (error) {
          console.warn('Could not remove FCM token on logout:', error);
        }
      };
      if (tokenRef.current) {
        removeToken();
      }
      return;
    }

    const setupPush = async () => {
      try {
        // ── Guard against server‑side execution ──
        if (!messaging) {
          console.warn('Push notifications are only available on the client.');
          return;
        }

        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.warn('Push permission denied');
            return;
          }
        } else if (Notification.permission !== 'granted') {
          console.warn('Push permission already denied');
          return;
        }

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
        });

        if (!token) {
          console.warn('No FCM token received');
          return;
        }

        tokenRef.current = token;

        const idToken = await user.getIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/fcm-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const err = await res.json();
          console.error('Failed to save FCM token:', err);
        } else {
          console.log('✅ FCM token saved to backend');
        }

        // ── Listen for foreground messages ──
        const unsubscribe = onMessage(messaging, (payload) => {
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

        return unsubscribe;
      } catch (error) {
        console.error('❌ Push setup error:', error);
      }
    };

    setupPush();
  }, [isAuthenticated, user]);

  return null;
}