// pages/login.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthScreen, { useAuth } from '../components/AuthScreen';

export default function Login() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  const redirectTo = router.query.redirect || '/profile';

  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, loading, router, redirectTo]);

  // ── Show a loading spinner while auth state is being resolved ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  // ── If authenticated, return null (will redirect) ──
  if (isAuthenticated) return null;

  // ── Render AuthScreen (full‑page UI, handles everything) ──
  return <AuthScreen redirectTo={redirectTo} />;
}