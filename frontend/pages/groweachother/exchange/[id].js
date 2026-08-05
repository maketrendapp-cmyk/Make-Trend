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
  FiArrowRight,
  FiHeart,
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

const STATUS_BADGE_CLASSES = {
  waiting: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  done: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
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
    } catch (err) {
      console.error('Update status error:', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const getPlatformIcon = (platform) => PLATFORM_ICONS[platform?.toLowerCase()] || FaLink;
  const getPlatformColor = (platform) => PLATFORM_COLORS[platform?.toLowerCase()] || 'text-purple-600';
  const getStatusIcon = (status) => STATUS_ICONS[status] || FiClock;
  const getStatusClass = (status) => STATUS_BADGE_CLASSES[status] || 'bg-gray-100 text-gray-600 border-gray-200';

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
              <FiArrowLeft className="w-4 h-4" /> Back to Exchanges
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

  return (
    <>
      <Meta title={`Exchange #${exchange.id?.slice(-6) || ''} | Make Trend`} />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/groweachother/my-exchanges" className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 transition mb-4">
            <FiArrowLeft className="w-4 h-4" /> Back to Exchanges
          </Link>

          <div className="bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden">
            {/* ── Header ── */}
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Exchange #{exchange.id?.slice(-6) || 'N/A'}</h1>
                <p className="text-sm text-gray-500">Created {new Date(exchange.createdAt?.toDate?.() || exchange.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border ${
                isCompleted ? 'text-blue-600 bg-blue-50 border-blue-200' :
                isCancelled ? 'text-red-600 bg-red-50 border-red-200' :
                'text-purple-600 bg-purple-50 border-purple-200'
              }`}>
                {isCompleted ? <FiCheck className="w-4 h-4" /> : isCancelled ? <FiX className="w-4 h-4" /> : <FiClock className="w-4 h-4" />}
                {isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : 'Active'}
              </span>
            </div>

            {/* ── Two‑column cards ── */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ── Left: Your Task ── */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {user?.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <FiUser className="w-5 h-5 text-purple-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Your Task</p>
                    <p className="text-xs text-gray-500">You need help with this</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 mt-1">
                    <MyIcon className={`w-5 h-5 ${MyColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{myTask?.platform || 'Task'} – {myTask?.taskType || 'Action'}</p>
                    {myTask?.title && <p className="text-sm text-gray-500 truncate">{myTask.title}</p>}
                    {myTask?.url && (
                      <a href={myTask.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs text-blue-500 hover:underline">
                        <FiExternalLink className="w-3 h-3" /> Open
                      </a>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${MyStatusClass}`}>
                    <MyStatusIcon className="w-3 h-3" /> {STATUS_LABELS[myStatus] || myStatus}
                  </span>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  {myStatus === 'done' ? '✅ Completed by opponent' : '⏳ Waiting for opponent'}
                </div>
              </div>

              {/* ── Right: Their Task ── */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {otherUser?.avatar ? <img src={otherUser.avatar} alt="" className="w-full h-full object-cover" /> : <FiUser className="w-5 h-5 text-gray-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{otherUser?.fullname || otherUser?.username || 'User'}</p>
                    <p className="text-xs text-gray-500">Needs help with this</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 mt-1">
                    <OtherIcon className={`w-5 h-5 ${OtherColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{otherTask?.platform || 'Task'} – {otherTask?.taskType || 'Action'}</p>
                    {otherTask?.title && <p className="text-sm text-gray-500 truncate">{otherTask.title}</p>}
                    {otherTask?.url && (
                      <a href={otherTask.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs text-blue-500 hover:underline">
                        <FiExternalLink className="w-3 h-3" /> Open
                      </a>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${OtherStatusClass}`}>
                    <OtherStatusIcon className="w-3 h-3" /> {STATUS_LABELS[otherStatus] || otherStatus}
                  </span>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  {otherStatus === 'done' ? '✅ Completed by you' : '⏳ Waiting for you'}
                </div>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="p-5 bg-gray-50 border-t border-gray-200">
              {isCompleted ? (
                <div className="text-center py-2">
                  <p className="text-green-600 font-medium flex items-center justify-center gap-2"><FiCheck className="w-5 h-5" /> Exchange Completed!</p>
                  <p className="text-sm text-gray-500">Both sides have completed their tasks.</p>
                </div>
              ) : isCancelled ? (
                <div className="text-center py-2">
                  <p className="text-red-600 font-medium flex items-center justify-center gap-2"><FiX className="w-5 h-5" /> Exchange Cancelled</p>
                  <p className="text-sm text-gray-500">This exchange has been cancelled.</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
                  {canAct ? (
                    <>
                      <button
                        onClick={() => updateStatus('done')}
                        disabled={submitting}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition shadow-sm disabled:opacity-50"
                      >
                        {submitting ? <FiLoader className="w-5 h-5 animate-spin" /> : <FiCheckCircle className="w-5 h-5" />}
                        {submitting ? 'Updating...' : '✅ I Completed Their Task'}
                      </button>
                      <button
                        onClick={() => { if (confirm('Are you sure you want to cancel this exchange?')) updateStatus('cancel'); }}
                        disabled={submitting}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition shadow-sm disabled:opacity-50"
                      >
                        <FiXCircle className="w-5 h-5" /> Cancel Exchange
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-2 w-full">
                      {myStatus === 'done' ? (
                        <p className="text-green-600 font-medium flex items-center justify-center gap-2"><FiCheckCircle className="w-5 h-5" /> You've completed their task!</p>
                      ) : (
                        <p className="text-yellow-600 font-medium flex items-center justify-center gap-2"><FiClock className="w-5 h-5" /> Waiting for you to complete their task.</p>
                      )}
                      {myStatus === 'done' && otherStatus === 'waiting' && (
                        <p className="text-sm text-gray-500">Waiting for {otherUser?.fullname || otherUser?.username || 'the other user'} to complete yours.</p>
                      )}
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