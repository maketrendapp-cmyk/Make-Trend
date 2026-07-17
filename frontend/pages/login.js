// pages/login.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthScreen, { useAuth } from '../components/AuthScreen';

export default function Login() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  // ── Get the redirect URL from query (or default to '/profile') ──
  const redirectTo = router.query.redirect || '/profile';

  // ── If already authenticated and not loading, redirect immediately ──
  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, loading, router, redirectTo]);

  // ── If authenticated, return null (will redirect) ──
  if (isAuthenticated) return null;

  // ── Render AuthScreen (full‑page UI, handles everything) ──
  return <AuthScreen redirectTo={redirectTo} />;
}