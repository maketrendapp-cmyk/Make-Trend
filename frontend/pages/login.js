// pages/login.js
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import AuthScreen from '../components/AuthScreen';

export default function Login() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  // If already logged in, redirect to profile
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/profile');
    }
  }, [isAuthenticated, loading, router]);

  // Show nothing while checking auth state (or a loading spinner)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // If not authenticated, show the AuthScreen
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <AuthScreen
          onSuccess={() => {
            router.push('/profile');
          }}
        />
      </div>
    </div>
  );
}