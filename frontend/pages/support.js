// pages/support.js
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
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
  const { user, profile: contextProfile, supportTickets, dataLoaded, refetchSupportTickets } = useAuth();
  const [loading, setLoading] = useState(!dataLoaded);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState(supportTickets || []);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef(null);

  // ── Update tickets when context updates ──
  useEffect(() => {
    if (supportTickets) {
      setTickets(supportTickets);
    }
  }, [supportTickets]);

  // ── Set loading false when data is loaded ──
  useEffect(() => {
    if (dataLoaded) {
      setLoading(false);
    }
  }, [dataLoaded]);

  // ── Redirect if not authenticated ──
  useEffect(() => {
    if (dataLoaded && !user) {
      router.push('/login');
    }
  }, [dataLoaded, user, router]);

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
        await refetchSupportTickets();
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

      // ── Handle different timestamp types ──
      if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (typeof timestamp === 'object') {
        // ── Firestore Timestamp (from Admin SDK or client) ──
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          date = timestamp.toDate();
        } else if (timestamp.seconds !== undefined) {
          date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1e6);
        } else if (timestamp._seconds !== undefined) {
          date = new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1e6);
        } else {
          // ── Fallback: try to parse as Date ──
          date = new Date(timestamp);
        }
      } else {
        return 'N/A';
      }

      // ── Validate date ──
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return 'N/A';
      }

      // ── Return formatted string ──
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
  if (loading || !dataLoaded) {
    return (
      <>
        <Meta title="Support | Make Trend" />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-purple-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  // ── Display user ──
  const displayUser = {
    username: contextProfile?.username || 'User',
    fullname: contextProfile?.fullname || contextProfile?.name || 'User',
    email: contextProfile?.email || user?.email || 'user@example.com',
    avatar: contextProfile?.avatar || contextProfile?.profilePic || user?.photoURL || '',
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