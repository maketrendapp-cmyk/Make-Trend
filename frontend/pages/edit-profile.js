// pages/edit-profile.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { auth } from '../services/firebase';
import Meta from '../components/Meta';

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com') + '/api';

export default function EditProfile() {
  const router = useRouter();
  const { user, profile: contextProfile, refreshUser, dataLoaded, refetchProfile } = useAuth();
  const [loading, setLoading] = useState(!dataLoaded);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [currentAvatar, setCurrentAvatar] = useState('');

  // Username / email availability states
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Track if fields have changed from original values
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [emailChanged, setEmailChanged] = useState(false);

  // Debounce timers
  const usernameTimer = useRef(null);
  const emailTimer = useRef(null);

  // ── Populate form from contextProfile ──
  useEffect(() => {
    if (contextProfile) {
      setFullName(contextProfile.fullname || contextProfile.name || '');
      setUsername(contextProfile.username || '');
      setEmail(contextProfile.email || '');
      setCurrentAvatar(contextProfile.avatar || contextProfile.profilePic || '');
      setAvatarPreview(contextProfile.avatar || contextProfile.profilePic || '');
      setLoading(false);
    } else if (dataLoaded) {
      setLoading(false);
    }
  }, [contextProfile, dataLoaded]);

  // ── Track if username changed ──
  useEffect(() => {
    if (contextProfile) {
      const originalUsername = contextProfile.username || '';
      setUsernameChanged(username !== originalUsername);
    }
  }, [username, contextProfile]);

  // ── Track if email changed ──
  useEffect(() => {
    if (contextProfile) {
      const originalEmail = contextProfile.email || '';
      setEmailChanged(email !== originalEmail);
    }
  }, [email, contextProfile]);

  // ── Redirect if not authenticated ──
  useEffect(() => {
    if (dataLoaded && !user) {
      router.push('/login');
    }
  }, [dataLoaded, user, router]);

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
        if (data.success) {
          setUsernameAvailable(data.available);
        } else {
          setUsernameAvailable(false);
        }
      } catch (err) {
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
        if (data.success) {
          setEmailAvailable(data.exists ? false : true);
        } else {
          setEmailAvailable(false);
        }
      } catch (err) {
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

    // ── Validation ──
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

      // 1) Upload avatar if changed
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

      // 2) Update profile
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
        setSuccess('Profile updated successfully!');
        // ── Refresh both auth user AND global profile ──
        await refreshUser();
        await refetchProfile();
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

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <Meta title="Loading Profile | Make Trend" />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-purple-50/30">
          <div className="text-center">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-purple-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

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
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 sm:p-8 backdrop-blur-sm transition-all hover:shadow-2xl">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Edit</span> Profile
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
                <span className="text-red-500 text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-start gap-2 animate-fadeIn">
                <span className="text-green-500 text-lg">✅</span>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ── Avatar ── */}
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 overflow-hidden flex items-center justify-center shadow-inner border-4 border-white shadow-md">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl text-gray-400">👤</span>
                    )}
                  </div>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-1 -right-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full p-2 cursor-pointer hover:shadow-lg transition-all duration-200 shadow-md hover:scale-110"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
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
                  <p className="text-sm text-gray-600 font-medium">Click the camera icon to change your profile picture.</p>
                  <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG, WEBP, GIF up to 5MB</p>
                </div>
              </div>

              {/* ── Full Name ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                  required
                  disabled={saving}
                  placeholder="John Doe"
                />
              </div>

              {/* ── Username ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 transition ${
                      !usernameChanged
                        ? 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                        : usernameAvailable === true && username.length >= 3
                        ? 'border-green-500 focus:ring-green-200'
                        : usernameAvailable === false && username.length >= 3
                        ? 'border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                    }`}
                    required
                    disabled={saving}
                    placeholder="john_doe"
                  />
                  {!usernameChanged ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">(unchanged)</span>
                  ) : isCheckingUsername ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">⏳</span>
                  ) : username.length >= 3 && usernameAvailable === true ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-600 font-medium">✓ Available</span>
                  ) : username.length >= 3 && usernameAvailable === false ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-red-600 font-medium">✗ Taken</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-gray-400">3-30 characters, lowercase letters, numbers, underscore.</p>
              </div>

              {/* ── Email ── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                    className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 transition ${
                      !emailChanged
                        ? 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                        : emailAvailable === true && email.includes('@')
                        ? 'border-green-500 focus:ring-green-200'
                        : emailAvailable === false && email.includes('@')
                        ? 'border-red-500 focus:ring-red-200'
                        : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                    }`}
                    required
                    disabled={saving}
                    placeholder="you@example.com"
                  />
                  {!emailChanged ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">(unchanged)</span>
                  ) : isCheckingEmail ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">⏳</span>
                  ) : email.includes('@') && emailAvailable === true ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-600 font-medium">✓ Available</span>
                  ) : email.includes('@') && emailAvailable === false ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-red-600 font-medium">✗ Taken</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-gray-400">Changing your email will update your login credentials.</p>
              </div>

              {/* ── Buttons ── */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/profile')}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200"
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
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}