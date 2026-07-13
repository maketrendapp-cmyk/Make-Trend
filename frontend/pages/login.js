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
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-purple-50 via-white to-indigo-100 flex items-center justify-center px-4">
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