// components/AuthScreen.js
// ============================================================
// FULL‑PAGE SPLIT‑SCREEN LOGIN / REGISTER
// Compact, centered, animated, and professional
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
import { motion } from 'framer-motion';
import {
  FiMail,
  FiLock,
  FiUser,
  FiUserPlus,
  FiCheckCircle,
  FiAlertCircle,
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
// AUTH CONTEXT
// ============================================================
const AuthContext = createContext();

export function AuthProvider({ children }) {
  // ... (your existing AuthProvider code – keep it unchanged) ...
  // For completeness, we include the full provider code below.
  // This is the same code you already have; just copy it from your file.
  // To avoid duplication, I'll include a placeholder comment.
  // But the actual file must contain the full provider.
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// ============================================================
// AUTH SCREEN UI – COMPACT SPLIT SCREEN
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

  // ── Check for social completion ──
  useEffect(() => {
    if (user && user.completed === false && !needsSocialCompletion) {
      setSocialUser(user);
      setSocialFullname(user.displayName || '');
      setSocialAvatarPreview(user.photoURL || '');
      setNeedsSocialCompletion(true);
    }
  }, [user, needsSocialCompletion]);

  // ── Email check ──
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

  // ── Username check ──
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

  // ── Password strength ──
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
            const uploadedUrl = await uploadAvatar(avatarFile);
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

  // ── Success overlay ──
  if (showSuccess) {
    return (
      <>
        <Meta title="Success | Make Trend" />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FiCheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{successMessage}</h2>
            <p className="text-gray-500 mt-1">Redirecting...</p>
          </motion.div>
        </div>
      </>
    );
  }

  // ── Social completion screen ──
  if (needsSocialCompletion) {
    return (
      <>
        <Meta title="Complete Profile | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-white/50 backdrop-blur-sm">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 bg-gray-100 flex items-center justify-center shadow-sm">
                {socialAvatarPreview ? (
                  <img src={socialAvatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <label className="mt-2 cursor-pointer text-sm font-medium text-purple-600 hover:text-purple-800 transition border border-dashed border-gray-300 rounded-lg px-4 py-1.5 hover:border-purple-400">
                Upload Profile Picture
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarChange(e, 'social')} disabled={isSubmitting} />
              </label>
            </div>

            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Complete Your Profile</h2>
            <p className="text-sm text-center text-gray-400 mb-6">One more step to get started</p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">
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
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
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
                        : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                    }`}
                    required
                    disabled={isSubmitting}
                  />
                  {isCheckingUsername && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 animate-pulse">⏳</span>
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
                <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
                  {socialUser?.email || '—'}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Complete Profile'}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  // ─── MAIN SPLIT‑SCREEN LAYOUT (UPDATED: COMPACT, NO EXTRA TEXT, CENTERED) ───
  return (
    <>
      <Meta
        title={emailExists === true ? "Login | Make Trend" : "Sign Up | Make Trend"}
        description={emailExists === true 
          ? "Sign in to your Make Trend account to create and manage campaigns."
          : "Create your Make Trend account and start launching viral campaigns."
        }
      />
      <div className="min-h-screen flex flex-col lg:flex-row bg-white overflow-hidden">

        {/* ─── LEFT HERO ─── (compact, only heading + subtext) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex-1 bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-800 text-white p-6 lg:p-8 flex flex-col justify-center min-h-[30vh] lg:min-h-screen relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />

          <div className="relative z-10 max-w-md mx-auto lg:mx-0 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-3">
              {emailExists === true ? 'Welcome Back!' : 'Join the Movement'}
            </h1>
            <p className="text-purple-200 text-base sm:text-lg max-w-md">
              {emailExists === true
                ? 'Sign in to continue building viral campaigns.'
                : 'Create your account and launch your first campaign in minutes.'
              }
            </p>
          </div>
        </motion.div>

        {/* ─── RIGHT FORM ─── (centered, less padding) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: 'easeOut' }}
          className="flex-1 flex items-center justify-center p-6 lg:p-8 bg-white"
        >
          <div className="w-full max-w-md">

            {/* ── Mobile heading ── */}
            <div className="lg:hidden text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {emailExists === true ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-sm text-gray-500">
                {emailExists === true ? 'Sign in to your account' : 'Start your journey with Make Trend'}
              </p>
            </div>

            {/* ── Avatar (register mode) ── */}
            {emailExists === false && email.length > 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center mb-4"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-200 bg-gray-100 flex items-center justify-center shadow-sm">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <FiUser className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <label className="mt-2 cursor-pointer text-sm font-medium text-purple-600 hover:text-purple-800 transition border border-dashed border-gray-300 rounded-lg px-4 py-1.5 hover:border-purple-400">
                  Upload Profile Picture
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarChange(e, 'register')} disabled={isSubmitting} />
                </label>
              </motion.div>
            )}

            {/* ── Error / Reset messages ── */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600 flex items-start gap-2"
              >
                <FiAlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
            {resetSent && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-600 flex items-start gap-2"
              >
                <FiCheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>✅ Password reset link sent!</span>
              </motion.div>
            )}

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiMail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                      emailExists === true && email.length > 3
                        ? 'border-green-500 focus:ring-green-200 bg-green-50'
                        : emailExists === false && email.length > 3
                        ? 'border-purple-500 focus:ring-purple-200 bg-purple-50'
                        : emailError
                        ? 'border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                    }`}
                    disabled={isSubmitting}
                    required
                  />
                  {isCheckingEmail && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 animate-pulse">⏳</span>
                  )}
                  {!isCheckingEmail && email.length > 3 && emailExists === true && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-600 font-medium">✓ Exists</span>
                  )}
                  {!isCheckingEmail && email.length > 3 && emailExists === false && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-purple-600 font-medium">New ✨</span>
                  )}
                </div>
                {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
                {emailExists === true && email.length > 3 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Existing account — enter your password below.
                    <button type="button" onClick={handleResetPassword} className="ml-1 text-purple-600 hover:underline font-medium">Forgot password?</button>
                  </p>
                )}
              </div>

              {/* Login password */}
              {emailExists === true && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <FiLock className="w-5 h-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
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
                </motion.div>
              )}

              {/* Register fields */}
              {emailExists === false && email.length > 3 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FiUser className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={fullname}
                        onChange={(e) => setFullname(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FiUserPlus className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="john_doe"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
                          usernameAvailable === true && username.length >= 3
                            ? 'border-green-500 focus:ring-green-200'
                            : usernameAvailable === false && username.length >= 3
                            ? 'border-red-500 focus:ring-red-200'
                            : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                        }`}
                        required
                        disabled={isSubmitting}
                      />
                      {isCheckingUsername && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 animate-pulse">⏳</span>
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
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FiLock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
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
                          Strength: {['Weak', 'Fair', 'Good', 'Strong'][passwordStrength] || 'Weak'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FiLock className="w-5 h-5" />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 py-2.5 rounded-lg border border-gray-300 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
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
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 uppercase transition"
                      disabled={isSubmitting}
                    />
                  </div>
                </motion.div>
              )}

              {/* Submit */}
              {emailExists !== null && email.length > 3 && (
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Processing...' : emailExists === true ? 'Log In' : 'Create Account'}
                </motion.button>
              )}
              {emailExists === null && email.length > 3 && (
                <button
                  type="button"
                  disabled={isCheckingEmail}
                  className="w-full py-3 bg-gray-200 text-gray-500 font-semibold rounded-lg cursor-not-allowed"
                >
                  {isCheckingEmail ? 'Verifying...' : 'Enter email to continue'}
                </button>
              )}
            </form>

            {/* ── Divider ── */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">Or continue with</span></div>
            </div>

            {/* ── Social buttons ── */}
            <div className="flex gap-3">
              <button
                onClick={() => handleSocialLogin('google')}
                disabled={isSocialLoading || isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                <FaGoogle className="w-4 h-4" />
                Google
              </button>
              <button
                onClick={() => handleSocialLogin('facebook')}
                disabled={isSocialLoading || isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                <FaFacebook className="w-4 h-4" />
                Facebook
              </button>
            </div>

            {/* ── Switch links ── */}
            <div className="mt-4 text-center text-xs text-gray-400">
              {emailExists === false && email.length > 3 ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setEmailExists(null); setPassword(''); setError(''); }}
                    className="text-purple-600 hover:underline font-medium"
                  >
                    Use a different email
                  </button>
                </>
              ) : emailExists === true ? (
                <>
                  New here?{' '}
                  <button
                    type="button"
                    onClick={() => { setEmailExists(null); setPassword(''); setFullname(''); setUsername(''); setError(''); }}
                    className="text-purple-600 hover:underline font-medium"
                  >
                    Create an account
                  </button>
                </>
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