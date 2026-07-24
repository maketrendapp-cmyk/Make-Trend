// pages/support.js
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { useProfile, useSupportTickets, useInvalidateQueries } from '../lib/queries';
import { auth } from '../services/firebase';
import Link from 'next/link';
import Meta from '../components/Meta';
import {
  FiSend,
  FiChevronRight,
  FiImage,
  FiX,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiUser,
  FiMail,
} from 'react-icons/fi';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';

export default function Support() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);
const { data: tickets = [], isLoading: ticketsLoading } = useSupportTickets(isAuthenticated);
  const { invalidateSupportTickets } = useInvalidateQueries();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef(null);

  // ── Set loading false when data is loaded ──
  useEffect(() => {
    if (!profileLoading && !ticketsLoading) {
      setLoading(false);
    }
  }, [profileLoading, ticketsLoading]);

  // ── Redirect if not authenticated ──
  useEffect(() => {
    if (!profileLoading && !user) {
      router.push('/login');
    }
  }, [profileLoading, user, router]);

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
      if (!firebaseUser) {
        setError('You must be logged in.');
        setSubmitting(false);
        return;
      }
      const token = await firebaseUser.getIdToken();

// 1) Upload image if any
let imageUrl = '';
if (imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);
  const uploadRes = await fetch(`${API_BASE}/api/upload?folder=support`, {
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
        await invalidateSupportTickets();
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

  // ── Robust date formatter ──
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';

    try {
      let date;

      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (typeof timestamp === 'object') {
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          date = timestamp.toDate();
        } else if (timestamp.seconds !== undefined) {
          date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1e6);
        } else if (timestamp._seconds !== undefined) {
          date = new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1e6);
        } else {
          date = new Date(timestamp);
        }
      } else {
        return 'N/A';
      }

      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return 'N/A';
      }

      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.warn('Date formatting error:', error);
      return 'N/A';
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
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
          styles[status] || styles.open
        }`}
      >
        {icons[status] || icons.open}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // ── Loading state ──
  if (loading || profileLoading || ticketsLoading || (user && !profile)) {
    return (
      <>
        <Meta title="Support | Make Trend" />
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-8 px-4">
          <div className="max-w-4xl mx-auto">
            {/* ── Header Skeleton ── */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 mb-6 animate-pulse">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                </div>
                <div className="h-6 w-24 bg-gray-200 rounded" />
              </div>
            </div>

            {/* ── User Info Box Skeleton ── */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 mb-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                  <div className="h-4 w-48 bg-gray-200 rounded" />
                </div>
              </div>
            </div>

            {/* ── Submit Report Box Skeleton ── */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 mb-6 animate-pulse">
              <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
              <div className="space-y-4">
                <div>
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-12 bg-gray-200 rounded-xl" />
                </div>
                <div>
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                  <div className="h-24 bg-gray-200 rounded-xl" />
                </div>
                <div>
                  <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-28 bg-gray-200 rounded-xl" />
                    <div className="w-20 h-20 bg-gray-200 rounded-xl" />
                  </div>
                </div>
                <div className="h-12 w-40 bg-gray-200 rounded-xl" />
              </div>
            </div>

            {/* ── Previous Reports Skeleton ── */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 animate-pulse">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-32 bg-gray-200 rounded" />
                <div className="h-6 w-10 bg-gray-200 rounded-full" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-2xl p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-40 bg-gray-200 rounded" />
                          <div className="h-6 w-20 bg-gray-200 rounded-full" />
                        </div>
                        <div className="h-4 w-64 bg-gray-200 rounded mt-2" />
                        <div className="h-4 w-48 bg-gray-200 rounded mt-1" />
                      </div>
                      <div className="h-4 w-24 bg-gray-200 rounded mt-2 sm:mt-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Display user ──
  const displayUser = {
    username: profile?.username || 'User',
    fullname: profile?.fullname || profile?.name || 'User',
    email: profile?.email || user?.email || 'user@example.com',
    avatar: profile?.avatar || profile?.profilePic || user?.photoURL || '',
  };

  return (
    <>
      <Meta
        title="Support | Make Trend"
        description="Get help with Make Trend. Submit a support ticket or view your previous requests."
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* ── Header ── */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 mb-6 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Support</span>
                </h1>
                <p className="text-gray-500 text-sm mt-0.5">Submit a report or view your previous tickets</p>
              </div>
              <Link href="/profile">
                <button className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors">
                  Back to Profile <FiChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* ── User Info Box ── */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-2xl font-bold text-purple-600 overflow-hidden border-2 border-white shadow-md">
                {displayUser.avatar ? (
                  <img src={displayUser.avatar} alt={displayUser.fullname} className="w-full h-full object-cover" />
                ) : (
                  displayUser.fullname?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">{displayUser.fullname}</p>
                <p className="text-gray-500 text-sm flex items-center gap-1">
                  <FiUser className="w-3.5 h-3.5" /> @{displayUser.username}
                </p>
                <p className="text-gray-400 text-sm flex items-center gap-1">
                  <FiMail className="w-3.5 h-3.5" /> {displayUser.email}
                </p>
              </div>
            </div>
          </div>

          {/* ── Submit Report Box ── */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 mb-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📝 Submit a Report</h2>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
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
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition resize-y"
                  placeholder="Provide details about your issue..."
                  required
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Optional Image</label>
                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition text-sm font-medium"
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
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-xl border-2 border-gray-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition shadow-md"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-400">JPEG, PNG, WEBP, GIF up to 5MB</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend className="w-5 h-5" />
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          </div>

          {/* ── Previous Reports ── */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100/60 p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              📋 Previous Reports
              <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                {tickets.length}
              </span>
            </h2>
            {tickets.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <div className="text-5xl mb-3">📭</div>
                <p className="font-medium">No reports submitted yet.</p>
                <p className="text-sm">Your tickets will appear here once you create one.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="border border-gray-200 rounded-2xl p-5 hover:shadow-lg transition-all duration-200 bg-white/50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-lg">{ticket.title}</h3>
                          {statusBadge(ticket.status)}
                        </div>
                        <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{ticket.description}</p>
                        {ticket.image && (
                          <div className="mt-3">
                            <img
                              src={ticket.image}
                              alt="Attachment"
                              className="max-w-full max-h-48 rounded-xl border border-gray-200 shadow-sm"
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-400 whitespace-nowrap mt-2 sm:mt-0">
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

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}