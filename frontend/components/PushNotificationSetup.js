// components/PushNotificationSetup.js
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthScreen';
import { messaging, getToken, onMessage } from '../services/firebase';
import toast from 'react-hot-toast';

export default function PushNotificationSetup() {
  const { user, isAuthenticated } = useAuth();
  const tokenRef = useRef(null);
  const [setupAttempted, setSetupAttempted] = useState(false);

  // ── Manual retry function (exposed via toast action) ──
  const retrySetup = () => {
    setSetupAttempted(false);
    // Re-run the effect by toggling a state? We'll just re-run manually.
    // We'll call the setup function directly.
    performSetup();
  };

  const performSetup = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Please log in first');
      return;
    }

    try {
      toast.loading('Setting up push notifications...', { id: 'push-setup' });

      // ── 1. Check messaging ──
      if (!messaging) {
        toast.error('Push notifications not available on this browser', { id: 'push-setup' });
        return;
      }

      // ── 2. Permission ──
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error('Permission denied – enable in browser settings', { id: 'push-setup' });
          return;
        }
      } else if (Notification.permission !== 'granted') {
        toast.error('Permission already denied – enable manually', { id: 'push-setup' });
        return;
      }

      // ── 3. Get token (hardcoded VAPID as fallback) ──
      const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || 'BIwsoKSztzXOFZ2buSvIho2u7YnMgzSh2mBYZP6OkBgWcOfi0hj4zMUtJD3hraDiO6Lsl31qgLIJGN6rwdUbyXQ';
      const token = await getToken(messaging, { vapidKey });

      if (!token) {
        toast.error('Failed to get FCM token – check Firebase config', { id: 'push-setup' });
        return;
      }

      tokenRef.current = token;
      toast.success('FCM token obtained!', { id: 'push-setup' });

      // ── 4. Send token to backend ──
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
        toast.error(`Failed to save token: ${err.error || 'Unknown error'}`, { id: 'push-setup' });
        // Show retry button
        toast((t) => (
          <div className="flex items-center gap-2">
            <span>Failed to save token. Retry?</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                retrySetup();
              }}
              className="px-2 py-1 bg-purple-600 text-white rounded"
            >
              Retry
            </button>
          </div>
        ), { duration: 10000 });
        return;
      }

      toast.success('✅ Push notifications enabled!', { id: 'push-setup' });
      setSetupAttempted(true);

      // ── 5. Listen for foreground messages ──
      const unsubscribe = onMessage(messaging, (payload) => {
        toast.custom((t) => (
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5">
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
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-purple-600 hover:text-purple-500"
              >
                Close
              </button>
            </div>
          </div>
        ), { duration: 5000 });
      });

      // Cleanup listener on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error('Push setup error:', error);
      toast.error(`Error: ${error.message || 'Unknown error'}`, { id: 'push-setup' });
    }
  };

  // ── Auto‑run when authenticated ──
  useEffect(() => {
    if (isAuthenticated && user && !setupAttempted) {
      performSetup();
    }
    // Also handle logout: remove token
    if (!isAuthenticated && tokenRef.current) {
      // Remove token (optional – we'll just clear ref)
      tokenRef.current = null;
    }
  }, [isAuthenticated, user, setupAttempted]);

  return null;
}