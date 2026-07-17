// components/AuthScreen.js
// ============================================================
// COMPLETE – AuthProvider + Premium UI (Deployment-Ready)
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
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
import { useAppData } from '../lib/useAppData';
import Meta from '../components/Meta';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMail,
  FiLock,
  FiUser,
  FiUserPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiSparkles,
  FiTrendingUp,
  FiUsers,
  FiAward,
} from 'react-icons/fi';
import { FaGoogle, FaFacebook } from 'react-icons/fa';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com/api';

// ============================================================
// BACKEND API HELPER
// ============================================================
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
// AUTH CONTEXT (FULL – PRESERVED)
// ============================================================
const AuthContext = createContext();

export function AuthProvider({ children }) {
  // --- AUTH STATE ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsCompletion, setNeedsCompletion] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  // --- ALL DATA FROM useAppData ---
  const {
    templates,
    featuredTemplates,
    profile,
    campaigns,
    supportTickets,
    comments,
    stats,
    dataLoaded,
    loadAllData,
    refetchProfile,
    refetchCampaigns,
    refetchStats,
    refetchSupportTickets,
    refetchComments,
    refetchTemplates,
    clearUserData,
  } = useAppData();

  // --- Upload Avatar ---
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

  // --- Fetch user profile (for auth logic) ---
  const fetchUserProfile = useCallback(async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken();
      const data = await apiRequest('/auth/me', {}, token);
      return data.success ? { uid: firebaseUser.uid, email: firebaseUser.email, ...data.user, completed: true } : null;
    } catch {
      return null;
    }
  }, []);

  // --- Check profile status ---
  const checkProfileStatus = useCallback(async (uid) => {
    try {
      const data = await apiRequest(`/auth/profile?uid=${uid}`);
      return data || { completed: false };
    } catch {
      return { completed: false };
    }
  }, []);

  // --- AUTH STATE LISTENER ---
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

        await loadAllData();

        const profileData = await fetchUserProfile(firebaseUser);
        if (profileData) {
          setUser(profileData);
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
        clearUserData();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile, checkProfileStatus, loadAllData, clearUserData]);

  // --- LOGIN ---
  const login = async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = cred.user;
      const profileData = await fetchUserProfile(firebaseUser);
      if (profileData) {
        setUser(profileData);
        setIsAuthenticated(true);
        setNeedsCompletion(false);
      } else {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, completed: false });
        setIsAuthenticated(true);
        setNeedsCompletion(true);
      }
      await loadAllData();
      return { success: true };
    } catch (error) {
      let message = 'Invalid email or password.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Please wait.';
      return { success: false, error: message };
    }
  };

  // --- REGISTER ---
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
        await loadAllData();
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

  // --- SOCIAL LOGIN ---
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

      await loadAllData();

      const status = await checkProfileStatus(firebaseUser.uid);
      if (status.completed) {
        const profileData = await fetchUserProfile(firebaseUser);
        if (profileData) {
          setUser(profileData);
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

  // --- COMPLETE SOCIAL PROFILE ---
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
        const profileData = await fetchUserProfile(firebaseUser);
        if (profileData) {
          setUser(profileData);
          setIsAuthenticated(true);
          setNeedsCompletion(false);
          await loadAllData();
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

  // --- LOGOUT ---
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthenticated(false);
      setNeedsCompletion(false);
      clearUserData();
      return { success: true };
    } catch {
      return { success: false, error: 'Logout failed' };
    }
  };

  // --- RESET PASSWORD ---
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
      const profileData = await fetchUserProfile(auth.currentUser);
      if (profileData) {
        setUser(profileData);
        setIsAuthenticated(true);
        setNeedsCompletion(false);
        return profileData;
      }
    }
    return null;
  }, [fetchUserProfile]);

  // --- CONTEXT VALUE ---
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
    templates,
    featuredTemplates,
    profile,
    campaigns,
    supportTickets,
    comments,
    stats,
    dataLoaded,
    refetchProfile,
    refetchCampaigns,
    refetchStats,
    refetchSupportTickets,
    refetchComments,
    refetchTemplates,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// ============================================================
// AUTH SCREEN UI – PREMIUM DARK THEME (Deployment-Ready)
// ============================================================
export default function AuthScreen({ onSuccess, redirectTo = '/' }) {
  const router = useRouter();
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

  // ── State ──
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

  // ── Success overlay ──
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const emailTimerRef = useRef(null);
  const usernameTimerRef = useRef(null);

  // ── Redirect logic ──
  const performRedirect = useCallback(() => {
    if (redirectTo && redirectTo !== '/login' && redirectTo !== '/register') {
      router.push(redirectTo);
    } else if (user && user.completed) {
      router.push('/profile');
    } else {
      router.push('/');
    }
  }, [redirectTo, router, user]);

  const handleSuccess = (msg = 'Welcome to Make Trend! 🎉') => {
    setSuccessMessage(msg);
    setShowSuccess(true);
    setTimeout(() => performRedirect(), 1500);
  };

  // ── Effects ──
  useEffect(() => {
    if (user && user.completed === false && !needsSocialCompletion) {
      setSocialUser(user);
      setSocialFullname(user.displayName || '');
      setSocialAvatarPreview(user.photoURL || '');
      setNeedsSocialCompletion(true);
    }
  }, [user, needsSocialCompletion]);

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

  useEffect(() => {
    if (!password) { setPasswordStrength(0); return; }
    let score = 0;
    if (password.length >= 6) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    setPasswordStrength(score);
  }, [password]);

  // ── Social login ──
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
        handleSuccess('Logged in successfully! 🎉');
        if (onSuccess) onSuccess();
      }
    } else {
      setError(result.error || `Failed to sign in with ${provider}.`);
    }
  };

  // ── Social completion ──
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
      handleSuccess('Profile completed! 🎉');
      if (onSuccess) onSuccess();
    } else {
      setError(result.error || 'Failed to complete profile.');
    }
    setIsSubmitting(false);
  };

  // ── Email/password submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (emailExists === true) {
      const result = await login(email, password);
      if (result.success) {
        if (user && user.completed === false) {
          setSocialUser(user);
          setSocialFullname(user.displayName || '');
          setSocialAvatarPreview(user.photoURL || '');
          setNeedsSocialCompletion(true);
          setIsSubmitting(false);
          return;
        }
        handleSuccess('Welcome back! 🎉');
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || 'Login failed.');
      }
    } else {
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
            await uploadAvatar(avatarFile);
          } catch (err) {
            console.warn('Avatar upload after registration failed:', err);
          }
        }
        handleSuccess('Account created! 🎉');
        if (onSuccess) onSuccess();
      } else {
        setError(result.error || 'Registration failed.');
      }
    }
    setIsSubmitting(false);
  };

  // ── Avatar change ──
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
    setAvatarFile(file);
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

  // ── Reset password ──
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

  // ── Success Screen ──
  if (showSuccess) {
    return (
      <>
        <Meta title="Success | Make Trend" />
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full filter blur-[120px] animate-pulse z-0" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-blue-600/10 rounded-full filter blur-[100px] z-0" />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="text-center relative z-10 p-6 max-w-md"
          >
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_50px_rgba(16,185,129,0.15)]">
              <FiCheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{successMessage}</h2>
            <p className="text-gray-400 mt-2 text-sm">Preparing your modern workspace dashboard...</p>
          </motion.div>
        </div>
      </>
    );
  }

  // ── Social Completion Screen ──
  if (needsSocialCompletion) {
    return (
      <>
        <Meta title="Complete Profile | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-950 text-white relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[450px] h-[450px] bg-purple-700/25 rounded-full filter blur-[130px] opacity-70 animate-pulse duration-[8s]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[450px] h-[450px] bg-indigo-700/20 rounded-full filter blur-[130px] opacity-70 animate-pulse duration-[10s]" />

          <motion.div 
            initial={{ y: 25, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-md rounded-3xl bg-gray-900/60 border border-gray-800/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl relative z-10"
          >
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-500/30 bg-gray-800/80 flex items-center justify-center shadow-lg relative group">
                {socialAvatarPreview ? (
                  <img src={socialAvatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <label className="mt-3 cursor-pointer text-xs font-bold text-purple-400 hover:text-purple-300 transition bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2">
                Choose Custom Avatar
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarChange(e, 'social')} disabled={isSubmitting} />
              </label>
            </div>

            <h2 className="text-xl font-black text-center text-white tracking-tight">Complete Profile</h2>
            <p className="text-xs text-center text-gray-400 mt-1 mb-6">Finish setting up your credentials to enter Make Trend</p>

            {error && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs font-semibold text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSocialCompletion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={socialFullname}
                  onChange={(e) => setSocialFullname(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full rounded-xl bg-gray-950/80 border border-gray-800 px-4 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Username *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={socialUsername}
                    onChange={(e) => setSocialUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="choose_username"
                    className={`w-full rounded-xl bg-gray-950/80 border px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-4 transition ${
                      usernameAvailable === true && socialUsername.length >= 3
                        ? 'border-green-500 focus:ring-green-500/10'
                        : usernameAvailable === false && socialUsername.length >= 3
                        ? 'border-red-500 focus:ring-red-500/10'
                        : 'border-gray-800 focus:border-purple-500 focus:ring-purple-500/10'
                    }`}
                    required
                    disabled={isSubmitting}
                  />
                  {isCheckingUsername && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-pulse">⏳</span>
                  )}
                  {!isCheckingUsername && socialUsername.length >= 3 && usernameAvailable === true && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-green-400 font-bold">✓ Available</span>
                  )}
                  {!isCheckingUsername && socialUsername.length >= 3 && usernameAvailable === false && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-red-400 font-bold">✗ Taken</span>
                  )}
                </div>
                <p className="mt-1.5 text-[10px] text-gray-500 font-medium">3-30 characters: lowercase letters, numbers, underscore.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="w-full rounded-xl bg-gray-950/40 border border-gray-800/60 px-4 py-2.5 text-sm text-gray-500 select-none">
                  {socialUser?.email || '—'}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-purple-600 text-white py-3 text-xs font-black uppercase tracking-wider hover:opacity-90 transition shadow-lg shadow-purple-600/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Finalizing Profile...' : 'Complete Profile'}
              </button>
            </form>
          </motion.div>
        </div>
      </>
    );
  }

  // ─── MAIN COSMIC SPLIT-SCREEN LAYOUT ───
  return (
    <>
      <Meta
        title={emailExists === true ? "Login | Make Trend" : "Sign Up | Make Trend"}
        description={emailExists === true 
          ? "Sign in to your Make Trend account to create and manage campaigns."
          : "Create your Make Trend account and start launching viral campaigns."
        }
      />
      <div className="min-h-screen flex flex-col lg:flex-row bg-gray-950 text-white overflow-hidden relative font-sans">
        
        {/* Animated Glowing Mesh Blobs */}
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-purple-700/20 rounded-full filter blur-[150px] opacity-80 z-0 select-none pointer-events-none animate-pulse duration-[8s]" />
        <div className="absolute bottom-[-25%] right-[-10%] w-[500px] h-[500px] bg-indigo-700/25 rounded-full filter blur-[150px] opacity-80 z-0 select-none pointer-events-none animate-pulse duration-[12s]" />

        {/* ─── LEFT HERO ─── */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 p-6 sm:p-10 lg:p-14 flex flex-col justify-between min-h-[35vh] lg:min-h-screen relative z-10 lg:border-r lg:border-gray-800 bg-gray-950/30 backdrop-blur-sm"
        >
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="bg-purple-600/20 border border-purple-500/30 text-purple-500 p-2 rounded-xl text-sm shadow-[0_0_20px_rgba(110,68,255,0.1)]">
              <FiSparkles className="w-4 h-4 animate-spin duration-[6s]" />
            </span>
            <span className="text-base font-black tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Make Trend
            </span>
          </div>

          {/* Core Feature Focus */}
          <div className="max-w-md my-auto pt-6 lg:pt-0">
            <span className="text-[10px] font-black tracking-widest uppercase text-purple-500 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 w-fit block mb-4">
              ⚡ Next-Gen Marketing Engine
            </span>
            
            <h1 className="text-2xl sm:text-4xl font-black leading-none text-white tracking-tight mb-3">
              {emailExists === true ? "Welcome back to the trend." : "Launch and go viral."}
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-6">
              {emailExists === true
                ? "Sign in to customize rewards, analyze custom campaign KPIs, and launch templates on global social trends."
                : "Create an account to browse conversion-optimized templates, build customized landing pages, and launch viral referral setups."
              }
            </p>

            {/* Campaign Live KPIs Card Mockup */}
            <div className="hidden sm:block p-4 bg-gray-900/50 border border-gray-800/80 rounded-2xl backdrop-blur-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-2xl group-hover:bg-purple-600/10 transition-all" />
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                  Live Analytics Demo
                </span>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-800 border border-gray-700/50 px-2 py-0.5 rounded-lg">
                  Real-Time
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-gray-500 block">Total Reach</span>
                  <div className="flex items-center gap-1">
                    <FiTrendingUp className="text-green-400 w-3 h-3" />
                    <span className="text-xs font-black text-white">1.2M+</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-gray-500 block">Active Users</span>
                  <div className="flex items-center gap-1">
                    <FiUsers className="text-purple-500 w-3 h-3 animate-pulse" />
                    <span className="text-xs font-black text-white">85.4K</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-gray-500 block">Rewards Won</span>
                  <div className="flex items-center gap-1">
                    <FiAward className="text-amber-400 w-3 h-3" />
                    <span className="text-xs font-black text-white">4,210</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="hidden lg:flex items-center justify-between text-gray-500 text-[11px] font-bold mt-6">
            <span>© 2026 Make Trend Inc.</span>
            <div className="flex gap-4">
              <span className="hover:text-gray-400 cursor-pointer">Privacy</span>
              <span className="hover:text-gray-400 cursor-pointer">Terms</span>
            </div>
          </div>
        </motion.div>

        {/* ─── RIGHT FORM ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10"
        >
          <div className="w-full max-w-md bg-gray-900/40 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            
            {/* Context Heading */}
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {emailExists === true ? "Sign In" : emailExists === false && email.length > 3 ? "Create Account" : "Access Hub"}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {emailExists === true ? "Enter password to access your dashboard" : "Setup modern credentials to get started"}
              </p>
            </div>

            {/* Avatar Upload Frame on Register Mode */}
            {emailExists === false && email.length > 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center mb-5"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-500/30 bg-gray-950 flex items-center justify-center shadow-lg relative group">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <FiUser className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <label className="mt-2.5 cursor-pointer text-[10px] font-black uppercase tracking-wider text-purple-400 hover:text-purple-300 transition bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-1.5">
                  Upload Profile Picture
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarChange(e, 'register')} disabled={isSubmitting} />
                </label>
              </motion.div>
            )}

            {/* Error notifications */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 flex items-start gap-2"
              >
                <FiAlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
            
            {resetSent && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-400 flex items-start gap-2"
              >
                <FiCheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Password reset verification link has been successfully dispatched!</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Input: Email */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <FiMail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-950/80 border text-sm text-white focus:outline-none focus:ring-4 transition ${
                      emailExists === true && email.length > 3
                        ? 'border-green-500/70 focus:ring-green-500/10'
                        : emailExists === false && email.length > 3
                        ? 'border-purple-500/70 focus:ring-purple-500/10'
                        : emailError
                        ? 'border-red-500/70 focus:ring-red-500/10'
                        : 'border-gray-800 focus:border-purple-500 focus:ring-purple-500/10'
                    }`}
                    disabled={isSubmitting}
                    required
                  />
                  {isCheckingEmail && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 animate-pulse">⏳</span>
                  )}
                  {!isCheckingEmail && email.length > 3 && emailExists === true && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-green-400 font-bold">✓ Active</span>
                  )}
                  {!isCheckingEmail && email.length > 3 && emailExists === false && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-purple-400 font-bold">New ✨</span>
                  )}
                </div>
                {emailError && <p className="mt-1 text-[10px] text-red-400 font-bold">{emailError}</p>}
                
                {emailExists === true && email.length > 3 && (
                  <p className="mt-1.5 text-[10px] text-gray-500 font-medium">
                    Verified account found. Enter your credentials.
                    <button type="button" onClick={handleResetPassword} className="ml-1 text-purple-400 hover:underline font-bold">Forgot Password?</button>
                  </p>
                )}
              </div>

              {/* Password Container (Login Phase) */}
              {emailExists === true && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                      <FiLock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-950/80 border border-gray-800 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition"
                      required
                      disabled={isSubmitting}
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Extended Fields Container (Register Phase) */}
              {emailExists === false && email.length > 3 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Full Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <FiUser className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={fullname}
                        onChange={(e) => setFullname(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 py-2.5 rounded-xl bg-gray-950/80 border border-gray-800 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Username *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <FiUserPlus className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="username"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-950/80 border text-sm text-white focus:outline-none focus:ring-4 transition ${
                          usernameAvailable === true && username.length >= 3
                            ? 'border-green-500/70 focus:ring-green-500/10'
                            : usernameAvailable === false && username.length >= 3
                            ? 'border-red-500/70 focus:ring-red-500/10'
                            : 'border-gray-800 focus:border-purple-500 focus:ring-purple-500/10'
                        }`}
                        required
                        disabled={isSubmitting}
                      />
                      {isCheckingUsername && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 animate-pulse">⏳</span>
                      )}
                      {!isCheckingUsername && username.length >= 3 && usernameAvailable === true && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-green-400 font-bold">✓ Available</span>
                      )}
                      {!isCheckingUsername && username.length >= 3 && usernameAvailable === false && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-red-400 font-bold">✗ Taken</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[10px] text-gray-500 font-medium">3-30 characters: lowercase letters, numbers, underscore.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Password *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <FiLock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Choose unique key"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-950/80 border border-gray-800 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition"
                        required
                        disabled={isSubmitting}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                    
                    {password.length > 0 && (
                      <div className="mt-1.5">
                        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-300 rounded-full ${
                            passwordStrength <= 1 ? 'bg-red-500 w-1/4' :
                            passwordStrength === 2 ? 'bg-amber-500 w-2/4' :
                            passwordStrength === 3 ? 'bg-blue-500 w-3/4' :
                            'bg-green-500 w-full'
                          }`} />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 font-bold tracking-wide">
                          Strength: {['Weak', 'Fair', 'Good', 'Strong'][passwordStrength] || 'Weak'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Confirm Password *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                        <FiLock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full pl-10 py-2.5 rounded-xl bg-gray-950/80 border border-gray-800 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    {confirmPassword && password && confirmPassword !== password && (
                      <p className="mt-1.5 text-[10px] text-red-400 font-bold">Passwords do not match.</p>
                    )}
                    {confirmPassword && password && confirmPassword === password && (
                      <p className="mt-1.5 text-[10px] text-green-400 font-bold">✓ Passwords match.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-1.5">Referral Code (optional)</label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="ENTER PROMO CODE"
                      className="w-full rounded-xl bg-gray-950/80 border border-gray-800 px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 uppercase transition font-bold placeholder:font-normal placeholder:normal-case"
                      disabled={isSubmitting}
                    />
                  </div>
                </motion.div>
              )}

              {/* Submit Buttons */}
              {emailExists !== null && email.length > 3 && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-purple-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-purple-600/20 hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? 'Processing...' : emailExists === true ? 'Enter Dashboard' : 'Complete Setup'}
                  <FiArrowRight />
                </button>
              )}
              
              {emailExists === null && email.length > 3 && (
                <button
                  type="button"
                  disabled={isCheckingEmail}
                  className="w-full py-3 bg-gray-800 text-gray-500 font-black text-xs uppercase tracking-wider rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {isCheckingEmail ? 'Verifying...' : 'Enter Email to Continue'}
                </button>
              )}
            </form>

            {/* ── Divider ── */}
            <div className="relative my-6 select-none">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800" /></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest"><span className="bg-gray-900/60 px-3 text-gray-500">Social Authorization</span></div>
            </div>

            {/* ── Social Login Row ── */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                disabled={isSocialLoading || isSubmitting}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-800/80 bg-gray-950/40 hover:bg-gray-900/40 hover:border-gray-800 rounded-xl text-xs font-bold text-gray-300 transition disabled:opacity-50"
              >
                <FaGoogle className="w-3.5 h-3.5 text-red-500" />
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin('facebook')}
                disabled={isSocialLoading || isSubmitting}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-800/80 bg-gray-950/40 hover:bg-gray-900/40 hover:border-gray-800 rounded-xl text-xs font-bold text-gray-300 transition disabled:opacity-50"
              >
                <FaFacebook className="w-3.5 h-3.5 text-blue-500" />
                Facebook
              </button>
            </div>

            {/* ── Switch links ── */}
            <div className="mt-5 text-center text-xs">
              {emailExists === false && email.length > 3 ? (
                <div className="text-gray-500 font-medium">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setEmailExists(null); setPassword(''); setError(''); }}
                    className="text-purple-400 hover:text-purple-300 font-black hover:underline transition"
                  >
                    Change Email
                  </button>
                </div>
              ) : emailExists === true ? (
                <div className="text-gray-500 font-medium">
                  New to Make Trend?{' '}
                  <button
                    type="button"
                    onClick={() => { setEmailExists(null); setPassword(''); setFullname(''); setUsername(''); setError(''); }}
                    className="text-purple-400 hover:text-purple-300 font-black hover:underline transition"
                  >
                    Create an Account
                  </button>
                </div>
              ) : null}
            </div>

          </div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
      `}</style>
    </>
  );
}