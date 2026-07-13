// pages/support.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { auth } from '../services/firebase';
import Link from 'next/link';
import { FiSend, FiChevronRight, FiImage, FiX, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';

export default function Support() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [profile, setProfile] = useState(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef(null);

  // Fetch user profile and tickets
  useEffect(() => {
    const fetchData = async () => {
      try {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) {
          router.push('/login');
          return;
        }

        const token = await firebaseUser.getIdToken();

        // Fetch profile
        const profileRes = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profileData = await profileRes.json();
        if (profileData.success && profileData.user) {
          setProfile(profileData.user);
        } else {
          setProfile({
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'user',
            fullname: firebaseUser.displayName || firebaseUser.email || 'User',
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL || '',
          });
        }

        // Fetch tickets
        const ticketsRes = await fetch(`${API_BASE}/api/support`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ticketsData = await ticketsRes.json();
        if (ticketsData.success) {
          setTickets(ticketsData.tickets || []);
        }
      } catch (err) {
        console.error('Fetch support data error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  // ── Image upload handler ──
  const handleImageChange = (e) => {
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
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit ticket ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (!title.trim()) {
      setError('Please enter a title.');
      setSubmitting(false);
      return;
    }
    if (!description.trim()) {
      setError('Please enter a description.');
      setSubmitting(false);
      return;
    }

    try {
      const firebaseUser = auth.currentUser;
      const token = await firebaseUser.getIdToken();

      // 1) Upload image if any
      let imageUrl = '';
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadRes = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          imageUrl = uploadData.url;
        } else {
          throw new Error(uploadData.error || 'Image upload failed');
        }
      }

      // 2) Create ticket
      const payload = { title: title.trim(), description: description.trim(), image: imageUrl };
      const createRes = await fetch(`${API_BASE}/api/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const createData = await createRes.json();
      if (createData.success) {
        setSuccess('Report submitted successfully!');
        setTickets(prev => [createData.ticket, ...prev]);
        setTitle('');
        setDescription('');
        removeImage();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(createData.error || 'Failed to submit report.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status badge ──
  const statusBadge = (status) => {
    const styles = {
      open: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
      resolved: 'bg-green-100 text-green-700 border-green-200',
    };
    const icons = {
      open: <FiClock className="w-3.5 h-3.5" />,
      'in-progress': <FiAlertCircle className="w-3.5 h-3.5" />,
      resolved: <FiCheckCircle className="w-3.5 h-3.5" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.open}`}>
        {icons[status] || icons.open}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      let date;
      if (timestamp.toDate) date = timestamp.toDate();
      else if (timestamp.seconds) date = new Date(timestamp.seconds * 1000);
      else date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
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

  const displayUser = profile || {
    username: 'User',
    fullname: 'User',
    email: auth.currentUser?.email || 'user@example.com',
    avatar: auth.currentUser?.photoURL || '',
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Support</h1>
              <p className="text-gray-500 text-sm">Submit a report or view your previous tickets</p>
            </div>
            <Link href="/profile">
              <button className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1">
                Back to Profile <FiChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* ── User Info Box ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
              {displayUser.avatar ? (
                <img src={displayUser.avatar} alt={displayUser.fullname} className="w-full h-full object-cover" />
              ) : (
                displayUser.fullname?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{displayUser.fullname || displayUser.username || 'User'}</p>
              <p className="text-gray-500 text-sm">@{displayUser.username || 'user'}</p>
              <p className="text-gray-400 text-sm">{displayUser.email}</p>
            </div>
          </div>
        </div>

        {/* ── Submit Report Box ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit a Report</h2>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                placeholder="Brief summary of the issue"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                placeholder="Provide details about your issue..."
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Optional Image</label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm flex items-center gap-2"
                  disabled={submitting}
                >
                  <FiImage className="w-4 h-4" />
                  Choose Image
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={submitting}
                />
                {imagePreview && (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">JPEG, PNG, WEBP, GIF up to 5MB</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50"
            >
              <FiSend className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>

        {/* ── Previous Reports ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Previous Reports ({tickets.length})
          </h2>
          {tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No reports submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{ticket.title}</h3>
                        {statusBadge(ticket.status)}
                      </div>
                      <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{ticket.description}</p>
                      {ticket.image && (
                        <div className="mt-2">
                          <img src={ticket.image} alt="Attachment" className="max-w-full max-h-40 rounded-lg border border-gray-200" />
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(ticket.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}