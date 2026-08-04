// pages/groweachother/grow-feed.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

export default function GrowFeed() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastId, setLastId] = useState(null);
  const [error, setError] = useState('');

  // ── Modal state ──
  const [showModal, setShowModal] = useState(false);
  const [selectedTargetTask, setSelectedTargetTask] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [selectedMyTask, setSelectedMyTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadingRef = useRef(false);

  // ── Fetch feed ──
  const fetchFeed = useCallback(async (reset = false) => {
    if (loadingRef.current) return;
    if (!reset && !hasMore) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        setInitialLoading(false);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      const url = reset
        ? `${API_BASE}/grow-feed?limit=20`
        : `${API_BASE}/grow-feed?limit=20&lastTaskId=${lastId}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Failed to load feed');

      if (reset) {
        setTasks(data.tasks || []);
      } else {
        setTasks((prev) => [...prev, ...(data.tasks || [])]);
      }

      setHasMore(data.hasMore || false);
      if (data.tasks && data.tasks.length > 0) {
        setLastId(data.lastId);
      }
      setError('');
    } catch (err) {
      console.error('Fetch feed error:', err);
      setError(err.message || 'Failed to load feed');
    } finally {
      setInitialLoading(false);
      setLoading(false);
      loadingRef.current = false;
    }
  }, [lastId, hasMore]);

  // ── Load my tasks for modal ──
  const loadMyTasks = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/social-tasks/available`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMyTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Load my tasks error:', err);
    }
  };

  // ── Open modal ──
  const handleHelpToGrow = async (task) => {
    setSelectedTargetTask(task);
    setSelectedMyTask(null);
    setModalError('');
    await loadMyTasks();
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
      if (!token) {
        setModalError('Not authenticated');
        setSubmitting(false);
        return;
      }

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
      // Refresh feed
      setLastId(null);
      setHasMore(true);
      await fetchFeed(true);
    } catch (err) {
      console.error('Create exchange error:', err);
      setModalError(err.message || 'Failed to create exchange');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Initial load ──
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchFeed(true);
    } else {
      setInitialLoading(false);
    }
  }, [isAuthenticated, user]);

  // ── Intersection Observer for infinite scroll ──
  useEffect(() => {
    if (loading || !hasMore || tasks.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          fetchFeed(false);
        }
      },
      { threshold: 0.1 }
    );

    const lastElement = document.querySelector('#feed-end');
    if (lastElement) observer.observe(lastElement);

    return () => {
      if (lastElement) observer.unobserve(lastElement);
    };
  }, [loading, hasMore, tasks.length]);

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
        <Meta title="Grow Feed | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiHeart className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Grow Together</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Sign in to see tasks from others and start growing together.
            </p>
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

  if (initialLoading) {
    return (
      <>
        <Meta title="Grow Feed | Make Trend" />
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="animate-pulse space-y-4">
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
                  <div className="h-3 bg-gray-200 rounded w-24 mt-2" />
                  <div className="mt-4 h-10 bg-gray-200 rounded-xl w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Meta title="Grow Feed | Make Trend" description="Help others grow and get help in return." />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiHeart className="text-purple-600" />
                Grow Feed
              </h1>
              <p className="text-sm text-gray-500">Help others grow and get help in return</p>
            </div>
            <button
              onClick={() => {
                setLastId(null);
                setHasMore(true);
                fetchFeed(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-purple-600 hover:text-purple-800 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* ── Feed ── */}
          {tasks.length === 0 && !loading && (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="text-5xl mb-3">🌱</div>
              <p className="text-gray-500 font-medium">No tasks available right now.</p>
              <p className="text-sm text-gray-400">Check back later or create your own tasks!</p>
              <button
                onClick={() => router.push('/groweachother/my-tasks')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm"
              >
                <FiPlus className="w-4 h-4" />
                Create Task
              </button>
            </div>
          )}

          <div className="space-y-4">
            {tasks.map((task) => {
              const Icon = getPlatformIcon(task.platform);
              const color = getPlatformColor(task.platform);
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {task.owner?.avatar ? (
                          <img src={task.owner.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FiUser className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {task.owner?.fullname || task.owner?.username || 'User'}
                        </p>
                        <p className="text-xs text-gray-400">@{task.owner?.username || 'unknown'}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                      {task.platform || 'Social'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <span className="text-sm font-medium text-gray-700">
                      {task.taskType || 'Follow'}
                    </span>
                    <span className="text-xs text-gray-400 truncate flex-1">
                      {task.url ? (
                        <a
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {task.url.replace(/^https?:\/\//, '')}
                        </a>
                      ) : (
                        'No URL'
                      )}
                    </span>
                  </div>

                  {task.title && (
                    <p className="mt-2 text-sm text-gray-500">{task.title}</p>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => handleHelpToGrow(task)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition shadow-sm"
                    >
                      <FiHeart className="w-4 h-4" />
                      Help To Grow
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Infinite scroll sentinel ── */}
          {hasMore && (
            <div id="feed-end" className="py-4 flex justify-center">
              {loading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Loading more...
                </div>
              ) : (
                <div className="h-4" />
              )}
            </div>
          )}

          {!hasMore && tasks.length > 0 && (
            <p className="text-center text-sm text-gray-400 py-4">
              You've seen all tasks 🎉
            </p>
          )}
        </div>
      </div>

      {/* ── Help To Grow Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Help To Grow</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedTargetTask(null);
                  setSelectedMyTask(null);
                  setModalError('');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-purple-50 rounded-xl">
              <p className="text-sm text-gray-700">
                You're helping <strong>{selectedTargetTask?.owner?.fullname || selectedTargetTask?.owner?.username}</strong>
                {' '}with their <strong>{selectedTargetTask?.taskType}</strong> on{' '}
                <strong>{selectedTargetTask?.platform}</strong>.
              </p>
            </div>

            <p className="text-sm font-medium text-gray-700 mb-3">
              What do you want them to help you with?
            </p>

            {myTasks.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm">You don't have any active tasks.</p>
                <button
                  onClick={() => {
                    setShowModal(false);
                    router.push('/groweachother/my-tasks');
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm"
                >
                  <FiPlus className="w-4 h-4" />
                  Create Task
                </button>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {myTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedMyTask(task)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      selectedMyTask?.id === task.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        {React.createElement(getPlatformIcon(task.platform), {
                          className: `w-4 h-4 ${getPlatformColor(task.platform)}`,
                        })}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {task.platform} – {task.taskType}
                        </p>
                        {task.title && (
                          <p className="text-xs text-gray-500">{task.title}</p>
                        )}
                      </div>
                      {selectedMyTask?.id === task.id && (
                        <FiCheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {modalError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {modalError}
              </div>
            )}

            <button
              onClick={handleCreateExchange}
              disabled={!selectedMyTask || submitting || myTasks.length === 0}
              className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                !selectedMyTask || submitting || myTasks.length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg'
              }`}
            >
              {submitting ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Creating...
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