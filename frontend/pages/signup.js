// pages/signup.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthScreen, { useAuth } from '../components/AuthScreen';
import Meta from '../components/Meta';

export default function Signup() {
  const router = useRouter();
  const { isAuthenticated, loading, needsCompletion, logout } = useAuth();
  const { ref, redirect } = router.query;

  const redirectTo = redirect || '/profile';

  // ── Redirect if already authenticated with a complete profile ──
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

  // ── Show loading spinner while auth state is being resolved ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  // ── If authenticated and profile is complete, return null (will redirect) ──
  if (isAuthenticated && !needsCompletion) return null;

  // ── Build dynamic meta tags with referral code ──
  const referralCode = ref ? ref.toUpperCase() : '';
  const metaTitle = referralCode
    ? `Join Make Trend with referral code ${referralCode} | Make Trend`
    : 'Join Make Trend – Sign Up & Start Creating';
  const metaDescription = referralCode
    ? `Create your Make Trend account using referral code ${referralCode} and start launching viral campaigns!`
    : 'Create your Make Trend account and start launching viral campaigns.';
  const metaUrl = `https://maketrend.app/signup${referralCode ? `?ref=${referralCode}` : ''}`;

  return (
    <>
      <Meta
        title={metaTitle}
        description={metaDescription}
        image="https://maketrend.app/og-image.png"
        url={metaUrl}
      />
      <AuthScreen redirectTo={redirectTo} />
    </>
  );
}