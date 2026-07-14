// pages/tasks.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';
import {
  FaYoutube,
  FaTwitter,
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaLink,
  FaCheckCircle,
  FaClock,
  FaExternalLinkAlt,
} from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function CampaignTasks() {
  const router = useRouter();
  const { id } = router.query;

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [completedIndices, setCompletedIndices] = useState([]);
  const [pendingIndex, setPendingIndex] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (id) fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/campaigns/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Campaign not found');
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch campaign');
      }
      const data = await res.json();
      if (data.success) {
        setCampaign(data.campaign);
        if (!data.campaign.tasks || data.campaign.tasks.length === 0) {
          router.push(`/share?id=${id}`);
        }
      } else {
        setError(data.error || 'Failed to load campaign');
      }
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError('Could not load campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cleanupTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startCountdown = (index) => {
    cleanupTimers();
    setPendingIndex(index);
    setCountdown(6);

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          completeTask(index);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeTask = (index) => {
    cleanupTimers();
    if (!completedIndices.includes(index)) {
      setCompletedIndices((prev) => [...prev, index]);
    }
    setPendingIndex(null);
    setCountdown(0);
  };

  const handleOpenTask = (index, url) => {
    if (completedIndices.includes(index)) return;
    if (pendingIndex === index) return;
    window.open(url, '_blank');
    startCountdown(index);
  };

  const handleContinueToShare = async () => {
    const allCompleted = completedIndices.length === campaign?.tasks?.length;
    if (!allCompleted) return;

    setIsSubmitting(true);
    try {
      await fetch(`${API_BASE}/campaigns/${id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'anonymous' }),
      });
    } catch (err) {
      console.error('Unlock error:', err);
    } finally {
      setIsSubmitting(false);
      router.push(`/share?id=${id}`);
    }
  };

  const getPlatformIcon = (url) => {
    if (!url) return <FaLink className="text-gray-400" />;
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return <FaYoutube className="text-red-600" />;
    if (lower.includes('twitter.com') || lower.includes('x.com')) return <FaTwitter className="text-blue-400" />;
    if (lower.includes('instagram.com')) return <FaInstagram className="text-pink-600" />;
    if (lower.includes('facebook.com') || lower.includes('fb.com')) return <FaFacebook className="text-blue-700" />;
    if (lower.includes('tiktok.com')) return <FaTiktok className="text-black" />;
    return <FaLink className="text-gray-400" />;
  };

  const tasks = campaign?.tasks || [];
  const allCompleted = tasks.length > 0 && completedIndices.length === tasks.length;
  const progress = tasks.length > 0 ? (completedIndices.length / tasks.length) * 100 : 0;

  // ── Skeleton Loader ──
  if (loading) {
    return (
      <>
        <Meta title="Loading Campaign" />
        <div className="min-h-screen bg-gray-50 py-4 px-4 sm:py-6">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="w-24 h-5 bg-gray-200 rounded mb-4" />
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-48 sm:h-56 bg-gray-200" />
              <div className="p-6">
                <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-64 bg-gray-200 rounded mb-3" />
                <div className="h-6 w-32 bg-gray-200 rounded-full mb-6" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-gray-100 rounded-xl">
                      <div className="w-10 h-10 bg-gray-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-5 w-3/4 bg-gray-200 rounded" />
                        <div className="h-3 w-1/2 bg-gray-200 rounded mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Error State ──
  if (error || !campaign) {
    return (
      <>
        <Meta title="Campaign Not Found" />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign not found</h2>
            <p className="text-gray-500">{error || 'The campaign you\'re looking for doesn\'t exist.'}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition"
            >
              Go Home
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Main Render ──
  return (
    <>
      <Meta title={`${campaign.title || 'Campaign'} - Tasks`} />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">

          {/* ── Back Button ── */}
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 mb-3 px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>

          {/* ── Hero Card ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6 transition-all hover:shadow-md">
            <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden bg-gray-200">
              {campaign.image ? (
                <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300 bg-gradient-to-br from-purple-50 to-indigo-50">
                  🎯
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200/60">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{campaign.title || 'Campaign'}</h1>
              {campaign.description && (
                <p className="text-gray-500 text-sm sm:text-base mt-1">{campaign.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {campaign.reward && (
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-medium border border-amber-200">
                    🎁 {campaign.reward}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-200">
                  📋 {completedIndices.length}/{tasks.length} tasks
                </span>
                {campaign.shareCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-medium">
                    📢 Share with {campaign.shareCount}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">{Math.round(progress)}%</span>
                  <span>complete</span>
                </span>
                <span>{completedIndices.length}/{tasks.length} tasks</span>
              </div>
            </div>
          </div>

          {/* ── Tasks List ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-7 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>📋</span> Complete Tasks To Claim
              </h2>
              <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {completedIndices.length}/{tasks.length}
              </span>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No tasks to complete.</div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task, index) => {
                  const isCompleted = completedIndices.includes(index);
                  const isPending = pendingIndex === index;

                  return (
                    <div
                      key={index}
                      className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                        isCompleted
                          ? 'bg-green-50/80 border-green-200'
                          : isPending
                          ? 'bg-amber-50/80 border-amber-300 shadow-sm shadow-amber-100/50'
                          : 'bg-gray-50/80 border-gray-200 hover:bg-gray-100/60'
                      }`}
                    >
                      <div className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-lg bg-white shadow-sm border border-gray-200">
                        {isCompleted ? (
                          <FaCheckCircle className="text-green-500 text-xl" />
                        ) : isPending ? (
                          <FaClock className="text-amber-500 text-xl animate-pulse" />
                        ) : (
                          getPlatformIcon(task.url)
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`font-medium transition-all duration-300 ${
                              isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}
                          >
                            {task.text}
                          </p>
                          {isPending && (
                            <span className="text-[10px] font-medium bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full animate-pulse">
                              ⏳ Verifying {countdown}s
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[10px] font-medium bg-green-200 text-green-700 px-2 py-0.5 rounded-full">
                              ✅ Done
                            </span>
                          )}
                        </div>
                        {task.url && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {task.url.replace(/^https?:\/\//, '')}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-3 py-1.5 rounded-full">
                            Completed
                          </span>
                        ) : isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full border-2 border-amber-500 flex items-center justify-center text-sm font-bold text-amber-600 bg-white animate-pulse">
                              {countdown}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenTask(index, task.url)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.97]"
                          >
                            <FaExternalLinkAlt className="w-3 h-3" />
                            Open Task
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Claim Button (always visible, locked until all tasks completed) ── */}
            <div className="mt-8">
              <button
                onClick={handleContinueToShare}
                disabled={!allCompleted || isSubmitting}
                className={`w-full inline-flex items-center justify-center px-6 py-3.5 font-semibold rounded-2xl transition-all duration-300 shadow-sm ${
                  allCompleted && !isSubmitting
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-md hover:scale-[1.01] active:scale-[0.98]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  '🎁 Claim'
                )}
              </button>

              {/* Helper text when not all tasks are completed */}
              {!allCompleted && tasks.length > 0 && (
                <p className="mt-2 text-center text-xs text-gray-400">
                  Complete all {tasks.length} tasks to claim your reward
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}