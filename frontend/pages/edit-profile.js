// pages/edit-profile.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { useProfile, useInvalidateQueries } from '../lib/queries';
import { auth } from '../services/firebase';
import Meta from '../components/Meta';
import {
  FiArrowLeft,
  FiCamera,
  FiUser,
  FiMail,
  FiLock,
  FiCheck,
  FiX,
  FiLoader,
} from 'react-icons/fi';

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com') + '/api';

export default function EditProfile() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { invalidateProfile } = useInvalidateQueries();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Form fields ──
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [currentAvatar, setCurrentAvatar] = useState('');

  // ── Availability states ──
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // ── Track changes ──
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [emailChanged, setEmailChanged] = useState(false);

  // ── Debounce timers ──
  const usernameTimer = useRef(null);
  const emailTimer = useRef(null);

  // ── Populate form from profile ──
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullname || profile.name || '');
      setUsername(profile.username || '');
      setEmail(profile.email || '');
      setCurrentAvatar(profile.avatar || profile.profilePic || '');
      setAvatarPreview(profile.avatar || profile.profilePic || '');
      setLoading(false);
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [profile, profileLoading]);

  // ── Track username changes ──
  useEffect(() => {
    if (profile) {
      const originalUsername = profile?.username || '';
      setUsernameChanged(username !== originalUsername);
    }
  }, [username, profile]);

  // ── Track email changes ──
  useEffect(() => {
    if (profile) {
      const originalEmail = profile?.email || '';
      setEmailChanged(email !== originalEmail);
    }
  }, [email, profile]);

  // ── Redirect if not authenticated ──
  useEffect(() => {
    if (!profileLoading && !user) {
      router.push('/login');
    }
  }, [profileLoading, user, router]);

  // ── Check username availability ──
  useEffect(() => {
    clearTimeout(usernameTimer.current);
    if (!usernameChanged || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setIsCheckingUsername(true);
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        setUsernameAvailable(data.success ? data.available : false);
      } catch {
        setUsernameAvailable(false);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);
    return () => clearTimeout(usernameTimer.current);
  }, [username, usernameChanged]);

  // ── Check email availability ──
  useEffect(() => {
    clearTimeout(emailTimer.current);
    if (!emailChanged || !email || !email.includes('@')) {
      setEmailAvailable(null);
      return;
    }
    setIsCheckingEmail(true);
    emailTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/check-email?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        setEmailAvailable(data.success ? !data.exists : false);
      } catch {
        setEmailAvailable(false);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);
    return () => clearTimeout(emailTimer.current);
  }, [email, emailChanged]);

  // ── Avatar upload handler ──
  const handleAvatarChange = (e) => {
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
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Submit form ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    if (fullName.length < 2) {
      setError('Full name must be at least 2 characters.');
      setSaving(false);
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      setSaving(false);
      return;
    }
    if (usernameChanged && usernameAvailable === false) {
      setError('Username is already taken.');
      setSaving(false);
      return;
    }
    if (emailChanged && emailAvailable === false) {
      setError('Email is already registered.');
      setSaving(false);
      return;
    }

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) throw new Error('Not authenticated');
      const token = await firebaseUser.getIdToken();

      let avatarUrl = currentAvatar;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('image', avatarFile);
        const uploadRes = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          avatarUrl = uploadData.url;
        } else {
          throw new Error(uploadData.error || 'Avatar upload failed');
        }
      }

      const payload = {
        username: username.trim().toLowerCase(),
        fullname: fullName.trim(),
        email: email.trim().toLowerCase(),
        avatar: avatarUrl,
      };

      const updateRes = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const updateData = await updateRes.json();

      if (updateData.success) {
        setSuccess('Profile updated successfully! 🎉');
        await invalidateProfile();
        setTimeout(() => router.push('/profile'), 1500);
      } else {
        setError(updateData.error || 'Update failed');
      }
    } catch (err) {
      console.error('Submit error:', err);
      if (err.message === 'Not authenticated') {
        setError('You are not logged in. Please log in again.');
      } else if (err.message.includes('avatar')) {
        setError('Avatar upload failed. Please try a different image.');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
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
        <Meta title="Edit Profile | Make Trend" />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Back Button Skeleton */}
            <div className="w-20 h-9 bg-gray-200 rounded-lg animate-pulse mb-4" />

            {/* Card Skeleton */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 sm:p-8">
              <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse mb-6" />

              {/* Avatar Skeleton */}
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 mb-6">
                <div className="w-28 h-28 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>

              {/* Form Fields Skeleton */}
              <div className="space-y-5">
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                </div>
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
                </div>
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
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
        title="Edit Profile | Make Trend"
        description="Update your name, username, email, and profile picture on Make Trend."
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* ── Back Button ── */}
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 mb-4 px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <FiArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 sm:p-8 backdrop-blur-sm transition-all hover:shadow-2xl">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Edit
              </span>
              Profile
            </h1>

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

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ── Avatar ── */}
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 overflow-hidden flex items-center justify-center shadow-inner border-4 border-white shadow-md transition-all duration-300 group-hover:shadow-xl">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FiUser className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-1 -right-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full p-2.5 cursor-pointer hover:shadow-lg transition-all duration-200 shadow-md hover:scale-110 hover:shadow-purple-200"
                  >
                    <FiCamera className="w-5 h-5" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                      disabled={saving}
                    />
                  </label>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm font-medium text-gray-700">
                    Click the camera icon to change your profile picture.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    JPEG, PNG, WEBP, GIF up to 5MB
                  </p>
                </div>
              </div>

              {/* ── Full Name ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={saving}
                  placeholder="John Doe"
                />
                <p className="mt-1 text-xs text-gray-400">
                  {fullName.length}/100 characters
                </p>
              </div>

              {/* ── Username ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition disabled:opacity-50 disabled:cursor-not-allowed pr-28 ${
                      !usernameChanged
                        ? 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                        : usernameAvailable === true && username.length >= 3
                        ? 'border-green-500 focus:ring-green-200 bg-green-50/30'
                        : usernameAvailable === false && username.length >= 3
                        ? 'border-red-500 focus:ring-red-200 bg-red-50/30'
                        : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                    }`}
                    required
                    disabled={saving}
                    placeholder="john_doe"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium">
                    {!usernameChanged ? (
                      <span className="text-gray-400">(unchanged)</span>
                    ) : isCheckingUsername ? (
                      <span className="text-gray-400 flex items-center gap-1">
                        <FiLoader className="w-3 h-3 animate-spin" /> Checking…
                      </span>
                    ) : username.length >= 3 && usernameAvailable === true ? (
                      <span className="text-green-600">✓ Available</span>
                    ) : username.length >= 3 && usernameAvailable === false ? (
                      <span className="text-red-600">✗ Taken</span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  3-30 characters, lowercase letters, numbers, underscore.
                </p>
              </div>

              {/* ── Email ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                    className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition disabled:opacity-50 disabled:cursor-not-allowed pr-28 ${
                      !emailChanged
                        ? 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                        : emailAvailable === true && email.includes('@')
                        ? 'border-green-500 focus:ring-green-200 bg-green-50/30'
                        : emailAvailable === false && email.includes('@')
                        ? 'border-red-500 focus:ring-red-200 bg-red-50/30'
                        : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                    }`}
                    required
                    disabled={saving}
                    placeholder="you@example.com"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium">
                    {!emailChanged ? (
                      <span className="text-gray-400">(unchanged)</span>
                    ) : isCheckingEmail ? (
                      <span className="text-gray-400 flex items-center gap-1">
                        <FiLoader className="w-3 h-3 animate-spin" /> Checking…
                      </span>
                    ) : email.includes('@') && emailAvailable === true ? (
                      <span className="text-green-600">✓ Available</span>
                    ) : email.includes('@') && emailAvailable === false ? (
                      <span className="text-red-600">✗ Taken</span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Changing your email will update your login credentials.
                </p>
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-5 h-5" />
                      Save Changes
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