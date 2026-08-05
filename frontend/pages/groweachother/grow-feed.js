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

  // ── React Query: Grow Feed (infinite) ──
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    refetch,
    isError,
    error,
  } = useGrowFeed(isAuthenticated && !!user);

  // ── Flatten tasks from all pages ──
  const tasks = data?.pages?.flatMap((page) => page.tasks) || [];
  const hasMore = hasNextPage;

  // ── Modal state ──
  const [showModal, setShowModal] = useState(false);
  const [selectedTargetTask, setSelectedTargetTask] = useState(null);
  const [selectedMyTask, setSelectedMyTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // ── Available tasks (for modal) ──
  const {
    data: availableTasksData,
    refetch: refetchAvailable,
    isLoading: isLoadingAvailable,
  } = useAvailableTasks(isAuthenticated && !!user);
  const myTasks = availableTasksData || [];

  // ── Intersection Observer for infinite scroll ──
  const loadingRef = useRef(false);
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

  // ── Open modal ──
  const handleHelpToGrow = async (task) => {
    setSelectedTargetTask(task);
    setSelectedMyTask(null);
    setModalError('');
    await refetchAvailable(); // fresh list of tasks
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
      const token = await getToken(); // We need getToken here – but it's not imported.
      // Actually, we must import getToken from '../../lib/api' for this request.
      // We'll import it at the top.
      // We'll add import { getToken } from '../../lib/api'; at the top.
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
      // Invalidate grow feed cache to refresh the list
      invalidateGrowFeed();
      // Also refetch to update immediately
      refetch();
    } catch (err) {
      console.error('Create exchange error:', err);
      setModalError(err.message || 'Failed to create exchange');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helper: get platform icon and color ──
  const getPlatformIcon = (platform) => {
    const Icon = PLATFORM_ICONS[platform?.toLowerCase()] || FaLink;
    return Icon;
  };

  const getPlatformColor = (platform) => {
    return PLATFORM_COLORS[platform?.toLowerCase()] || 'text-purple-600 bg-purple-50';
  };

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="Grow Feed | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600">
              <FiHeart className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Grow Together Feed</h2>
            <p className="text-gray-500 mt-1.5 text-sm">
              Sign in to see tasks from others and start growing together.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium text-sm rounded-xl hover:bg-purple-700 transition w-full shadow-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

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

  return (
    <>
      <Meta title="Grow Feed | Make Trend" description="Help others grow and get help in return." />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          {/* ── Top Navigation Bar ── */}
          <div className="flex items-center justify-between gap-2 mb-6 bg-white p-2.5 sm:p-3 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
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
            </div>
            <button
              onClick={() => {
                // Force refetch the first page only
                refetch({ refetchPage: (page, index) => index === 0 });
              }}
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

          {isError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error?.message || 'Failed to load feed'}
            </div>
          )}

          {/* ── Feed ── */}
          {tasks.length === 0 && !isFetchingNextPage && (
            <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100 px-4">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">🌱</div>
              <h3 className="text-base font-bold text-gray-900 mb-1">No tasks available</h3>
              <p className="text-sm text-gray-400 mb-6 font-medium">Check back later or create your own tasks!</p>
              <button
                onClick={() => router.push('/groweachother/my-tasks')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium shadow-sm"
              >
                <FiPlus className="w-4 h-4" />
                Create Task
              </button>
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
                  {/* Owner Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
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
                        <p className="font-bold text-gray-900 text-sm">
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

      {/* ── Help To Grow Modal ── */}
      {showModal && (
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