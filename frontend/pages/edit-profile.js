// pages/edit-profile.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { auth } from '../services/firebase';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';

export default function EditProfile() {
  const router = useRouter();
  const { user, refreshUser } = useAuth(); // we'll refresh after update
  const [loading, setLoading] = useState(true);
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

  // Debounce timers
  const usernameTimer = useRef(null);
  const emailTimer = useRef(null);

  // Load current user data from context or direct fetch
  useEffect(() => {
    const loadUser = async () => {
      try {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
          router.push('/login');
          return;
        }
        // Fetch fresh profile from /auth/me
        const token = await firebaseUser.getIdToken();
        const res = await axios.get(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success && res.data.user) {
          const data = res.data.user;
          setFullName(data.fullname || '');
          setUsername(data.username || '');
          setEmail(data.email || '');
          setCurrentAvatar(data.avatar || '');
          setAvatarPreview(data.avatar || '');
        } else {
          // fallback to context user
          if (user) {
            setFullName(user.fullName || user.fullname || '');
            setUsername(user.username || '');
            setEmail(user.email || '');
            setCurrentAvatar(user.avatar || user.photoURL || '');
            setAvatarPreview(user.avatar || user.photoURL || '');
          }
        }
      } catch (err) {
        console.error('Load user error:', err);
        if (user) {
          setFullName(user.fullName || user.fullname || '');
          setUsername(user.username || '');
          setEmail(user.email || '');
          setCurrentAvatar(user.avatar || user.photoURL || '');
          setAvatarPreview(user.avatar || user.photoURL || '');
        }
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [user, router]);

  // ── Check username availability ──
  useEffect(() => {
    clearTimeout(usernameTimer.current);
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setIsCheckingUsername(true);
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (data.success) {
          // If the username is the current one, it's available (we're not changing)
          const currentUsername = user?.username || '';
          setUsernameAvailable(data.available || (username === currentUsername));
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
  }, [username, user?.username]);

  // ── Check email availability ──
  useEffect(() => {
    clearTimeout(emailTimer.current);
    if (!email || !email.includes('@')) {
      setEmailAvailable(null);
      return;
    }
    setIsCheckingEmail(true);
    emailTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/check-email?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        if (data.success) {
          const currentEmail = user?.email || '';
          setEmailAvailable(data.exists ? (email === currentEmail) : true);
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
  }, [email, user?.email]);

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

    // Validate
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
    if (usernameAvailable === false) {
      setError('Username is already taken.');
      setSaving(false);
      return;
    }
    if (emailAvailable === false) {
      setError('Email is already registered.');
      setSaving(false);
      return;
    }

    try {
      // 1) Upload avatar if changed
      let avatarUrl = currentAvatar;
      if (avatarFile) {
        const firebaseUser = auth.currentUser;
        const token = await firebaseUser.getIdToken();
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
      const firebaseUser = auth.currentUser;
      const token = await firebaseUser.getIdToken();
      const payload = { username, fullname: fullName, email, avatar: avatarUrl };
      const updateRes = await fetch(`${API_BASE}/api/auth/profile`, {
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
        // Refresh the auth context user
        await refreshUser();
        // Redirect after short delay
        setTimeout(() => router.push('/profile'), 1500);
      } else {
        setError(updateData.error || 'Update failed');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Something went wrong');
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h1>

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
            {/* Avatar */}
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl text-gray-400">👤</span>
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-1 -right-1 bg-purple-600 text-white rounded-full p-1.5 cursor-pointer hover:bg-purple-700 transition shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
                <p className="text-sm text-gray-500">Click the camera icon to change your profile picture.</p>
                <p className="text-xs text-gray-400">JPEG, PNG, WEBP, GIF up to 5MB</p>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                required
                disabled={saving}
                placeholder="John Doe"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:ring-2 transition ${
                    usernameAvailable === true && username.length >= 3
                      ? 'border-green-500 focus:ring-green-200'
                      : usernameAvailable === false && username.length >= 3
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                  required
                  disabled={saving}
                  placeholder="john_doe"
                />
                {isCheckingUsername && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">⏳</span>
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

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:ring-2 transition ${
                    emailAvailable === true && email.includes('@')
                      ? 'border-green-500 focus:ring-green-200'
                      : emailAvailable === false && email.includes('@')
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                  required
                  disabled={saving}
                  placeholder="you@example.com"
                />
                {isCheckingEmail && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">⏳</span>
                )}
                {!isCheckingEmail && email.includes('@') && emailAvailable === true && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-600 font-medium">✓ Available</span>
                )}
                {!isCheckingEmail && email.includes('@') && emailAvailable === false && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-red-600 font-medium">✗ Taken</span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">Changing your email will update your login credentials.</p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
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