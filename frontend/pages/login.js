// pages/login.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthScreen, { useAuth } from '../components/AuthScreen';

export default function Login() {
  const router = useRouter();
  const { isAuthenticated, loading, needsCompletion } = useAuth();

  const redirectTo = router.query.redirect || '/profile';

  // ── Only redirect if authenticated AND profile is complete ──
  useEffect(() => {
    if (isAuthenticated && !loading && !needsCompletion) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, loading, needsCompletion, router, redirectTo]);

  // ── Show a loading spinner while auth state is being resolved ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  // ── If authenticated and profile is complete, return null (will redirect) ──
  if (isAuthenticated && !needsCompletion) return null;

  // ── Render AuthScreen – it will show the completion form if needed ──
  return <AuthScreen redirectTo={redirectTo} />;
}