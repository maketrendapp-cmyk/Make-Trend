// components/AuthScreen.js
// ============================================================
// FINAL UI: "MAKE TREND" Hero Title, Compact & Professional
// ============================================================

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

// ============================================================
// BACKEND API HELPER
// ============================================================
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com/api';

async function apiRequest(endpoint, options = {}, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    options.body = JSON.stringify(options.body);
  }
  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `API error: ${response.status}`);
  return data;
}

// ============================================================
// AUTH CONTEXT
// ============================================================
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsCompletion, setNeedsCompletion] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  // Upload Avatar
  const uploadAvatar = async (file) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('Not authenticated');
    const token = await firebaseUser.getIdToken();
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || 'Upload failed');
    return data.url;
  };

  // Fetch user profile
  const fetchUserProfile = useCallback(async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      const data = await apiRequest('/auth/me', {}, token);
      return data.success ? { uid: firebaseUser.uid, email: firebaseUser.email, ...data.user, completed: true } : null;
    } catch {
      return null;
    }
  }, []);

  // Check profile status
  const checkProfileStatus = useCallback(async (uid) => {
    try {
      const data = await apiRequest(`/auth/profile?uid=${uid}`);
      return data || { completed: false };
    } catch {
      return { completed: false };
    }
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const data = await apiRequest(`/auth/check-ban?uid=${firebaseUser.uid}`);
          if (data.banned) {
            await signOut(auth);
            setUser(null);
            setIsAuthenticated(false);
            setNeedsCompletion(false);
            setLoading(false);
            return;
          }
        } catch {}

        const profile = await fetchUserProfile(firebaseUser);
        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);
          setNeedsCompletion(false);
        } else {
          const status = await checkProfileStatus(firebaseUser.uid);
          if (status.completed) {
            const fallback = await fetchUserProfile(firebaseUser);
            if (fallback) {
              setUser(fallback);
              setIsAuthenticated(true);
              setNeedsCompletion(false);
            } else {
              setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName || '', photoURL: firebaseUser.photoURL || '', completed: false });
              setIsAuthenticated(true);
              setNeedsCompletion(true);
            }
          } else {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName || '', photoURL: firebaseUser.photoURL || '', completed: false });
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

  // Login
  const login = async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = cred.user;
      const profile = await fetchUserProfile(firebaseUser);
      if (profile) {
        setUser(profile);
        setIsAuthenticated(true);
        setNeedsCompletion(false);
      } else {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, completed: false });
        setIsAuthenticated(true);
        setNeedsCompletion(true);
      }
      return { success: true };
    } catch (error) {
      let message = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Please wait.';
      return { success: false, error: message };
    }
  };

  // Register
  const register = async (email, password, fullname, username, avatarUrl, referralCode = '') => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = cred.user;
      const token = await firebaseUser.getIdToken();
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: { uid: firebaseUser.uid, username, fullname, email, avatar: avatarUrl || '', referralCode, deviceFingerprint: 'web' },
      }, token);
      if (data.success) {
        setUser({ uid: firebaseUser.uid, email, ...data.user, completed: true });
        setIsAuthenticated(true);
        setNeedsCompletion(false);
        return { success: true };
      } else {
        await firebaseUser.delete();
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      let message = 'Registration failed.';
      if (error.code === 'auth/email-already-in-use') message = 'Email already registered.';
      if (error.code === 'auth/weak-password') message = 'Password must be at least 6 characters.';
      return { success: false, error: message };
    }
  };

  // Social Login
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
      setIsSocialLoading(false);
      return { success: false, error: 'Unsupported provider' };
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      try {
        const data = await apiRequest(`/auth/check-ban?uid=${firebaseUser.uid}`);
        if (data.banned) {
          await signOut(auth);
          setIsSocialLoading(false);
          return { success: false, error: 'Account suspended.' };
        }
      } catch {}

      const status = await checkProfileStatus(firebaseUser.uid);
      if (status.completed) {
        const profile = await fetchUserProfile(firebaseUser);
        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);
          setNeedsCompletion(false);
          setIsSocialLoading(false);
          return { success: true };
        }
      }

      const socialUserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || '',
        photoURL: firebaseUser.photoURL || '',
        completed: false,
      };
      setUser(socialUserData);
      setIsAuthenticated(true);
      setNeedsCompletion(true);
      setIsSocialLoading(false);
      return { success: true, needsCompletion: true, user: socialUserData };
    } catch (error) {
      let message = 'Unable to sign in.';
      if (error.code === 'auth/popup-blocked') message = 'Popup blocked. Please allow popups.';
      if (error.code === 'auth/popup-closed-by-user') message = 'Popup closed. Try again.';
      setIsSocialLoading(false);
      return { success: false, error: message };
    }
  };

  // Complete Social Profile
  const completeSocialProfile = async (fullname, username, avatarUrl) => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Not authenticated');
      const token = await firebaseUser.getIdToken();
      const data = await apiRequest('/auth/complete-social', {
        method: 'POST',
        body: { uid: firebaseUser.uid, email: firebaseUser.email, fullname, username, avatar: avatarUrl || '', referralCode: '', deviceFingerprint: 'web' },
      }, token);
      if (data.success) {
        const profile = await fetchUserProfile(firebaseUser);
        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);
          setNeedsCompletion(false);
          return { success: true };
        } else {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, fullname, username, avatar: avatarUrl || '', completed: true });
          setIsAuthenticated(true);
          setNeedsCompletion(false);
          return { success: true };
        }
      } else {
        return { success: false, error: data.error || 'Failed to complete profile' };
      }
    } catch (error) {
      return { success: false, error: 'Could not complete profile.' };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
      setNeedsCompletion(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Logout failed' };
    }
  };

  // Reset Password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      let message = 'Could not send reset email.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      return { success: false, error: message };
    }
  };

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
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// ============================================================
// AUTH SCREEN UI COMPONENT (FINAL)
// ============================================================
export default function AuthScreen({ onSuccess }) {
  const {
    login,
    register,
    socialLogin,
    completeSocialProfile,
    uploadAvatar,
    isSocialLoading,
    resetPassword,
    user,
  } = useAuth();

  // State
  const [email, setEmail] = useState('');
  const [emailExists, setEmailExists] = useState(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [socialUser, setSocialUser] = useState(null);
  const [needsSocialCompletion, setNeedsSocialCompletion] = useState(false);
  const [socialFullname, setSocialFullname] = useState('');
  const [socialUsername, setSocialUsername] = useState('');
  const [socialAvatarPreview, setSocialAvatarPreview] = useState('');
  const [socialAvatarFile, setSocialAvatarFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const emailTimerRef = useRef(null);
  const usernameTimerRef = useRef(null);

  // Check for social completion
  useEffect(() => {
    if (user && user.completed === false && !needsSocialCompletion) {
      setSocialUser(user);
      setSocialFullname(user.displayName || '');
      setSocialAvatarPreview(user.photoURL || '');
      setNeedsSocialCompletion(true);
    }
  }, [user, needsSocialCompletion]);

  // Email check
  useEffect(() => {
    if (email.length > 3 && email.includes('@') && !needsSocialCompletion) {
      clearTimeout(emailTimerRef.current);
      setIsCheckingEmail(true);
      setEmailError('');
      setEmailExists(null);

      emailTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`${API_BASE}/auth/check-email?email=${encodeURIComponent(email)}`);
          if (!res.ok) throw new Error('Backend error');
          const data = await res.json();
          setEmailExists(data.exists);
        } catch {
          setEmailExists(null);
          setEmailError('Could not verify email. Please try again.');
        } finally {
          setIsCheckingEmail(false);
        }
      }, 600);
    } else {
      setEmailExists(null);
      setIsCheckingEmail(false);
      setEmailError('');
    }
    return () => clearTimeout(emailTimerRef.current);
  }, [email, needsSocialCompletion]);

  // Username check
  const usernameToCheck = needsSocialCompletion ? socialUsername : username;
  const isRegisterMode = (emailExists === false && email.length > 3) || needsSocialCompletion;

  useEffect(() => {
    if (isRegisterMode && usernameToCheck.length >= 3) {
      clearTimeout(usernameTimerRef.current);
      setIsCheckingUsername(true);
      setUsernameAvailable(null);

      usernameTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`${API_BASE}/auth/check-username?username=${encodeURIComponent(usernameToCheck)}`);
          if (!res.ok) throw new Error('Backend error');
          const data = await res.json();
          setUsernameAvailable(data.available);
        } catch {
          setUsernameAvailable(null);
        } finally {
          setIsCheckingUsername(false);
        }
      }, 500);
    } else {
      setUsernameAvailable(null);
      setIsCheckingUsername(false);
    }
    return () => clearTimeout(usernameTimerRef.current);
  }, [isRegisterMode, usernameToCheck]);

  // Password strength
  useEffect(() => {
    if (!password) { setPasswordStrength(0); return; }
    let score = 0;
    if (password.length >= 6) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    setPasswordStrength(score);
  }, [password]);

  // Social login handler
  const handleSocialLogin = async (provider) => {
    setError('');
    const result = await socialLogin(provider);
    if (result.success) {
      if (result.needsCompletion) {
        const userData = result.user || {};
        setSocialUser(userData);
        setSocialFullname(userData.displayName || '');
        setSocialAvatarPreview(userData.photoURL || '');
        setNeedsSocialCompletion(true);
        setError('');
      } else {
        onSuccess?.();
      }
    } else {
      setError(result.error || `Failed to sign in with ${provider}.`);
    }
  };

  // Social completion handler
  const handleSocialCompletion = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (socialFullname.length < 2) {
      setError('Full name must be at least 2 characters.');
      setIsSubmitting(false);
      return;
    }
    if (socialUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      setIsSubmitting(false);
      return;
    }
    if (usernameAvailable === false) {
      setError('Username is already taken.');
      setIsSubmitting(false);
      return;
    }

    let avatarUrl = socialAvatarPreview || '';
    if (socialAvatarFile) {
      try {
        if (socialAvatarFile.size > 5 * 1024 * 1024) {
          setError('Image must be smaller than 5MB.');
          setIsSubmitting(false);
          return;
        }
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(socialAvatarFile.type)) {
          setError('Only JPEG, PNG, WEBP, GIF allowed.');
          setIsSubmitting(false);
          return;
        }
        avatarUrl = await uploadAvatar(socialAvatarFile);
      } catch (err) {
        setError('Avatar upload failed. You can add it later.');
        setIsSubmitting(false);
        return;
      }
    }

    const result = await completeSocialProfile(socialFullname, socialUsername, avatarUrl);
    if (result.success) {
      setNeedsSocialCompletion(false);
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to complete profile.');
    }
    setIsSubmitting(false);
  };

  // Email/password form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (emailExists === true) {
      // Login
      const result = await login(email, password);
      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || 'Login failed.');
      }
    } else {
      // Register
      if (fullname.length < 2) {
        setError('Full name must be at least 2 characters.');
        setIsSubmitting(false);
        return;
      }
      if (username.length < 3) {
        setError('Username must be at least 3 characters.');
        setIsSubmitting(false);
        return;
      }
      if (usernameAvailable === false) {
        setError('Username is already taken.');
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setIsSubmitting(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setIsSubmitting(false);
        return;
      }
      if (avatarFile) {
        if (avatarFile.size > 5 * 1024 * 1024) {
          setError('Image must be smaller than 5MB.');
          setIsSubmitting(false);
          return;
        }
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(avatarFile.type)) {
          setError('Only JPEG, PNG, WEBP, GIF allowed.');
          setIsSubmitting(false);
          return;
        }
      }

      let avatarUrl = '';
      const result = await register(email, password, fullname, username, avatarUrl, referralCode);
      if (result.success) {
        if (avatarFile) {
          try {
            const uploadedUrl = await uploadAvatar(avatarFile);
            onSuccess?.();
          } catch (err) {
            console.warn('Avatar upload after registration failed:', err);
          }
        }
        onSuccess?.();
      } else {
        setError(result.error || 'Registration failed.');
      }
    }
    setIsSubmitting(false);
  };

  // Avatar handler for registration (only local preview)
  const handleAvatarChange = (e, type = 'register') => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB.');
      e.target.value = '';
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Only JPEG, PNG, WEBP, GIF allowed.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (type === 'register') {
        setAvatarFile(file);
        setAvatarPreview(event.target.result);
      } else {
        setSocialAvatarFile(file);
        setSocialAvatarPreview(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    const result = await resetPassword(email);
    if (result.success) {
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } else {
      setError(result.error || 'Failed to send reset email.');
    }
  };

  // ============================================================
  // RENDER: SOCIAL COMPLETION
  // ============================================================
  if (needsSocialCompletion) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12 animate-fadeIn">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-border transition-all duration-300 hover:shadow-md">

          {/* Avatar section */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 bg-gray-100 flex items-center justify-center shadow-sm">
              {socialAvatarPreview ? (
                <img src={socialAvatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
            </div>
            <label className="mt-2 cursor-pointer text-sm font-medium text-primary hover:text-primary/80 transition border border-dashed border-gray-300 rounded-lg px-4 py-1.5 hover:border-primary/50">
              Upload Profile Picture
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarChange(e, 'social')} disabled={isSubmitting} />
            </label>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP, GIF • Max 5MB</p>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Complete Your Profile</h2>
          <p className="text-sm text-center text-gray-400 mb-6">One more step to get started</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600 animate-slideDown">
              {error}
            </div>
          )}

          <form onSubmit={handleSocialCompletion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={socialFullname}
                onChange={(e) => setSocialFullname(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <div className="relative">
                <input
                  type="text"
                  value={socialUsername}
                  onChange={(e) => setSocialUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="john_doe"
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
                    usernameAvailable === true && socialUsername.length >= 3
                      ? 'border-green-500 focus:ring-green-200'
                      : usernameAvailable === false && socialUsername.length >= 3
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-border focus:border-primary focus:ring-primary/20'
                  }`}
                  required
                  disabled={isSubmitting}
                />
                {isCheckingUsername && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    <span className="animate-pulse">⏳</span>
                  </span>
                )}
                {!isCheckingUsername && socialUsername.length >= 3 && usernameAvailable === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-600 font-medium">✓ Available</span>
                )}
                {!isCheckingUsername && socialUsername.length >= 3 && usernameAvailable === false && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-red-600 font-medium">✗ Taken</span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">3-30 characters, lowercase letters, numbers, underscore.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="w-full rounded-lg border border-border bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
                {socialUser?.email || '—'}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Complete Profile'}
            </button>

            <p className="mt-4 text-center text-xs text-gray-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setNeedsSocialCompletion(false); setSocialUser(null); setError(''); }}
                className="text-primary hover:underline font-medium"
              >
                Back to login
              </button>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: MAIN LOGIN/REGISTER FLOW
  // ============================================================
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12 animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-border transition-all duration-300 hover:shadow-md">

        {/* ===== HERO TITLE ===== */}
        <div className="text-center mb-4">
          <h1 className="axis-hero-title">
            <span className="axis-word">MAKE</span>
            <span className="battle-word">TREND</span>
          </h1>
        </div>

        {/* ===== AVATAR SECTION (only in register mode) ===== */}
        {emailExists === false && email.length > 3 && (
          <div className="flex flex-col items-center mb-3 animate-slideDown">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 bg-gray-100 flex items-center justify-center shadow-sm">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
            </div>
            <label className="mt-2 cursor-pointer text-sm font-medium text-primary hover:text-primary/80 transition border border-dashed border-gray-300 rounded-lg px-4 py-1.5 hover:border-primary/50">
              Upload Profile Picture
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarChange(e, 'register')} disabled={isSubmitting} />
            </label>
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WEBP, GIF • Max 5MB</p>
            <p className="text-sm text-gray-500 mt-2">Create your account in seconds</p>
          </div>
        )}

        {/* ===== SUBTITLE ===== */}
        <div className="text-center mb-3">
          <p className="text-sm text-gray-400">
            {emailExists === true ? 'Welcome back! Enter your password.' :
             emailExists === false && email.length > 3 ? 'Fill in your details below' :
             'Enter your email to get started'}
          </p>
        </div>

        {/* ===== ERROR / SUCCESS ===== */}
        {error && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600 animate-slideDown">
            {error}
          </div>
        )}
        {resetSent && (
          <div className="mb-3 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-600 animate-slideDown">
            ✅ Password reset link sent!
          </div>
        )}

        {/* ===== FORM ===== */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* EMAIL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
                  emailExists === true && email.length > 3
                    ? 'border-green-500 focus:ring-green-200 bg-green-50'
                    : emailExists === false && email.length > 3
                    ? 'border-primary focus:ring-primary/20 bg-primary/5'
                    : emailError
                    ? 'border-red-500 focus:ring-red-200'
                    : 'border-border focus:border-primary focus:ring-primary/20'
                }`}
                disabled={isSubmitting}
                required
              />
              {isCheckingEmail && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  <span className="animate-pulse">⏳</span>
                </span>
              )}
              {!isCheckingEmail && email.length > 3 && emailExists === true && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-600 font-medium">✓ Exists</span>
              )}
              {!isCheckingEmail && email.length > 3 && emailExists === false && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary font-medium">New ✨</span>
              )}
            </div>
            {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
            {emailExists === true && email.length > 3 && (
              <p className="mt-1 text-xs text-gray-400">
                Existing account — enter your password below.
                <button type="button" onClick={handleResetPassword} className="ml-1 text-primary hover:underline">Forgot password?</button>
              </p>
            )}
            {emailExists === false && email.length > 3 && (
              <p className="mt-1 text-xs text-gray-400">New account — fill in your details below.</p>
            )}
          </div>

          {/* LOGIN PASSWORD */}
          {emailExists === true && (
            <div className="animate-slideDown">
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10 transition"
                  required
                  disabled={isSubmitting}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          )}

          {/* REGISTER FIELDS */}
          {emailExists === false && email.length > 3 && (
            <div className="space-y-3 animate-slideDown">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="john_doe"
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
                      usernameAvailable === true && username.length >= 3
                        ? 'border-green-500 focus:ring-green-200'
                        : usernameAvailable === false && username.length >= 3
                        ? 'border-red-500 focus:ring-red-200'
                        : 'border-border focus:border-primary focus:ring-primary/20'
                    }`}
                    required
                    disabled={isSubmitting}
                  />
                  {isCheckingUsername && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      <span className="animate-pulse">⏳</span>
                    </span>
                  )}
                  {!isCheckingUsername && username.length >= 3 && usernameAvailable === true && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-600 font-medium">✓ Available</span>
                  )}
                  {!isCheckingUsername && username.length >= 3 && usernameAvailable === false && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-red-600 font-medium">✗ Taken</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400">3-30 characters, lowercase letters, numbers, underscore.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 pr-10 transition"
                    required
                    disabled={isSubmitting}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-1">
                    <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 rounded-full ${
                        passwordStrength <= 1 ? 'bg-red-500 w-1/4' :
                        passwordStrength === 2 ? 'bg-yellow-500 w-2/4' :
                        passwordStrength === 3 ? 'bg-blue-500 w-3/4' :
                        'bg-green-500 w-full'
                      }`} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Strength: {
                        passwordStrength <= 1 ? 'Weak' :
                        passwordStrength === 2 ? 'Fair' :
                        passwordStrength === 3 ? 'Good' :
                        'Strong'
                      }
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  required
                  disabled={isSubmitting}
                />
                {confirmPassword && password && confirmPassword !== password && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
                )}
                {confirmPassword && password && confirmPassword === password && (
                  <p className="mt-1 text-xs text-green-600">✓ Passwords match.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referral Code (optional)</label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="ENTER CODE"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase transition"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          {emailExists !== null && email.length > 3 && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {isSubmitting ? 'Processing...' : emailExists === true ? 'Log In' : 'Create Account'}
            </button>
          )}

          {emailExists === null && email.length > 3 && (
            <button
              type="button"
              disabled={isCheckingEmail}
              className="w-full rounded-lg bg-gray-200 py-3 text-sm font-semibold text-gray-500 cursor-not-allowed"
            >
              {isCheckingEmail ? 'Verifying...' : 'Enter email to continue'}
            </button>
          )}
        </form>

        {/* ===== DIVIDER ===== */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-gray-400">Or continue with</span></div>
        </div>

        {/* ===== SOCIAL BUTTONS ===== */}
        <div className="flex gap-3">
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={isSocialLoading || isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          <button
            onClick={() => handleSocialLogin('facebook')}
            disabled={isSocialLoading || isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>
        </div>

        {/* ===== SWITCH LINKS ===== */}
        {emailExists === false && email.length > 3 && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => { setEmailExists(null); setPassword(''); setError(''); }}
              className="text-primary hover:underline font-medium"
            >
              Use a different email
            </button>
          </p>
        )}
        {emailExists === true && (
          <p className="mt-4 text-center text-xs text-gray-400">
            New here?{' '}
            <button
              type="button"
              onClick={() => { setEmailExists(null); setPassword(''); setFullname(''); setUsername(''); setError(''); }}
              className="text-primary hover:underline font-medium"
            >
              Create an account
            </button>
          </p>
        )}
      </div>

      {/* ===== CSS STYLES ===== */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }

        /* ===== HERO TITLE STYLES ===== */
        .axis-hero-title {
          font-family: 'Orbitron', 'Inter', sans-serif;
          font-size: clamp(36px, 7vw, 68px);
          font-weight: 900;
          letter-spacing: 3px;
          text-transform: uppercase;
          line-height: 1.05;
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 0.3em;
        }

        .axis-word {
          background: linear-gradient(135deg, #ffffff 0%, #00f0ff 60%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0 0 20px rgba(0, 240, 255, 0.5));
        }

        .battle-word {
          background: linear-gradient(135deg, #ff4ef8 0%, #ff8ef5 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          filter: drop-shadow(0 0 20px rgba(255, 78, 248, 0.5));
        }

        @media (max-width: 480px) {
          .axis-hero-title {
            font-size: clamp(28px, 10vw, 36px);
            gap: 0.1em;
          }
        }
      `}</style>
    </div>
  );
}