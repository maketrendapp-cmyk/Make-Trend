// pages/my-exchanges.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { Meta } from '../components/Meta';
import { getToken } from '../lib/api';
import {
  FiUsers,
  FiRefreshCw,
  FiLoader,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUser,
} from 'react-icons/fi';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

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

export default function MyExchanges() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [exchanges, setExchanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastId, setLastId] = useState(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadingRef = useRef(false);
  const observerRef = useRef(null);

  // ── Fetch exchanges ──
  const fetchExchanges = useCallback(async (reset = false) => {
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

      let url = `${API_BASE}/exchanges?limit=20`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (!reset && lastId) url += `&lastId=${lastId}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Failed to load exchanges');

      if (reset) {
        setExchanges(data.exchanges || []);
      } else {
        setExchanges((prev) => [...prev, ...(data.exchanges || [])]);
      }

      setHasMore(data.hasMore || false);
      if (data.exchanges && data.exchanges.length > 0) {
        setLastId(data.lastId);
      }
      setError('');
    } catch (err) {
      console.error('Fetch exchanges error:', err);
      setError(err.message || 'Failed to load exchanges');
    } finally {
      setInitialLoading(false);
      setLoading(false);
      loadingRef.current = false;
    }
  }, [lastId, hasMore, statusFilter]);

  // ── Initial load ──
  useEffect => {
    if (isAuthenticated && user) {
      setLastId(null);
      setHasMore(true);
      fetchExchanges(true);
    } else {
      setInitialLoading(false);
    }
  }, [isAuthenticated, user, statusFilter]);

  // ── Intersection Observer ──
  useEffect(() => {
    if (loading || !hasMore || exchanges.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          fetchExchanges(false);
        }
      },
      { threshold: 0.1 }
    );

    const lastElement = document.querySelector('#exchange-end');
    if (lastElement) observer.observe(lastElement);

    return () => {
      if (lastElement) observer.unobserve(lastElement);
    };
  }, [loading, hasMore, exchanges.length]);

  // ── Get user display name ──
  const getUserDisplay = (exchange, uid) => {
    if (exchange.userA?.uid === uid) {
      return exchange.userB;
    }
    return exchange.userA;
  };

  // ── Get user's task in exchange ──
  const getUserTask = (exchange, uid) => {
    if (exchange.userA?.uid === uid) {
      return exchange.userATask;
    }
    return exchange.userBTask;
  };

  // ── Get other user's task in exchange ──
  const getOtherTask = (exchange, uid) => {
    if (exchange.userA?.uid === uid) {
      return exchange.userBTask;
    }
    return exchange.userATask;
  };

  // ── Get user's status ──
  const getUserStatus = (exchange, uid) => {
    if (exchange.userA?.uid === uid) {
      return exchange.userAStatus;
    }
    return exchange.userBStatus;
  };

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="My Exchanges | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiUsers className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">My Exchanges</h2>
            <p className="text-gray-500 mt-2 text-sm">Sign in to view your exchanges.</p>
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
        <Meta title="My Exchanges | Make Trend" />
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="flex items-center justify-between mb-6">
              <div className="h-8 w-40 bg-gray-200 rounded" />
              <div className="h-10 w-28 bg-gray-200 rounded-xl" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-24 mt-1" />
                  </div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Meta title="My Exchanges | Make Trend" description="Track your Grow Together exchanges." />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiUsers className="text-purple-600" />
                My Exchanges
              </h1>
              <p className="text-sm text-gray-500">Track your exchanges with others</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm rounded-xl border border-gray-300 px-3 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition bg-white"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                onClick={() => {
                  setLastId(null);
                  setHasMore(true);
                  fetchExchanges(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-purple-600 hover:text-purple-800 transition-colors"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* ── Exchanges List ── */}
          {exchanges.length === 0 && !loading && (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="text-5xl mb-3">🤝</div>
              <p className="text-gray-500 font-medium">No exchanges yet.</p>
              <p className="text-sm text-gray-400">Go to the Grow Feed to help someone!</p>
              <button
                onClick={() => router.push('/grow-feed')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm"
              >
                View Grow Feed
              </button>
            </div>
          )}

          <div className="space-y-3">
            {exchanges.map((exchange) => {
              const otherUser = getUserDisplay(exchange, user?.uid);
              const userStatus = getUserStatus(exchange, user?.uid);
              const otherTask = getOtherTask(exchange, user?.uid);

              return (
                <Link
                  key={exchange.id}
                  href={`/exchange/${exchange.id}`}
                  className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {otherUser?.avatar ? (
                        <img src={otherUser.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FiUser className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {otherUser?.fullname || otherUser?.username || 'User'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{otherTask?.platform || 'Task'}</span>
                        <span className="text-gray-300">•</span>
                        <span>{otherTask?.taskType || 'Action'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${STATUS_COLORS[userStatus] || STATUS_COLORS.waiting}`}
                      >
                        {STATUS_LABELS[userStatus] || userStatus}
                      </span>
                      <FiChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Infinite scroll sentinel ── */}
          {hasMore && (
            <div id="exchange-end" className="py-4 flex justify-center">
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

          {!hasMore && exchanges.length > 0 && (
            <p className="text-center text-sm text-gray-400 py-4">
              You've seen all exchanges 🎉
            </p>
          )}
        </div>
      </div>
    </>
  );
}