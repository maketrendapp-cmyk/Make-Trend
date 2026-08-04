// pages/groweachother/exchange/[id].js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Meta from '../../../components/Meta';
import { useAuth } from '../../../components/AuthScreen';
import { getToken } from '../../../lib/api';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUser,
  FiLoader,
  FiExternalLink,
} from 'react-icons/fi';
import {
  FaYoutube,
  FaInstagram,
  FaTwitter,
  FaFacebook,
  FaTiktok,
  FaTwitch,
  FaLinkedin,
  FaGithub,
  FaLink,
} from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

const PLATFORM_ICONS = {
  youtube: FaYoutube,
  instagram: FaInstagram,
  twitter: FaTwitter,
  facebook: FaFacebook,
  tiktok: FaTiktok,
  twitch: FaTwitch,
  linkedin: FaLinkedin,
  github: FaGithub,
};

const PLATFORM_COLORS = {
  youtube: 'text-red-600',
  instagram: 'text-pink-600',
  twitter: 'text-blue-400',
  facebook: 'text-blue-700',
  tiktok: 'text-black',
  twitch: 'text-purple-600',
  linkedin: 'text-blue-600',
  github: 'text-gray-800',
};

const STATUS_COLORS = {
  waiting: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  done: 'text-green-600 bg-green-50 border-green-200',
  cancelled: 'text-red-600 bg-red-50 border-red-200',
  completed: 'text-blue-600 bg-blue-50 border-blue-200',
  active: 'text-purple-600 bg-purple-50 border-purple-200',
};

const STATUS_LABELS = {
  waiting: '⏳ Waiting',
  done: '✅ Done',
  cancelled: '❌ Cancelled',
  completed: '🎉 Completed',
  active: '🔄 Active',
};

export default function ExchangeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const [exchange, setExchange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch exchange ──
  const fetchExchange = async () => {
    if (!id || !isAuthenticated) return;

    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/exchanges/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!data.success) {
        if (res.status === 404) {
          setError('Exchange not found');
        } else {
          setError(data.error || 'Failed to load exchange');
        }
        return;
      }

      setExchange(data.exchange);
      setError('');
    } catch (err) {
      console.error('Fetch exchange error:', err);
      setError(err.message || 'Failed to load exchange');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && isAuthenticated && user) {
      fetchExchange();
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [id, isAuthenticated, user]);

  // ── Update exchange status ──
  const updateStatus = async (status) => {
    if (!exchange || submitting) return;

    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_BASE}/exchanges/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update status');
      }

      setExchange(data.exchange);
    } catch (err) {
      console.error('Update status error:', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Get platform icon ──
  const getPlatformIcon = (platform) => {
    const Icon = PLATFORM_ICONS[platform?.toLowerCase()] || FaLink;
    return Icon;
  };

  const getPlatformColor = (platform) => {
    return PLATFORM_COLORS[platform?.toLowerCase()] || 'text-purple-600';
  };

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="Exchange | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900">Sign In Required</h2>
            <p className="text-gray-500 mt-2 text-sm">Please sign in to view this exchange.</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition w-full"
            >
              Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Meta title="Exchange | Make Trend" />
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-2xl mx-auto animate-pulse">
            <div className="h-6 w-24 bg-gray-200 rounded mb-6" />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-center py-12">
                <FiLoader className="w-8 h-8 text-purple-600 animate-spin" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !exchange) {
    return (
      <>
        <Meta title="Exchange | Make Trend" />
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <Link href="/groweachother/my-exchanges" className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 transition mb-4">
              <FiArrowLeft className="w-4 h-4" />
              Back to Exchanges
            </Link>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="text-5xl mb-3">😕</div>
              <p className="text-gray-500">{error || 'Exchange not found'}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const userIsA = exchange.userA?.uid === user?.uid;
  const mySide = userIsA ? 'A' : 'B';
  const myTask = userIsA ? exchange.userATask : exchange.userBTask;
  const otherTask = userIsA ? exchange.userBTask : exchange.userATask;
  const otherUser = userIsA ? exchange.userB : exchange.userA;
  const myStatus = userIsA ? exchange.userAStatus : exchange.userBStatus;
  const otherStatus = userIsA ? exchange.userBStatus : exchange.userAStatus;

  const isCompleted = exchange.overallStatus === 'completed';
  const isCancelled = exchange.overallStatus === 'cancelled';
  const isActive = exchange.overallStatus === 'active';
  const canAct = isActive && myStatus !== 'done' && myStatus !== 'cancelled';

  const MyIcon = getPlatformIcon(myTask?.platform);
  const MyColor = getPlatformColor(myTask?.platform);
  const OtherIcon = getPlatformIcon(otherTask?.platform);
  const OtherColor = getPlatformColor(otherTask?.platform);

  return (
    <>
      <Meta title="Exchange | Make Trend" />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-2xl mx-auto">
          {/* ── Back ── */}
          <Link href="/groweachother/my-exchanges" className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 transition mb-4">
            <FiArrowLeft className="w-4 h-4" />
            Back to Exchanges
          </Link>

          {/* ── Exchange Card ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Exchange</h1>
                <p className="text-sm text-gray-500">#{exchange.id?.slice(-6) || 'N/A'}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full border ${
                  isCompleted
                    ? 'text-blue-600 bg-blue-50 border-blue-200'
                    : isCancelled
                    ? 'text-red-600 bg-red-50 border-red-200'
                    : 'text-purple-600 bg-purple-50 border-purple-200'
                }`}
              >
                {isCompleted ? '✅ Completed' : isCancelled ? '❌ Cancelled' : '🔄 Active'}
              </span>
            </div>

            {/* ── Your Side ── */}
            <div className="p-5 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">You</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <MyIcon className={`w-6 h-6 ${MyColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">
                    {myTask?.platform || 'Task'} – {myTask?.taskType || 'Action'}
                  </p>
                  {myTask?.title && (
                    <p className="text-sm text-gray-500">{myTask.title}</p>
                  )}
                  <a
                    href={myTask?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <FiExternalLink className="w-3 h-3" />
                    {myTask?.url?.replace(/^https?:\/\//, '') || 'View'}
                  </a>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${
                    STATUS_COLORS[myStatus] || STATUS_COLORS.waiting
                  }`}
                >
                  {STATUS_LABELS[myStatus] || myStatus}
                </span>
              </div>
            </div>

            {/* ── Exchange Arrow ── */}
            <div className="flex justify-center py-2 text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>

            {/* ── Other Side ── */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {otherUser?.avatar ? (
                    <img src={otherUser.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FiUser className="w-3 h-3 text-gray-500" />
                  )}
                </div>
                <p className="text-xs font-medium text-gray-400">
                  {otherUser?.fullname || otherUser?.username || 'User'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <OtherIcon className={`w-6 h-6 ${OtherColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">
                    {otherTask?.platform || 'Task'} – {otherTask?.taskType || 'Action'}
                  </p>
                  {otherTask?.title && (
                    <p className="text-sm text-gray-500">{otherTask.title}</p>
                  )}
                  <a
                    href={otherTask?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <FiExternalLink className="w-3 h-3" />
                    {otherTask?.url?.replace(/^https?:\/\//, '') || 'View'}
                  </a>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${
                    STATUS_COLORS[otherStatus] || STATUS_COLORS.waiting
                  }`}
                >
                  {STATUS_LABELS[otherStatus] || otherStatus}
                </span>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="p-5 bg-gray-50">
              {isCompleted ? (
                <div className="text-center py-2">
                  <p className="text-green-600 font-medium">🎉 Exchange Completed!</p>
                  <p className="text-sm text-gray-500">Both sides have completed their tasks.</p>
                </div>
              ) : isCancelled ? (
                <div className="text-center py-2">
                  <p className="text-red-600 font-medium">❌ Exchange Cancelled</p>
                  <p className="text-sm text-gray-500">This exchange has been cancelled.</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  {canAct && (
                    <>
                      <button
                        onClick={() => updateStatus('done')}
                        disabled={submitting}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition shadow-sm disabled:opacity-50"
                      >
                        {submitting ? (
                          <FiLoader className="w-5 h-5 animate-spin" />
                        ) : (
                          <FiCheckCircle className="w-5 h-5" />
                        )}
                        {submitting ? 'Updating...' : '✅ Done'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this exchange?')) {
                            updateStatus('cancel');
                          }
                        }}
                        disabled={submitting}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition shadow-sm disabled:opacity-50"
                      >
                        <FiXCircle className="w-5 h-5" />
                        Cancel
                      </button>
                    </>
                  )}
                  {!canAct && isActive && myStatus === 'done' && (
                    <div className="text-center py-2 w-full">
                      <p className="text-green-600 font-medium">✅ You've completed your part!</p>
                      <p className="text-sm text-gray-500">Waiting for {otherUser?.fullname || otherUser?.username || 'the other user'} to complete theirs.</p>
                    </div>
                  )}
                  {!canAct && isActive && myStatus === 'waiting' && (
                    <div className="text-center py-2 w-full">
                      <p className="text-yellow-600 font-medium">⏳ Waiting for you to complete your part.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}