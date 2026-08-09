// components/PushNotificationSetup.js
import { useEffect, useRef } from 'react';
import { useAuth } from './AuthScreen';
import { messaging, getToken, onMessage } from '../services/firebase';
import toast from 'react-hot-toast';

export default function PushNotificationSetup() {
  const { user, isAuthenticated } = useAuth();
  const tokenRef = useRef(null);

  useEffect(() => {
    console.log('🔔 PushNotificationSetup effect running', { isAuthenticated, user: !!user });

    if (!isAuthenticated || !user) {
      // ── Logout: remove token ──
      const removeToken = async () => {
        const savedToken = tokenRef.current;
        if (!savedToken) {
          console.log('🗑️ No token to remove on logout');
          return;
        }
        try {
          const idToken = await user?.getIdToken?.();
          if (!idToken) {
            console.warn('⚠️ No idToken, cannot remove token');
            return;
          }
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
        console.log('📱 Setting up push notifications...');

        // ── Guard: messaging must exist ──
        if (!messaging) {
          console.warn('❌ messaging is undefined – cannot set up push');
          return;
        }
        console.log('✅ messaging is available');

        // ── Permission ──
        if (Notification.permission === 'default') {
          console.log('🔄 Requesting notification permission...');
          const permission = await Notification.requestPermission();
          console.log('📛 Permission result:', permission);
          if (permission !== 'granted') {
            console.warn('Push permission denied');
            return;
          }
        } else if (Notification.permission !== 'granted') {
          console.warn('Push permission already denied');
          return;
        }
        console.log('✅ Notification permission granted');

        // ── Get FCM token ──
        console.log('🔑 Getting FCM token with VAPID key:', process.env.NEXT_PUBLIC_FCM_VAPID_KEY ? '✅ present' : '❌ missing');
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
        });

        if (!token) {
          console.warn('❌ No FCM token received – check VAPID key or Firebase config');
          return;
        }
        console.log('📱 FCM token obtained:', token.substring(0, 20) + '...');

        tokenRef.current = token;

        // ── Send token to backend ──
        console.log('📤 Sending token to backend...');
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
          console.error('❌ Failed to save FCM token:', err);
        } else {
          console.log('✅ FCM token saved to backend');
        }

        // ── Listen for foreground messages ──
        console.log('👂 Listening for foreground messages...');
        const unsubscribe = onMessage(messaging, (payload) => {
          console.log('📩 Foreground message:', payload);
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