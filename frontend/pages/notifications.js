// pages/notifications.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';
import { useAuth } from '../components/AuthScreen';
import { useNotifications, useMarkNotificationRead, useInvalidateQueries } from '../lib/queries';
import {
  FiBell,
  FiUser,
  FiMessageCircle,
  FiGlobe,
  FiCheckCircle,
  FiCircle,
  FiClock,
  FiArrowLeft,
  FiRefreshCw,
  FiExternalLink,
  FiLoader,
  FiAlertCircle,
} from 'react-icons/fi';
import { FaRocket } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import toast from 'react-hot-toast';

const ITEMS_PER_PAGE = 20;

export default function Notifications() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { invalidateNotifications } = useInvalidateQueries();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications(isAuthenticated);

  const markReadMutation = useMarkNotificationRead();

  const [processingId, setProcessingId] = useState(null);

  // ── Mark as read ──
  const handleMarkRead = async (notificationId) => {
    if (processingId) return;
    setProcessingId(notificationId);
    try {
      await markReadMutation.mutateAsync(notificationId);
      // Optimistically update the local cache? We'll just refetch.
      await refetch();
    } catch (err) {
      toast.error('Failed to mark as read');
    } finally {
      setProcessingId(null);
    }
  };

  // ── Format date ──
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
      if (isNaN(date.getTime())) return 'Just now';
      // Relative time
      const now = new Date();
      const diff = Math.floor((now - date) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Just now';
    }
  };

  const allNotifications = data?.pages?.flatMap((page) => page.notifications) || [];
  const hasMore = hasNextPage;

  // ── Skeleton ──
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600 font-medium">Failed to load notifications.</p>
          <button onClick={() => refetch()} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
            <FiRefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Not authenticated ──
  if (!isAuthenticated) {
    return (
      <>
        <Meta title="Notifications | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-8 text-center border border-slate-100">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600">
              <FiBell className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Sign In Required</h2>
            <p className="text-slate-500 text-sm mb-6">Please sign in to view your notifications.</p>
            <button
              onClick={() => router.push('/login?redirect=/notifications')}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Meta title="Notifications | Make Trend" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/profile" className="text-slate-400 hover:text-slate-600 transition">
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FiBell className="text-purple-600" />
              Notifications
            </h1>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* ── Notification List ── */}
        {allNotifications.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="text-lg font-semibold text-slate-900">No notifications</h3>
            <p className="text-slate-500 text-sm">You're all caught up! Check back later.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allNotifications.map((notification) => {
              const isPersonal = notification.type === 'personal';
              const isRead = notification.read || false;
              const sender = notification.sender || {};

              // ── Determine icon / avatar ──
              let avatarContent;
              if (isPersonal) {
                avatarContent = sender.avatar ? (
                  <Image
                    src={sender.avatar}
                    alt={sender.fullname || sender.username || 'User'}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-bold">
                    {(sender.fullname || sender.username || 'U')[0].toUpperCase()}
                  </div>
                );
              } else {
                avatarContent = (
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <FiGlobe className="w-5 h-5" />
                  </div>
                );
              }

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl border transition-shadow hover:shadow-md ${
                    isRead ? 'border-slate-200' : 'border-purple-200 bg-purple-50/30'
                  }`}
                >
                  <div className="p-4 flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">{avatarContent}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {notification.title || (isPersonal ? 'Personal Message' : 'System Notification')}
                          </p>
                          <p className="text-sm text-slate-600 mt-0.5">{notification.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!isRead && (
                            <button
                              onClick={() => handleMarkRead(notification.id)}
                              disabled={processingId === notification.id}
                              className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 rounded-lg border border-purple-200 hover:bg-purple-50 transition disabled:opacity-50"
                            >
                              {processingId === notification.id ? (
                                <FiLoader className="w-3 h-3 animate-spin" />
                              ) : (
                                'Mark read'
                              )}
                            </button>
                          )}
                          {isRead && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <FiCheckCircle className="w-3 h-3" /> Read
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Timestamp and action */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {formatDate(notification.createdAt)}
                        </span>
                        {notification.redirectUrl && (
                          <button
                            onClick={() => window.open(notification.redirectUrl, '_blank')}
                            className="inline-flex items-center gap-1 text-purple-600 hover:underline font-medium"
                          >
                            <FiExternalLink className="w-3 h-3" /> Open
                          </button>
                        )}
                        {!notification.redirectUrl && isPersonal && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <FiUser className="w-3 h-3" /> From {sender.fullname || sender.username || 'User'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── Load more ── */}
        {hasMore && (
          <div className="py-6 flex justify-center">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-slate-400">
                <FiLoader className="w-5 h-5 animate-spin text-purple-600" />
                Loading more...
              </div>
            ) : (
              <button
                onClick={() => fetchNextPage()}
                className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium"
              >
                Load more
              </button>
            )}
          </div>
        )}

        {!hasMore && allNotifications.length > 0 && (
          <p className="text-center text-xs text-slate-400 py-4">End of notifications</p>
        )}
      </div>
    </>
  );
}