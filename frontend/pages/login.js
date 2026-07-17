// pages/login.js
import React, { useEffect } from 'react';
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

  // ── Render AuthScreen (handles all UI, loading, and success) ──
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-50 via-white to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <AuthScreen redirectTo={redirectTo} />
      </div>
    </div>
  );
}