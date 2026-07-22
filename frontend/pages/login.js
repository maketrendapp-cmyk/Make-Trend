// pages/login.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthScreen, { useAuth } from '../components/AuthScreen';

export default function Login() {
  const router = useRouter();
  const { isAuthenticated, loading, needsCompletion } = useAuth();

  // ── Get the redirect URL from query (or default to '/profile') ──
  const redirectTo = router.query.redirect || '/profile';

  // ── If authenticated, profile complete, and not loading → redirect ──
  useEffect(() => {
    if (isAuthenticated && !loading && !needsCompletion) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, loading, needsCompletion, router, redirectTo]);

  // ── If authenticated and complete, return null (will redirect) ──
  if (isAuthenticated && !needsCompletion) return null;

  // ── Otherwise show AuthScreen (login/register or completion form) ──
  return <AuthScreen redirectTo={redirectTo} />;
}