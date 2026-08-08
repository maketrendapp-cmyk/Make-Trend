// pages/groweachother/grow-feed.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import { getToken } from '../../lib/api';
import {
  FiHeart,
  FiUser,
  FiCheckCircle,
  FiX,
  FiLoader,
  FiRefreshCw,
  FiPlus,
  FiExternalLink,
  FiCompass,
  FiRepeat,
  FiFilter,
  FiLogIn,
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
import { useGrowFeed, useAvailableTasks, useInvalidateQueries } from '../../lib/queries';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

// ── Platform definitions ──
const PLATFORMS = ['YouTube', 'Instagram', 'Twitter', 'Facebook', 'TikTok', 'Twitch', 'LinkedIn', 'GitHub'];
const TASK_TYPES_BY_PLATFORM = {
  YouTube: ['Subscribe', 'Like', 'Comment', 'Share', 'Watch', 'View'],
  Instagram: ['Follow', 'Like', 'Comment', 'Share', 'View'],
  Facebook: ['Like', 'Follow', 'Comment', 'Share', 'Watch'],
  Twitter: ['Follow', 'Like', 'Retweet', 'Reply'],
  TikTok: ['Follow', 'Like', 'Comment', 'Share'],
  Twitch: ['Follow', 'Subscribe', 'Like', 'Watch'],
  LinkedIn: ['Follow', 'Like', 'Comment', 'Share'],
  GitHub: ['Follow', 'Star', 'Watch'],
};
const DEFAULT_TASK_TYPES = ['Follow', 'Like', 'Comment', 'Share'];

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
  youtube: 'text-red-600 bg-red-50',
  instagram: 'text-pink-600 bg-pink-50',
  twitter: 'text-blue-400 bg-blue-50',
  facebook: 'text-blue-700 bg-blue-50',
  tiktok: 'text-black bg-gray-100',
  twitch: 'text-purple-600 bg-purple-50',
  linkedin: 'text-blue-600 bg-blue-50',
  github: 'text-gray-800 bg-gray-100',
};

export default function GrowFeed() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { invalidateGrowFeed } = useInvalidateQueries();

  // ── Filter state ──
  const [platformFilter, setPlatformFilter] = useState('');
  const [taskTypeFilter, setTaskTypeFilter] = useState('');
  const [availableTaskTypes, setAvailableTaskTypes] = useState(DEFAULT_TASK_TYPES);

  // ── React Query: Grow Feed (infinite) with filters ──
  const filters = {
    platform: platformFilter || undefined,
    taskType: taskTypeFilter || undefined,
  };
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    refetch,
    isError,
    error,
  } = useGrowFeed(filters, true); // always enabled, public

  // ── Flatten and filter tasks ──
  const allTasks = data?.pages?.flatMap((page) => page.tasks) || [];
  // If user is authenticated, hide tasks they have already exchanged.
  // For guests, hasExchange is always false, so no filtering needed.
  const tasks = isAuthenticated
    ? allTasks.filter(task => !task.hasExchange)
    : allTasks;

  const hasMore = hasNextPage;

  // ── Modal state (only for logged-in users) ──
  const [showModal, setShowModal] = useState(false);
  const [selectedTargetTask, setSelectedTargetTask] = useState(null);
  const [selectedMyTask, setSelectedMyTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // ── Available tasks for modal (only if authenticated) ──
  const {
    data: availableTasksData,
    refetch: refetchAvailable,
    isLoading: isLoadingAvailable,
  } = useAvailableTasks(isAuthenticated && !!user);
  const myTasks = availableTasksData || [];

  // ── Intersection Observer for infinite scroll ──
  const observerRef = useRef(null);

  useEffect(() => {
    if (isFetchingNextPage || !hasMore || tasks.length === 0) return;

    const lastElement = document.querySelector('#feed-end');
    if (!lastElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(lastElement);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isFetchingNextPage, hasMore, tasks.length, fetchNextPage]);

  // ── Handle platform filter change ──
  const handlePlatformChange = (e) => {
    const val = e.target.value;
    setPlatformFilter(val);
    setTaskTypeFilter('');
    if (val && PLATFORMS.includes(val)) {
      setAvailableTaskTypes(TASK_TYPES_BY_PLATFORM[val] || DEFAULT_TASK_TYPES);
    } else {
      setAvailableTaskTypes(DEFAULT_TASK_TYPES);
    }
  };

  const clearFilters = () => {
    setPlatformFilter('');
    setTaskTypeFilter('');
    setAvailableTaskTypes(DEFAULT_TASK_TYPES);
  };

  // ── Modal: open for exchange creation ──
  const handleHelpToGrow = async (task) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/groweachother/grow-feed');
      return;
    }
    setSelectedTargetTask(task);
    setSelectedMyTask(null);
    setModalError('');
    await refetchAvailable();
    setShowModal(true);
  };

  // ── Create exchange ──
  const handleCreateExchange = async () => {
    if (!selectedMyTask) {
      setModalError('Please select a task to exchange.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exchanges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetTaskId: selectedTargetTask.id,
          yourTaskId: selectedMyTask.id,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create exchange');
      }

      setShowModal(false);
      setSelectedTargetTask(null);
      setSelectedMyTask(null);
      invalidateGrowFeed();
      refetch();
    } catch (err) {
      console.error('Create exchange error:', err);
      setModalError(err.message || 'Failed to create exchange');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers ──
  const getPlatformIcon = (platform) => {
    const Icon = PLATFORM_ICONS[platform?.toLowerCase()] || FaLink;
    return Icon;
  };

  const getPlatformColor = (platform) => {
    return PLATFORM_COLORS[platform?.toLowerCase()] || 'text-purple-600 bg-purple-50';
  };

  const goToUserProfile = (uid) => {
    if (uid) {
      router.push(`/userinfo/${uid}`);
    }
  };

  // ── Render loading ──
  if (isLoading) {
    return (
      <>
        <Meta title="Grow Feed | Make Trend" />
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32" />
                      <div className="h-3 bg-gray-200 rounded w-20 mt-1" />
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-40" />
                  <div className="mt-4 h-10 bg-gray-200 rounded-xl w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <p className="text-red-600 font-medium">Failed to load feed.</p>
          <p className="text-sm text-red-500 mt-1">{error?.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm"
          >
            <FiRefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // Determine if we have any visible tasks after filtering.
  const hasVisibleTasks = tasks.length > 0;

  return (
    <>
      <Meta title="Grow Feed | Make Trend" description="Help others grow and get help in return." />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          {/* ── Top Navigation Bar ── */}
          <div className="flex items-center justify-between gap-2 mb-6 bg-white p-2.5 sm:p-3 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => router.push('/groweachother/my-tasks')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-medium text-xs sm:text-sm transition"
                  >
                    <FiPlus className="w-4 h-4" /> My Tasks
                  </button>
                  <button
                    onClick={() => router.push('/groweachother/my-exchanges')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium text-xs sm:text-sm transition"
                  >
                    <FiRepeat className="w-4 h-4" /> Exchanges
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push('/login?redirect=/groweachother/grow-feed')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium text-xs sm:text-sm transition"
                >
                  <FiLogIn className="w-4 h-4" /> Sign in to participate
                </button>
              )}
            </div>
            <button
              onClick={() => refetch({ refetchPage: (page, index) => index === 0 })}
              className="p-2 text-gray-400 hover:text-gray-600 transition rounded-xl hover:bg-gray-50"
              title="Refresh Feed"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiHeart className="text-purple-600 w-5 h-5" />
                Grow Feed
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Help others grow and receive mutual engagement</p>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <FiFilter className="text-purple-500 flex-shrink-0" />
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Filters</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-44">
                  <select
                    value={platformFilter}
                    onChange={handlePlatformChange}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-2 pr-8 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition cursor-pointer"
                  >
                    <option value="">All Platforms</option>
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>

                <div className="relative w-full sm:w-44">
                  <select
                    value={taskTypeFilter}
                    onChange={(e) => setTaskTypeFilter(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-2 pr-8 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition cursor-pointer"
                    disabled={!platformFilter && availableTaskTypes === DEFAULT_TASK_TYPES}
                  >
                    <option value="">All Tasks</option>
                    {availableTaskTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>

                {(platformFilter || taskTypeFilter) && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
                  >
                    <FiX className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Feed ── */}
          {!hasVisibleTasks && !isFetchingNextPage && (
            <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100 px-4">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">🌱</div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {isAuthenticated && allTasks.length > 0
                  ? 'All tasks exchanged!'
                  : 'No tasks available'}
              </h3>
              <p className="text-sm text-gray-400 mb-6 font-medium">
                {isAuthenticated && allTasks.length > 0
                  ? 'You have already exchanged all visible tasks. Check back later!'
                  : platformFilter || taskTypeFilter
                  ? 'Try adjusting your filters.'
                  : 'Check back later or create your own tasks!'}
              </p>
              {isAuthenticated && !platformFilter && !taskTypeFilter && allTasks.length === 0 && (
                <button
                  onClick={() => router.push('/groweachother/my-tasks')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium shadow-sm"
                >
                  <FiPlus className="w-4 h-4" />
                  Create Task
                </button>
              )}
            </div>
          )}

          <div className="space-y-4">
            {tasks.map((task) => {
              const Icon = getPlatformIcon(task.platform);
              const colorClass = getPlatformColor(task.platform);
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all"
                >
                  {/* Owner Header – clickable to profile */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => goToUserProfile(task.owner?.uid)}
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {task.owner?.avatar ? (
                          <img
                            src={task.owner.avatar}
                            alt={task.owner.fullname || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiUser className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm hover:text-purple-600 transition">
                          {task.owner?.fullname || task.owner?.username || 'Community Member'}
                        </p>
                        <p className="text-xs text-gray-400 font-medium">@{task.owner?.username || 'user'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider">
                      {task.platform || 'Social'}
                    </span>
                  </div>

                  {/* Task Card */}
                  <div className="bg-gray-50/70 border border-gray-200/60 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-200/50 shadow-sm ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                            {task.taskType || 'Support'}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">on {task.platform || 'Platform'}</span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 truncate">
                          {task.title || `${task.taskType} my ${task.platform} profile`}
                        </h4>
                      </div>
                    </div>

                    <a
                      href={task.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition shadow-sm flex-shrink-0"
                    >
                      <span>Visit Link</span>
                      <FiExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </a>
                  </div>

                  {/* Footer / Action */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400 font-medium">
                      Mutual community exchange
                    </span>

                    {task.isOwn ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-xl">
                        <FiUser className="w-3.5 h-3.5" /> Your Task
                      </span>
                    ) : task.hasExchange ? (
                      // This case shouldn't occur because we filtered them out, but keep for safety.
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold rounded-xl">
                        <FiCheckCircle className="w-3.5 h-3.5" /> Exchanged
                      </span>
                    ) : (
                      <button
                        onClick={() => handleHelpToGrow(task)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl hover:shadow-md transition shadow-sm active:scale-95"
                      >
                        <FiHeart className="w-3.5 h-3.5" />
                        Help To Grow
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Infinite scroll sentinel ── */}
          {hasMore && (
            <div id="feed-end" className="py-6 flex justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <FiLoader className="w-4 h-4 animate-spin text-purple-600" />
                  Loading more tasks...
                </div>
              ) : (
                <div className="h-4" />
              )}
            </div>
          )}

          {!hasMore && tasks.length > 0 && (
            <p className="text-center text-xs font-medium text-gray-400 py-6">
              You've reached the end of the feed 🎉
            </p>
          )}
        </div>
      </div>

      {/* ── Help To Grow Modal (only shown if authenticated) ── */}
      {showModal && isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Help To Grow</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedTargetTask(null);
                  setSelectedMyTask(null);
                  setModalError('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3.5 bg-purple-50/80 border border-purple-100 rounded-2xl">
              <p className="text-xs sm:text-sm text-purple-900 font-medium leading-relaxed">
                You're helping <strong>{selectedTargetTask?.owner?.fullname || selectedTargetTask?.owner?.username}</strong>
                {' '}with their <strong>{selectedTargetTask?.taskType}</strong> on{' '}
                <strong>{selectedTargetTask?.platform}</strong>.
              </p>
            </div>

            <p className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider mb-2.5">
              Select your task to return the favor:
            </p>

            {myTasks.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-gray-500 text-xs sm:text-sm font-medium mb-3">You don't have any active tasks available.</p>
                <button
                  onClick={() => {
                    setShowModal(false);
                    router.push('/groweachother/my-tasks');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-xs font-bold shadow-sm"
                >
                  <FiPlus className="w-4 h-4" />
                  Create Task First
                </button>
              </div>
            ) : (
              <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">
                {myTasks.map((task) => {
                  const Icon = getPlatformIcon(task.platform);
                  const colorClass = getPlatformColor(task.platform);
                  return (
                    <button
                      key={task.id}
                      onClick={() => setSelectedMyTask(task)}
                      className={`w-full text-left p-3 rounded-2xl border transition-all ${
                        selectedMyTask?.id === task.id
                          ? 'border-purple-500 bg-purple-50/60 shadow-sm'
                          : 'border-gray-200/80 hover:border-purple-200 hover:bg-purple-50/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-200/60 shadow-sm ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                            {task.platform} – {task.taskType}
                          </p>
                          {task.title && (
                            <p className="text-[11px] text-gray-500 truncate">{task.title}</p>
                          )}
                        </div>
                        {selectedMyTask?.id === task.id && (
                          <FiCheckCircle className="w-5 h-5 text-purple-600 ml-auto flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {modalError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                {modalError}
              </div>
            )}

            <button
              onClick={handleCreateExchange}
              disabled={!selectedMyTask || submitting || myTasks.length === 0}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                !selectedMyTask || submitting || myTasks.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-md active:scale-95'
              }`}
            >
              {submitting ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin" />
                  Creating Exchange...
                </>
              ) : (
                'Create Exchange'
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}