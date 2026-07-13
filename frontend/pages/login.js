// pages/login.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthScreen from '../components/AuthScreen';
import { auth } from '../services/firebase';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setIsAuthenticated(true);
        router.push('/profile');
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <>
      {/* ── Fixed Background Layer ── */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-purple-50 via-white to-indigo-100">
        {/* Decorative elements */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-300/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-indigo-300/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-200/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40" />

        {/* Floating shapes */}
        <div className="absolute top-24 left-10 text-purple-400/30 hidden sm:block">
          <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="absolute bottom-24 right-10 text-indigo-400/30 hidden sm:block">
          <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* ── Content Layer ── */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md">
          <AuthScreen
            onSuccess={() => {
              router.push('/profile');
            }}
          />
          <p className="mt-6 text-center text-xs text-gray-400/70">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-purple-500 hover:underline">Terms</a> and{' '}
            <a href="/privacy" className="text-purple-500 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </>
  );
}