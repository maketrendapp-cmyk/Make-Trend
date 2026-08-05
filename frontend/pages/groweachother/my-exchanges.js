// pages/groweachother/my-exchanges.js
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import {
  FiUsers,
  FiRefreshCw,
  FiLoader,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUser,
  FiCompass,
  FiPlus,
  FiRepeat,
} from 'react-icons/fi';
import { useMyExchanges, useInvalidateQueries } from '../../lib/queries';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

const STATUS_COLORS = {
  waiting: 'text-yellow-700 bg-yellow-50 border-yellow-200/60',
  done: 'text-emerald-700 bg-emerald-50 border-emerald-200/60',
  cancelled: 'text-red-700 bg-red-50 border-red-200/60',
  completed: 'text-blue-700 bg-blue-50 border-blue-200/60',
  active: 'text-purple-700 bg-purple-50 border-purple-200/60',
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
  const { invalidateMyExchanges } = useInvalidateQueries();

  // ── Status filter state ──
  const [statusFilter, setStatusFilter] = useState('');

  // ── React Query: My Exchanges (infinite) ──
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    refetch,
    isError,
    error,
  } = useMyExchanges(statusFilter, isAuthenticated && !!user);

  // ── Flatten exchanges from all pages ──
  const exchanges = data?.pages?.flatMap((page) => page.exchanges) || [];
  const hasMore = hasNextPage;

  // ── Intersection Observer for infinite scroll ──
  const observerRef = useRef(null);

  useEffect(() => {
    if (isFetchingNextPage || !hasMore || exchanges.length === 0) return;

    const lastElement = document.querySelector('#exchange-end');
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
  }, [isFetchingNextPage, hasMore, exchanges.length, fetchNextPage]);

  // ── Helper to get user display name ──
  const getUserDisplay = (exchange, uid) => {
    if (exchange.userA?.uid === uid) {
      return exchange.userB;
    }
    return exchange.userA;
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
          <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiUsers className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">My Exchanges</h2>
            <p className="text-gray-500 mt-1.5 text-sm">Sign in to view your exchanges.</p>
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
        <Meta title="My Exchanges | Make Trend" />
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="flex items-center justify-between mb-6">
              <div className="h-7 w-40 bg-gray-200 rounded-lg" />
              <div className="h-10 w-28 bg-gray-200 rounded-xl" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-24 mt-1.5" />
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

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <p className="text-red-600 font-medium">Failed to load exchanges.</p>
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
      <Meta title="My Exchanges | Make Trend" description="Track your Grow Together exchanges." />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          
          {/* ── Top Navigation Links Bar ── */}
          <div className="flex items-center justify-between gap-2 mb-6 bg-white p-2.5 sm:p-3 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <div className="flex items-center gap-2">
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
              <button
                onClick={() => router.push('/groweachother/my-exchanges')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl font-medium text-xs sm:text-sm transition whitespace-nowrap shadow-sm"
              >
                <FiRepeat className="w-4 h-4" /> Exchanges
              </button>
            </div>
            <button
              onClick={() => {
                refetch({ refetchPage: (page, index) => index === 0 });
              }}
              className="p-2 text-gray-400 hover:text-gray-600 transition rounded-xl hover:bg-gray-50"
              title="Refresh"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiUsers className="text-purple-600 w-5 h-5" />
                My Exchanges
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Track your mutual community exchanges</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 font-medium focus:border-purple-500 focus:bg-white focus:outline-none transition cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {isError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error?.message || 'Failed to load exchanges'}
            </div>
          )}

          {/* ── Exchanges List ── */}
          {exchanges.length === 0 && !isFetchingNextPage && (
            <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100 px-4">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">🤝</div>
              <h3 className="text-base font-bold text-gray-900 mb-1">No exchanges yet</h3>
              <p className="text-sm text-gray-400 mb-6 font-medium">Go to the Grow Feed to help someone and start exchanging!</p>
              <button
                onClick={() => router.push('/groweachother/grow-feed')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium shadow-sm"
              >
                View Grow Feed
              </button>
            </div>
          )}

          <div className="space-y-3">
            {exchanges.map((exchange) => {
              // ── ✅ Safety: if exchange.id is missing, skip this item ──
              if (!exchange?.id) {
                // You can optionally log a warning for debugging
                console.warn('Skipping exchange without id:', exchange);
                return null;
              }

              const otherUser = getUserDisplay(exchange, user?.uid);
              const userStatus = getUserStatus(exchange, user?.uid);
              const otherTask = getOtherTask(exchange, user?.uid);

              return (
                <Link
                  key={exchange.id}
                  href={`/groweachother/exchange/${exchange.id}`}
                  className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100/60 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                      {otherUser?.avatar ? (
                        <img src={otherUser.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FiUser className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm sm:text-base truncate">
                        {otherUser?.fullname || otherUser?.username || 'Community Member'}
                      </p>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                        <span className="font-semibold text-purple-700">{otherTask?.platform || 'Task'}</span>
                        <span className="text-gray-300">•</span>
                        <span>{otherTask?.taskType || 'Action'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg border ${STATUS_COLORS[userStatus] || STATUS_COLORS.waiting}`}
                      >
                        {STATUS_LABELS[userStatus] || userStatus}
                      </span>
                      <FiChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Infinite scroll sentinel ── */}
          {hasMore && (
            <div id="exchange-end" className="py-6 flex justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <FiLoader className="w-4 h-4 animate-spin text-purple-600" />
                  Loading more...
                </div>
              ) : (
                <div className="h-4" />
              )}
            </div>
          )}

          {!hasMore && exchanges.length > 0 && (
            <p className="text-center text-xs font-medium text-gray-400 py-6">
              You've seen all exchanges 🎉
            </p>
          )}
        </div>
      </div>
    </>
  );
}