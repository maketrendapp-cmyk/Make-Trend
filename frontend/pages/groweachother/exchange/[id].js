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
  FiCheck,
  FiX,
  FiCompass,
  FiPlus,
  FiRepeat,
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
  youtube: 'text-red-600 bg-red-50 border-red-100',
  instagram: 'text-pink-600 bg-pink-50 border-pink-100',
  twitter: 'text-blue-400 bg-blue-50 border-blue-100',
  facebook: 'text-blue-700 bg-blue-50 border-blue-100',
  tiktok: 'text-black bg-gray-100 border-gray-200',
  twitch: 'text-purple-600 bg-purple-50 border-purple-100',
  linkedin: 'text-blue-600 bg-blue-50 border-blue-100',
  github: 'text-gray-800 bg-gray-100 border-gray-200',
};

const STATUS_BADGE_CLASSES = {
  waiting: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
};

const STATUS_ICONS = {
  waiting: FiClock,
  done: FiCheckCircle,
  cancelled: FiXCircle,
  completed: FiCheck,
};

const STATUS_LABELS = {
  waiting: 'Waiting',
  done: 'Done',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export default function ExchangeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const [exchange, setExchange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Custom cancellation modal state (fixes raw browser prompt)
  const [showCancelModal, setShowCancelModal] = useState(false);

  // ── Format date robustly ──
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    try {
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds !== undefined) {
        date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1e6);
      } else if (timestamp._seconds !== undefined) {
        date = new Date(timestamp._seconds * 1000);
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

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
        if (res.status === 404) setError('Exchange not found');
        else setError(data.error || 'Failed to load exchange');
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
    if (id && isAuthenticated && user) fetchExchange();
    else if (!isAuthenticated) setLoading(false);
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
      if (!data.success) throw new Error(data.error || 'Failed to update status');
      setExchange(data.exchange);
      setShowCancelModal(false);
    } catch (err) {
      console.error('Update status error:', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const getPlatformIcon = (platform) => PLATFORM_ICONS[platform?.toLowerCase()] || FaLink;
  const getPlatformColor = (platform) => PLATFORM_COLORS[platform?.toLowerCase()] || 'text-purple-600 bg-purple-50 border-purple-100';
  const getStatusIcon = (status) => STATUS_ICONS[status] || FiClock;
  const getStatusClass = (status) => STATUS_BADGE_CLASSES[status] || 'bg-gray-100 text-gray-600 border-gray-200';

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="Exchange | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-8 text-center border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Sign In Required</h2>
            <p className="text-gray-500 text-sm mb-6">Please sign in to view this exchange details.</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition text-sm shadow-sm"
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
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="h-6 w-32 bg-gray-200 rounded-lg mb-6" />
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <div className="flex items-center justify-center py-16">
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
          <div className="max-w-3xl mx-auto">
            <Link href="/groweachother/my-exchanges" className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium transition mb-4">
              <FiArrowLeft className="w-4 h-4" /> Back to Exchanges
            </Link>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="text-4xl mb-3">😕</div>
              <p className="text-gray-600 font-medium">{error || 'Exchange not found'}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const userIsA = exchange.userA?.uid === user?.uid;
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
  const MyStatusIcon = getStatusIcon(myStatus);
  const OtherStatusIcon = getStatusIcon(otherStatus);
  const MyStatusClass = getStatusClass(myStatus);
  const OtherStatusClass = getStatusClass(otherStatus);

  const fullId = exchange.id || id || '';
  const exchangeIdDisplay = fullId.length > 8 ? fullId.slice(-6).toUpperCase() : fullId.toUpperCase() || 'EXCHANGE';

  return (
    <>
      <Meta title={`Exchange #${exchangeIdDisplay} | Make Trend`} />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          
          {/* ── Top Navigation Links Bar (Back button placed first) ── */}
          <div className="flex items-center justify-between gap-2 mb-6 bg-white p-2.5 sm:p-3 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <div className="flex items-center gap-2">
              <Link
                href="/groweachother/my-exchanges"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-xs sm:text-sm transition whitespace-nowrap"
              >
                <FiArrowLeft className="w-4 h-4" /> Back to Exchanges
              </Link>
              <button
                onClick={() => router.push('/groweachother/grow-feed')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50/80 hover:bg-purple-100 text-purple-700 rounded-xl font-medium text-xs sm:text-sm transition border border-purple-100/60 whitespace-nowrap"
              >
                <FiCompass className="w-4 h-4" /> Go to Feed
              </button>
              <button
                onClick={() => router.push('/groweachother/my-tasks')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50/80 hover:bg-purple-100 text-purple-700 rounded-xl font-medium text-xs sm:text-sm transition border border-purple-100/60 whitespace-nowrap"
              >
                <FiPlus className="w-4 h-4" /> My Tasks
              </button>
            </div>
            <button
              onClick={() => router.push('/groweachother/my-exchanges')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium text-xs sm:text-sm transition border border-indigo-100/60 whitespace-nowrap"
            >
              <FiRepeat className="w-4 h-4" /> Exchanges
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* ── Header ── */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Exchange #{exchangeIdDisplay}</h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">Created on {formatDate(exchange.createdAt)}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl border ${
                isCompleted ? 'text-blue-700 bg-blue-50 border-blue-200' :
                isCancelled ? 'text-red-700 bg-red-50 border-red-200' :
                'text-purple-700 bg-purple-50 border-purple-200'
              }`}>
                {isCompleted ? <FiCheck className="w-4 h-4" /> : isCancelled ? <FiX className="w-4 h-4" /> : <FiClock className="w-4 h-4" />}
                {isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : 'Active'}
              </span>
            </div>

            {/* ── Two-column task cards with separated titles ── */}
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* ── Your Task Card ── */}
              <div className="bg-gray-50/70 rounded-2xl p-5 border border-gray-200/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200/50">
                    <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center overflow-hidden flex-shrink-0 font-bold text-xs shadow-sm">
                      {user?.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <FiUser className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">Your Task</p>
                      <p className="text-[11px] text-gray-500 font-medium">Fulfilled by community member</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm ${MyColor}`}>
                      <MyIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md uppercase">
                          {myTask?.taskType || 'Support'}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">on {myTask?.platform || 'Platform'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 truncate mb-1">
                        {myTask?.title || `${myTask?.taskType || 'Task'} request`}
                      </h4>
                      {myTask?.url && (
                        <a href={myTask.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                          <FiExternalLink className="w-3 h-3" /> Visit Link
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-200/50 flex items-center justify-between text-xs font-medium">
                  <span className="text-gray-500">Partner Status:</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${OtherStatusClass}`}>
                    <OtherStatusIcon className="w-3 h-3" /> {STATUS_LABELS[otherStatus] || otherStatus}
                  </span>
                </div>
              </div>

              {/* ── Partner Task Card ── */}
              <div className="bg-gray-50/70 rounded-2xl p-5 border border-gray-200/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200/50">
                    <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0 font-bold text-xs shadow-sm">
                      {otherUser?.avatar ? <img src={otherUser.avatar} alt="" className="w-full h-full object-cover" /> : <FiUser className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">{otherUser?.fullname || otherUser?.username || 'Partner'}</p>
                      <p className="text-[11px] text-gray-500 font-medium">Fulfilled by you</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm ${OtherColor}`}>
                      <OtherIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md uppercase">
                          {otherTask?.taskType || 'Support'}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">on {otherTask?.platform || 'Platform'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 truncate mb-1">
                        {otherTask?.title || `${otherTask?.taskType || 'Task'} request`}
                      </h4>
                      {otherTask?.url && (
                        <a href={otherTask.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                          <FiExternalLink className="w-3 h-3" /> Visit Link
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-200/50 flex items-center justify-between text-xs font-medium">
                  <span className="text-gray-500">Your Status:</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold ${MyStatusClass}`}>
                    <MyStatusIcon className="w-3 h-3" /> {STATUS_LABELS[myStatus] || myStatus}
                  </span>
                </div>
              </div>

            </div>

            {/* ── Actions Footer ── */}
            <div className="p-5 sm:p-6 bg-gray-50 border-t border-gray-100 text-center">
              {isCompleted ? (
                <div className="py-2">
                  <p className="text-emerald-700 font-bold flex items-center justify-center gap-2 text-base"><FiCheck className="w-5 h-5" /> Exchange Successfully Completed!</p>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Both sides have verified and completed their tasks.</p>
                </div>
              ) : isCancelled ? (
                <div className="py-2">
                  <p className="text-red-600 font-bold flex items-center justify-center gap-2 text-base"><FiX className="w-5 h-5" /> Exchange Cancelled</p>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">This exchange session has been closed.</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                  {canAct ? (
                    <>
                      <button
                        onClick={() => updateStatus('done')}
                        disabled={submitting}
                        className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-sm hover:shadow-md transition shadow-sm disabled:opacity-50 active:scale-95"
                      >
                        {submitting ? <FiLoader className="w-5 h-5 animate-spin" /> : <FiCheckCircle className="w-5 h-5" />}
                        {submitting ? 'Updating...' : 'I Completed Their Task'}
                      </button>
                      <button
                        onClick={() => setShowCancelModal(true)}
                        disabled={submitting}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-red-600 border border-red-200 rounded-xl font-bold text-sm hover:bg-red-50 transition shadow-sm disabled:opacity-50"
                      >
                        <FiXCircle className="w-5 h-5" /> Cancel
                      </button>
                    </>
                  ) : (
                    <div className="py-2 w-full">
                      {myStatus === 'done' ? (
                        <p className="text-emerald-700 font-bold flex items-center justify-center gap-2 text-sm sm:text-base"><FiCheckCircle className="w-5 h-5" /> You've marked their task as Done!</p>
                      ) : (
                        <p className="text-amber-700 font-bold flex items-center justify-center gap-2 text-sm sm:text-base"><FiClock className="w-5 h-5" /> Waiting for you to complete their task.</p>
                      )}
                      {myStatus === 'done' && otherStatus === 'waiting' && (
                        <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Waiting for {otherUser?.fullname || otherUser?.username || 'your partner'} to verify and complete yours.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Custom Cancel Confirmation Modal (Replaces browser confirm) ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiXCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1.5">Cancel Exchange</h3>
            <p className="text-gray-500 text-xs sm:text-sm mb-6 leading-relaxed">Are you sure you want to cancel this exchange? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => updateStatus('cancel')}
                disabled={submitting}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {submitting ? <FiLoader className="w-4 h-4 animate-spin" /> : 'Yes, Cancel'}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-200 transition"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

