// pages/login.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthScreen, { useAuth } from '../components/AuthScreen';
import Meta from '../components/Meta';

export default function Login() {
  const router = useRouter();
  const { isAuthenticated, loading, needsCompletion, logout } = useAuth();

  const redirectTo = router.query.redirect || '/profile';

  // ── Only redirect if authenticated AND profile is complete ──
  useEffect(() => {
    if (isAuthenticated && !loading && !needsCompletion) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, loading, needsCompletion, router, redirectTo]);

  // ── Log out if user leaves the page while profile is incomplete ──
  useEffect(() => {
    const handleRouteChange = () => {
      if (isAuthenticated && needsCompletion) {
        logout();
      }
    };

    const handleBeforeUnload = () => {
      if (isAuthenticated && needsCompletion) {
        logout();
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, needsCompletion, logout, router.events]);

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
  return (
    <>
      <Meta
        title="Login | Make Trend"
        description="Sign in to your Make Trend account to create and manage campaigns."
        image="https://maketrend.app/og-image.png"
        url="https://maketrend.app/login"
      />
      <AuthScreen redirectTo={redirectTo} />
    </>
  );
}