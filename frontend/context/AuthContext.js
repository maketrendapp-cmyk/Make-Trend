// frontend/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  auth, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from '../services/firebase';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsCompletion, setNeedsCompletion] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const completionDataRef = useRef(null);

  // ============================================================
  // UPLOAD AVATAR (Cloudinary via backend)
  // ============================================================
  const uploadAvatar = async (file) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append('image', file);

    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.success) {
      return response.data.url;
    } else {
      throw new Error(response.data.error || 'Upload failed');
    }
  };

  // ============================================================
  // FETCH USER PROFILE FROM BACKEND
  // ============================================================
  const fetchUserProfile = useCallback(async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          ...response.data.user,
          completed: true,
        };
      }
      return null;
    } catch (error) {
      console.error('[Auth] Failed to fetch profile:', error);
      return null;
    }
  }, []);

  // ============================================================
  // CHECK IF PROFILE EXISTS AND COMPLETED
  // ============================================================
  const checkProfileStatus = useCallback(async (uid) => {
    try {
      const response = await api.get(`/auth/profile?uid=${uid}`);
      if (response.data.success) {
        return response.data; // { completed, username }
      }
      return { completed: false };
    } catch {
      return { completed: false };
    }
  }, []);

  // ============================================================
  // AUTH STATE LISTENER
  // ============================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        // Check if banned
        try {
          const banResponse = await api.get(`/auth/check-ban?uid=${firebaseUser.uid}`);
          if (banResponse.data.banned) {
            await signOut(auth);
            setUser(null);
            setIsAuthenticated(false);
            setNeedsCompletion(false);
            setLoading(false);
            return;
          }
        } catch {
          console.warn('[Auth] Ban check failed');
        }

        // Try to fetch full profile
        const profile = await fetchUserProfile(firebaseUser);
        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);
          setNeedsCompletion(false);
        } else {
          // Profile doesn't exist or incomplete – check status
          const status = await checkProfileStatus(firebaseUser.uid);
          if (status.completed) {
            const fallbackProfile = await fetchUserProfile(firebaseUser);
            if (fallbackProfile) {
              setUser(fallbackProfile);
              setIsAuthenticated(true);
              setNeedsCompletion(false);
            } else {
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
                completed: false,
              });
              setIsAuthenticated(true);
              setNeedsCompletion(true);
            }
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              completed: false,
            });
            setIsAuthenticated(true);
            setNeedsCompletion(true);
          }
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setNeedsCompletion(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile, checkProfileStatus]);

  // ============================================================
  // LOGIN (Email/Password)
  // ============================================================
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const profile = await fetchUserProfile(firebaseUser);
      if (profile) {
        setUser(profile);
        setIsAuthenticated(true);
        setNeedsCompletion(false);
      } else {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          completed: false,
        });
        setIsAuthenticated(true);
        setNeedsCompletion(true);
      }
      return { success: true };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      let message = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Please wait.';
      if (error.code === 'auth/invalid-email') message = 'Please enter a valid email address.';
      return { success: false, error: message };
    }
  };

  // ============================================================
  // REGISTER (Email/Password)
  // ============================================================
  const register = async (email, password, fullname, username, avatarUrl, referralCode = '') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const token = await firebaseUser.getIdToken();

      const response = await api.post('/auth/register', {
        uid: firebaseUser.uid,
        username,
        fullname,
        email,
        avatar: avatarUrl || '',
        referralCode,
        deviceFingerprint: 'web',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setUser({
          uid: firebaseUser.uid,
          email,
          ...response.data.user,
          completed: true,
        });
        setIsAuthenticated(true);
        setNeedsCompletion(false);
        return { success: true };
      } else {
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
  // SOCIAL LOGIN (Google / Facebook)
  // ============================================================
  const socialLogin = async (providerName) => {
    setIsSocialLoading(true);
    let provider;
    if (providerName === 'google') {
      provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
    } else if (providerName === 'facebook') {
      provider = new FacebookAuthProvider();
      provider.addScope('email');
      provider.addScope('public_profile');
    } else {
      throw new Error('Unsupported provider');
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      try {
        const banResponse = await api.get(`/auth/check-ban?uid=${firebaseUser.uid}`);
        if (banResponse.data.banned) {
          await signOut(auth);
          setIsSocialLoading(false);
          return { success: false, error: 'Your account has been suspended. Contact support.' };
        }
      } catch {
        // proceed
      }

      const status = await checkProfileStatus(firebaseUser.uid);
      if (status.completed) {
        const profile = await fetchUserProfile(firebaseUser);
        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);
          setNeedsCompletion(false);
          setIsSocialLoading(false);
          return { success: true };
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            completed: false,
          });
          setIsAuthenticated(true);
          setNeedsCompletion(true);
          setIsSocialLoading(false);
          return { success: true, needsCompletion: true };
        }
      } else {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          completed: false,
        });
        setIsAuthenticated(true);
        setNeedsCompletion(true);
        setIsSocialLoading(false);
        return { success: true, needsCompletion: true };
      }
    } catch (error) {
      console.error('[Auth] Social login error:', error);
      let message = 'Unable to sign in. Please try again.';
      if (error.code === 'auth/popup-blocked') {
        message = 'Please allow pop-ups for this site.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = 'Login popup was closed. Please try again.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized for login.';
      }
      setIsSocialLoading(false);
      return { success: false, error: message };
    }
  };

  // ============================================================
  // COMPLETE SOCIAL PROFILE
  // ============================================================
  const completeSocialProfile = async (fullname, username, avatarUrl) => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Not authenticated');

      const token = await firebaseUser.getIdToken();
      const response = await api.post('/auth/complete-social', {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        fullname,
        username,
        avatar: avatarUrl || '',
        referralCode: '',
        deviceFingerprint: 'web',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const profile = await fetchUserProfile(firebaseUser);
        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);
          setNeedsCompletion(false);
          return { success: true };
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            fullname,
            username,
            avatar: avatarUrl || '',
            completed: true,
          });
          setIsAuthenticated(true);
          setNeedsCompletion(false);
          return { success: true };
        }
      } else {
        return { success: false, error: response.data.error || 'Failed to complete profile' };
      }
    } catch (error) {
      console.error('[Auth] Complete profile error:', error);
      return { success: false, error: 'Could not complete profile. Please try again.' };
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
      setNeedsCompletion(false);
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
  // REFRESH USER
  // ============================================================
  const refreshUser = useCallback(async () => {
    if (auth.currentUser) {
      const profile = await fetchUserProfile(auth.currentUser);
      if (profile) {
        setUser(profile);
        setIsAuthenticated(true);
        setNeedsCompletion(false);
        return profile;
      }
    }
    return null;
  }, [fetchUserProfile]);

  const value = {
    user,
    loading,
    isAuthenticated,
    needsCompletion,
    isSocialLoading,
    login,
    register,
    socialLogin,
    completeSocialProfile,
    uploadAvatar,
    logout,
    resetPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}