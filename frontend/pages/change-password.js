// pages/change-password.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { useAppData } from '../lib/useAppData';
import { auth } from '../services/firebase';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';

export default function ChangePassword() {
  const router = useRouter();
  const { user } = useAuth();
const { loadingState } = useAppData();
  const [loading, setLoading] = useState(loadingState?.profile !== undefined ? false : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  // ── Check if user has email/password provider ──
  useEffect(() => {
    // If profile is still loading, wait
    if (loadingState?.profile === undefined || loadingState?.profile === true) {
      return;
    }

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
  }, [loadingState?.profile, user, router]);

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

    // Validate passwords
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

      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Redirect after a moment
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {hasPassword ? 'Change Password' : 'Set Password'}
          </h1>

          {!hasPassword && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
              You signed in with a social account. You can set a password to also log in with email and password.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current password – only for email/password users */}
            {hasPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition pr-10"
                    required
                    disabled={saving}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrent ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition pr-10"
                  required
                  disabled={saving}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNew ? '🙈' : '👁️'}
                </button>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="mt-1 text-xs text-red-500">Must be at least 6 characters.</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                required
                disabled={saving}
                placeholder="Re-enter new password"
              />
              {confirmPassword && newPassword && confirmPassword !== newPassword && (
                <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
              )}
              {confirmPassword && newPassword && confirmPassword === newPassword && (
                <p className="mt-1 text-xs text-green-600">✓ Passwords match.</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
              >
                {saving ? 'Updating...' : hasPassword ? 'Change Password' : 'Set Password'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/profile')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}