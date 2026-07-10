// frontend/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, onAuthStateChanged } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ============================================================
  // Fetch user profile from backend
  // ============================================================
  const fetchUserProfile = useCallback(async (firebaseUser) => {
    try {
      // Get the ID token
      const token = await firebaseUser.getIdToken();
      
      // Call your backend /auth/me
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          ...response.data.user,
        };
      }
      return null;
    } catch (error) {
      console.error('[Auth] Failed to fetch profile:', error);
      // If user exists in Firebase but not in our DB (rare), they might need to complete profile
      return null;
    }
  }, []);

  // ============================================================
  // Listen to Firebase Auth State
  // ============================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        // User is signed in to Firebase
        try {
          const profile = await fetchUserProfile(firebaseUser);
          if (profile) {
            setUser(profile);
            setIsAuthenticated(true);
          } else {
            // User exists in Firebase but not in our DB
            // Store minimal data and let them complete profile
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              completed: false,
            });
            setIsAuthenticated(true);
          }
        } catch (error) {
          console.error('[Auth] Error during auth state sync:', error);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        // User is signed out
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  // ============================================================
  // LOGIN
  // ============================================================
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Fetch profile from backend
      const profile = await fetchUserProfile(firebaseUser);
      if (profile) {
        setUser(profile);
        setIsAuthenticated(true);
      } else {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          completed: false,
        });
        setIsAuthenticated(true);
      }
      return { success: true };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      let message = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Please wait.';
      return { success: false, error: message };
    }
  };

  // ============================================================
  // REGISTER
  // ============================================================
  const register = async (email, password, fullname, username) => {
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Get ID token
      const token = await firebaseUser.getIdToken();

      // 3. Register user in your backend
      const response = await api.post('/auth/register', {
        uid: firebaseUser.uid,
        username,
        fullname,
        email,
        avatar: '',
        referralCode: '',
        deviceFingerprint: 'web',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        // 4. Set user state
        setUser({
          uid: firebaseUser.uid,
          email,
          ...response.data.user,
        });
        setIsAuthenticated(true);
        return { success: true };
      } else {
        // If backend fails, clean up Firebase user
        await firebaseUser.delete();
        return { success: false, error: response.data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('[Auth] Register error:', error);
      let message = 'Registration failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') message = 'This email is already registered.';
      if (error.code === 'auth/weak-password') message = 'Password must be at least 6 characters.';
      return { success: false, error: message };
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      return { success: false, error: 'Logout failed' };
    }
  };

  // ============================================================
  // RESET PASSWORD
  // ============================================================
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('[Auth] Reset password error:', error);
      let message = 'Could not send reset email.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      return { success: false, error: message };
    }
  };

  // ============================================================
  // REFRESH USER PROFILE
  // ============================================================
  const refreshUser = useCallback(async () => {
    if (auth.currentUser) {
      const profile = await fetchUserProfile(auth.currentUser);
      if (profile) {
        setUser(profile);
        setIsAuthenticated(true);
        return profile;
      }
    }
    return null;
  }, [fetchUserProfile]);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    resetPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}