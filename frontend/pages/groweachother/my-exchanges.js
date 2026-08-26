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
  FiFilter,
  FiX,
  FiChevronDown,
  FiCheck,
} from 'react-icons/fi';
import { useMyExchanges, useInvalidateQueries } from '../../lib/queries';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

// ─── STATUS CONFIG ───
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

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: '🔄 Active' },
  { value: 'completed', label: '🎉 Completed' },
  { value: 'cancelled', label: '❌ Cancelled' },
];

// ─── CUSTOM SELECT COMPONENT ──────────────────────────────────
const CustomSelect = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200 hover:border-purple-300"
      >
        <span className="truncate">{selectedLabel}</span>
        <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors duration-150 ${
                  isSelected
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate pr-2">{option.label}</span>
                {isSelected && <FiCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
// ─── END CUSTOM SELECT ────────────────────────────────────────

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

  // ── Clear filters ──
  const clearFilters = () => {
    setStatusFilter('');
  };

  const hasActiveFilters = statusFilter !== '';

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
          </div>

          {/* ── Filters ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <FiFilter className="text-purple-500 flex-shrink-0" />
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Filters</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="w-full sm:w-48">
                  <CustomSelect
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={STATUS_OPTIONS}
                    placeholder="All Statuses"
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
                  >
                    <FiX className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Active Filter Chips ── */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-gray-500 font-medium">Active filters:</span>
              {statusFilter && (
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full border border-purple-100">
                  Status: {STATUS_OPTIONS.find(opt => opt.value === statusFilter)?.label || statusFilter}
                  <button
                    onClick={() => setStatusFilter('')}
                    className="hover:text-red-500 transition"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Clear all
              </button>
            </div>
          )}

          {isError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error?.message || 'Failed to load exchanges'}
            </div>
          )}

          {/* ── Exchanges List ── */}
          {exchanges.length === 0 && !isFetchingNextPage && (
            <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100 px-4">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">🤝</div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {hasActiveFilters ? 'No matching exchanges' : 'No exchanges yet'}
              </h3>
              <p className="text-sm text-gray-400 mb-6 font-medium">
                {hasActiveFilters
                  ? 'Try adjusting your filter.'
                  : 'Go to the Grow Feed to help someone and start exchanging!'}
              </p>
              {!hasActiveFilters && (
                <button
                  onClick={() => router.push('/groweachother/grow-feed')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium shadow-sm"
                >
                  View Grow Feed
                </button>
              )}
            </div>
          )}

          <div className="space-y-3">
            {exchanges.map((exchange) => {
              // ── Safety: skip if exchange.id is missing ──
              if (!exchange?.id) {
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