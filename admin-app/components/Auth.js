// components/Auth.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL + '/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser ? firebaseUser.email : 'null');
      setLoading(true);
      setError(null);
      
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          console.log('✅ Firebase token obtained');

          // Check admin claim
          const tokenResult = await firebaseUser.getIdTokenResult();
          const isAdmin = tokenResult.claims.admin === true;
          console.log('🔑 Admin claim:', isAdmin);

          // Fetch user profile
          console.log('📡 Fetching user profile from:', `${API_BASE}/auth/me`);
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          console.log('📡 Response status:', res.status);
          
          if (!res.ok) {
            const text = await res.text();
            console.error('❌ Backend error:', res.status, text);
            throw new Error(`Backend auth error: ${res.status} - ${text}`);
          }
          
          const data = await res.json();
          console.log('📡 Backend response:', data);
          
          if (data.success) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...data.user,
              isAdmin: isAdmin,
            });
            setIsAuthenticated(true);
            console.log('✅ User authenticated:', firebaseUser.email);
          } else {
            throw new Error(data.error || 'Profile fetch failed');
          }
        } catch (err) {
          console.error('❌ Auth error:', err.message);
          setError(err.message);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        console.log('🔓 User logged out');
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login for:', email);
      await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login successful, waiting for auth state...');
      return { success: true };
    } catch (err) {
      console.error('❌ Login error:', err.code, err.message);
      let message = err.message;
      if (err.code === 'auth/user-not-found') message = 'No account found with this email.';
      if (err.code === 'auth/wrong-password') message = 'Incorrect password.';
      if (err.code === 'auth/too-many-requests') message = 'Too many failed attempts. Please wait.';
      if (err.code === 'auth/invalid-email') message = 'Invalid email address.';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = { user, loading, isAuthenticated, error, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { auth };