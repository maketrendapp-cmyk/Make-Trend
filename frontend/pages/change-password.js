// pages/change-password.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { useProfile } from '../lib/queries';
import { auth } from '../services/firebase';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import Meta from '../components/Meta';
import {
  FiArrowLeft,
  FiCheck,
  FiX,
  FiEye,
  FiEyeOff,
  FiLock,
  FiShield,
  FiAlertCircle,
  FiLoader,
} from 'react-icons/fi';

export default function ChangePassword() {
  const router = useRouter();
 const { user, isAuthenticated } = useAuth();
const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Form fields ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // ── Check if user has email/password provider ──
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      const providerData = firebaseUser.providerData || [];
      const hasEmailProvider = providerData.some(p => p.providerId === 'password');
      setHasPassword(hasEmailProvider);
    }
    setLoading(false);
  }, [user, router]);

  // ── Calculate password strength ──
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0);
      return;
    }
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score++;
    setPasswordStrength(score);
  }, [newPassword]);

  const getStrengthLabel = (score) => {
    const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    return labels[score] || 'Weak';
  };

  const getStrengthColor = (score) => {
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-blue-500',
      'bg-green-500',
    ];
    return colors[score] || 'bg-red-500';
  };

  const getStrengthWidth = (score) => {
    return `${(score / 4) * 100}%`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setError('You must be logged in.');
      setSaving(false);
      return;
    }

    // ── Validate passwords ──
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      setSaving(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setSaving(false);
      return;
    }

    try {
      // ── If user has password, re‑authenticate first ──
      if (hasPassword) {
        if (!currentPassword) {
          setError('Current password is required.');
          setSaving(false);
          return;
        }
        const credential = EmailAuthProvider.credential(
          firebaseUser.email,
          currentPassword
        );
        await reauthenticateWithCredential(firebaseUser, credential);
      }

      // ── Update password ──
      await updatePassword(firebaseUser, newPassword);

      setSuccess('Password updated successfully! 🎉');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // ── Redirect after a moment ──
      setTimeout(() => router.push('/profile'), 2000);
    } catch (err) {
      console.error('Password update error:', err);
      let message = 'Failed to update password.';
      if (err.code === 'auth/wrong-password') {
        message = 'Current password is incorrect.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password must be at least 6 characters.';
      } else if (err.code === 'auth/requires-recent-login') {
        message = 'Please log out and log in again, then try again.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please wait and try again.';
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // ── Show skeleton immediately if user is logged in but profile isn't loaded ──
  const showSkeleton = loading || profileLoading || (user && !profile);

  // ── Skeleton Loader ──
  if (showSkeleton) {
    return (
      <>
        <Meta title="Change Password | Make Trend" />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-8 px-4">
          <div className="max-w-lg mx-auto">
            {/* Back Button Skeleton */}
            <div className="w-20 h-9 bg-gray-200 rounded-lg animate-pulse mb-4" />

            {/* Card Skeleton */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 sm:p-8">
              <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-6" />

              {/* Form Fields Skeleton */}
              <div className="space-y-5">
                <div>
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                </div>
                <div>
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                </div>
                <div>
                  <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                </div>
                <div className="flex gap-3 pt-4">
                  <div className="flex-1 h-12 bg-gray-200 rounded-xl animate-pulse" />
                  <div className="flex-1 h-12 bg-gray-200 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Main Render ──
  return (
    <>
      <Meta
        title={hasPassword ? 'Change Password | Make Trend' : 'Set Password | Make Trend'}
        description={
          hasPassword
            ? 'Change your Make Trend account password securely.'
            : 'Set a password for your Make Trend account.'
        }
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-8 px-4">
        <div className="max-w-lg mx-auto">
          {/* ── Back Button ── */}
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 mb-4 px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <FiArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 sm:p-8 backdrop-blur-sm transition-all hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center text-purple-600">
                <FiLock className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900">
                  {hasPassword ? 'Change Password' : 'Set Password'}
                </h1>
                <p className="text-sm text-gray-500">
                  {hasPassword
                    ? 'Update your account password securely.'
                    : 'Set a password to also log in with email and password.'}
                </p>
              </div>
            </div>

            {!hasPassword && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm flex items-start gap-2">
                <FiShield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <span>
                  You signed in with a social account. You can set a password to also log in with email and password.
                </span>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2 animate-fadeIn">
                <FiX className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-start gap-2 animate-fadeIn">
                <FiCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ── Current password – only for email/password users ── */}
              {hasPassword && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                      disabled={saving}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    >
                      {showCurrent ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* ── New Password ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                    disabled={saving}
                    placeholder="Minimum 6 characters"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showNew ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                  </button>
                </div>

                {/* ── Password Strength Indicator ── */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">Strength</span>
                      <span className={`text-xs font-medium ${passwordStrength >= 3 ? 'text-green-600' : passwordStrength >= 2 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {getStrengthLabel(passwordStrength)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                        style={{ width: getStrengthWidth(passwordStrength) }}
                      />
                    </div>
                    {passwordStrength < 2 && newPassword.length > 0 && (
                      <p className="mt-1 text-xs text-gray-400">
                        {newPassword.length < 8
                          ? 'Use at least 8 characters.'
                          : 'Add uppercase, numbers, or special characters for a stronger password.'}
                      </p>
                    )}
                  </div>
                )}

                {newPassword && newPassword.length < 6 && (
                  <p className="mt-1 text-xs text-red-500">Must be at least 6 characters.</p>
                )}
              </div>

              {/* ── Confirm Password ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                    disabled={saving}
                    placeholder="Re-enter new password"
                  />
                  {confirmPassword && newPassword && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {confirmPassword === newPassword ? (
                        <FiCheck className="w-5 h-5 text-green-500" />
                      ) : (
                        <FiX className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {confirmPassword && newPassword && confirmPassword !== newPassword && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
                )}
                {confirmPassword && newPassword && confirmPassword === newPassword && (
                  <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <FiCheck className="w-3 h-3" /> Passwords match.
                  </p>
                )}
              </div>

              {/* ── Buttons ── */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3.5 rounded-xl font-medium hover:shadow-lg transition-all duration-200 shadow-md hover:shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <FiLoader className="w-5 h-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <FiLock className="w-5 h-5" />
                      {hasPassword ? 'Change Password' : 'Set Password'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/profile')}
                  className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}