// frontend/components/AuthScreen.js
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen({ onSuccess }) {
  const {
    login,
    register,
    socialLogin,
    completeSocialProfile,
    uploadAvatar,
    isSocialLoading,
    resetPassword,
  } = useAuth();

  // ===== STEP 1: EMAIL =====
  const [email, setEmail] = useState('');
  const [emailExists, setEmailExists] = useState(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  // ===== STEP 2: CREDENTIALS =====
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // ===== SOCIAL LOGIN COMPLETION =====
  const [socialUser, setSocialUser] = useState(null);
  const [needsSocialCompletion, setNeedsSocialCompletion] = useState(false);
  const [socialFullname, setSocialFullname] = useState('');
  const [socialUsername, setSocialUsername] = useState('');
  const [socialAvatarPreview, setSocialAvatarPreview] = useState('');
  const [socialAvatarFile, setSocialAvatarFile] = useState(null);

  // ===== UI STATE =====
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);

  const emailTimerRef = useRef(null);
  const usernameTimerRef = useRef(null);

  // ============================================================
  // CHECK BACKEND IS AVAILABLE
  // ============================================================
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/health`);
        if (!res.ok) throw new Error('Backend down');
        setBackendAvailable(true);
      } catch {
        setBackendAvailable(false);
        setError('⚠️ Backend server is not responding. Please try again later.');
      }
    };
    checkBackend();
  }, []);

  // ============================================================
  // CHECK EMAIL EXISTS (debounced)
  // ============================================================
  useEffect(() => {
    if (email.length > 3 && email.includes('@') && !needsSocialCompletion && backendAvailable) {
      clearTimeout(emailTimerRef.current);
      setIsCheckingEmail(true);
      setEmailError('');
      setEmailExists(null);

      emailTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/check-email?email=${encodeURIComponent(email)}`
          );
          if (!res.ok) throw new Error('Backend error');
          const data = await res.json();
          setEmailExists(data.exists);
        } catch (err) {
          console.error('Email check error:', err);
          setEmailExists(null);
          setEmailError('Could not verify email. Backend may be down.');
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
  }, [email, needsSocialCompletion, backendAvailable]);

  // ============================================================
  // CHECK USERNAME AVAILABILITY
  // ============================================================
  const usernameToCheck = needsSocialCompletion ? socialUsername : username;
  const isRegisterMode = (emailExists === false && email.length > 3) || needsSocialCompletion;

  useEffect(() => {
    if (isRegisterMode && usernameToCheck.length >= 3 && backendAvailable) {
      clearTimeout(usernameTimerRef.current);
      setIsCheckingUsername(true);
      setUsernameAvailable(null);

      usernameTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/check-username?username=${encodeURIComponent(usernameToCheck)}`
          );
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
  }, [isRegisterMode, usernameToCheck, backendAvailable]);

  // ============================================================
  // HANDLE SOCIAL LOGIN (with popup fallback)
  // ============================================================
  const handleSocialLogin = async (provider) => {
    setError('');
    
    try {
      const result = await socialLogin(provider);
      if (result.success) {
        if (result.needsCompletion) {
          const user = result.user || {};
          setSocialUser(user);
          setSocialFullname(user.displayName || '');
          setSocialAvatarPreview(user.photoURL || '');
          setNeedsSocialCompletion(true);
          setError('');
        } else {
          onSuccess?.();
        }
      } else {
        setError(result.error || `Failed to sign in with ${provider}.`);
      }
    } catch (err) {
      console.error('Social login error:', err);
      // If popup was blocked, show helpful message
      if (err.message?.includes('popup')) {
        setError('Popup was blocked. Please allow popups for this site and try again.');
      } else {
        setError('Unable to sign in. Please try again.');
      }
    }
  };

  // ============================================================
  // HANDLE SOCIAL PROFILE COMPLETION
  // ============================================================
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
        avatarUrl = await uploadAvatar(socialAvatarFile);
      } catch (err) {
        setError('Avatar upload failed. You can add it later.');
        setIsSubmitting(false);
        return;
      }
    }

    const result = await completeSocialProfile(socialFullname, socialUsername, avatarUrl);
    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to complete profile.');
    }
    setIsSubmitting(false);
  };

  // ============================================================
  // HANDLE EMAIL/PASSWORD FORM SUBMISSION
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (emailExists === true) {
      // ===== LOGIN =====
      const result = await login(email, password);
      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || 'Login failed.');
      }
    } else {
      // ===== REGISTER =====
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

      // Avatar upload skipped during registration (can be added later in profile)
      let avatarUrl = '';

      const result = await register(email, password, fullname, username, avatarUrl, referralCode);
      if (result.success) {
        // If avatar was selected, we'll upload it after registration via the profile page
        onSuccess?.();
      } else {
        setError(result.error || 'Registration failed.');
      }
    }
    setIsSubmitting(false);
  };

  // ============================================================
  // AVATAR UPLOAD HANDLERS
  // ============================================================
  const handleAvatarChange = (e, type = 'register') => {
    const file = e.target.files[0];
    if (!file) return;
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

  // ============================================================
  // RESET PASSWORD
  // ============================================================
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
  // RENDER - BACKEND DOWN
  // ============================================================
  if (!backendAvailable) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-border text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Backend Unavailable</h2>
          <p className="text-sm text-gray-500">
            The backend server is not responding. Please try again later.
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Make sure your backend is deployed on Render and the URL is correct.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER - SOCIAL COMPLETION
  // ============================================================
  if (needsSocialCompletion) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-border">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Complete Your Profile</h2>
            <p className="text-sm text-gray-400 mt-1">One more step to get started</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSocialCompletion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture</label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition border border-border">
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAvatarChange(e, 'social')}
                    disabled={isSubmitting}
                  />
                </label>
                {socialAvatarPreview && (
                  <div className="h-12 w-12 rounded-full overflow-hidden border border-border">
                    <img src={socialAvatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={socialFullname}
                onChange={(e) => setSocialFullname(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                    usernameAvailable === true && socialUsername.length >= 3
                      ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                      : usernameAvailable === false && socialUsername.length >= 3
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-border focus:border-primary focus:ring-primary'
                  }`}
                  required
                  disabled={isSubmitting}
                />
                {isCheckingUsername && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Checking...</span>
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
                onClick={() => {
                  setNeedsSocialCompletion(false);
                  setSocialUser(null);
                  setError('');
                }}
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
  // RENDER - MAIN EMAIL/PASSWORD FLOW
  // ============================================================
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-border">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">
            Make<span className="text-gray-900">Trend</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {emailExists === true
              ? 'Welcome back! Enter your password.'
              : emailExists === false && email.length > 3
              ? 'Create your account in seconds.'
              : 'Enter your email to get started.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">
            {error}
          </div>
        )}
        {resetSent && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-600">
            ✅ Password reset link sent to your email!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* EMAIL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 transition ${
                  emailExists === true && email.length > 3
                    ? 'border-green-500 focus:border-green-500 focus:ring-green-500 bg-green-50'
                    : emailExists === false && email.length > 3
                    ? 'border-primary focus:border-primary focus:ring-primary bg-primary/5'
                    : emailError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-border focus:border-primary focus:ring-primary'
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
                Existing account. Enter your password below.
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="ml-1 text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </p>
            )}
            {emailExists === false && email.length > 3 && (
              <p className="mt-1 text-xs text-gray-400">
                New account. Fill in your details below to create your account.
              </p>
            )}
          </div>

          {/* LOGIN PASSWORD */}
          {emailExists === true && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary pr-10"
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
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                      usernameAvailable === true && username.length >= 3
                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                        : usernameAvailable === false && username.length >= 3
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-border focus:border-primary focus:ring-primary'
                    }`}
                    required
                    disabled={isSubmitting}
                  />
                  {isCheckingUsername && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Checking...</span>
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
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary pr-10"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referral Code (optional)</label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="ENTER CODE"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture (optional)</label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition border border-border">
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAvatarChange(e, 'register')}
                      disabled={isSubmitting}
                    />
                  </label>
                  {avatarPreview && (
                    <div className="h-12 w-12 rounded-full overflow-hidden border border-border">
                      <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400">Max 5MB • JPEG, PNG, WEBP, GIF (You can add/change this later in profile)</p>
              </div>
            </>
          )}

          {/* SUBMIT BUTTON - THIS IS THE REGISTRATION BUTTON */}
          {emailExists !== null && email.length > 3 && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting
                ? 'Processing...'
                : emailExists === true
                ? 'Log In'
                : 'Create Account'}
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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-400">Or continue with</span>
          </div>
        </div>

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

        {/* SWITCH BETWEEN LOGIN AND REGISTER */}
        {emailExists === false && email.length > 3 && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                setEmailExists(null);
                setPassword('');
                setError('');
              }}
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
              onClick={() => {
                setEmailExists(null);
                setPassword('');
                setFullname('');
                setUsername('');
                setError('');
              }}
              className="text-primary hover:underline font-medium"
            >
              Create an account
            </button>
          </p>
        )}
      </div>
    </div>
  );
}