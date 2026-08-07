// pages/notifications.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import Meta from '../components/Meta';
import { useAuth } from '../components/AuthScreen';
import {
  useNotifications,
  useSystemNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useMarkSystemNotificationsRead,
  useInvalidateQueries,
} from '../lib/queries';
import {
  FiBell,
  FiUser,
  FiGlobe,
  FiClock,
  FiArrowLeft,
  FiRefreshCw,
  FiLoader,
  FiCheckCircle,
  FiCircle,
  FiExternalLink,
  FiMessageCircle,
  FiMail,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Notifications() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateNotifications, invalidateSystemNotifications } = useInvalidateQueries();

  // ── Personal notifications ──
  const {
    data,
    isLoading: personalLoading,
    isError: personalError,
    refetch: refetchPersonal,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications(isAuthenticated);

  // ── System notifications ──
  const {
    data: systemData,
    isLoading: systemLoading,
    isError: systemError,
    refetch: refetchSystem,
  } = useSystemNotifications(isAuthenticated);

  // ── Mutations ──
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const markSystemReadMutation = useMarkSystemNotificationsRead();

  const [processingId, setProcessingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Infinite scroll observer for personal notifications ──
  const observerRef = useRef(null);
  const lastElementRef = useCallback(
    (node) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  // ── Flatten personal notifications ──
  const personalNotifications = data?.pages?.flatMap((page) => page.notifications) || [];

  // ── Mark individual as read ──
  const handleMarkRead = async (id) => {
    if (processingId) return;
    setProcessingId(id);
    try {
      await markReadMutation.mutateAsync(id);
      // Optimistic update: we could also update the cache directly, but invalidate is simpler
      await refetchPersonal();
    } catch (err) {
      toast.error('Failed to mark as read');
    } finally {
      setProcessingId(null);
    }
  };

  // ── Mark all personal as read ──
  const handleMarkAllRead = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await markAllReadMutation.mutateAsync();
      await refetchPersonal();
    } catch (err) {
      toast.error('Failed to mark all as read');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Mark all system as read ──
  const handleMarkSystemRead = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await markSystemReadMutation.mutateAsync();
      await refetchSystem();
    } finally {
      setActionLoading(false);
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

  // ── Skeleton loader ──
  if ((personalLoading || systemLoading) && !personalNotifications.length && !systemData?.notifications?.length) {
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

  // ── Error state ──
  if (personalError || systemError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600 font-medium">Failed to load notifications.</p>
          <button
            onClick={() => { refetchPersonal(); refetchSystem(); }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
          >
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

  const unreadSystemCount = systemData?.unreadCount || 0;

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
            onClick={() => { refetchPersonal(); refetchSystem(); }}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* ── System Notifications Section ── */}
        {systemData && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <FiGlobe className="text-purple-600" /> System Updates
                {unreadSystemCount > 0 && (
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                    {unreadSystemCount} new
                  </span>
                )}
              </h2>
              {unreadSystemCount > 0 && (
                <button
                  onClick={handleMarkSystemRead}
                  disabled={actionLoading}
                  className="text-xs font-medium text-purple-600 hover:text-purple-800 transition px-3 py-1 rounded-lg border border-purple-200 hover:bg-purple-50 disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>

            {systemData.notifications.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-4 text-center text-sm text-slate-400 border border-slate-200">
                No system updates
              </div>
            ) : (
              <div className="space-y-2">
                {systemData.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 hover:shadow-sm transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 text-purple-600">
                      <FiGlobe className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                      <p className="text-sm text-slate-600 mt-0.5">{notification.description}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {formatDate(notification.createdAt)}
                        </span>
                        {notification.redirectUrl && (
                          <a
                            href={notification.redirectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline flex items-center gap-0.5"
                          >
                            <FiExternalLink className="w-3 h-3" /> Open
                          </a>
                        )}
                      </div>
                    </div>
                    {notification.read ? (
                      <FiCheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
                    ) : (
                      <FiCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-1" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Personal Notifications Section ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <FiUser className="text-purple-600" /> Personal Notifications
              {personalNotifications.filter((n) => !n.read).length > 0 && (
                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                  {personalNotifications.filter((n) => !n.read).length} unread
                </span>
              )}
            </h2>
            {personalNotifications.some((n) => !n.read) && (
              <button
                onClick={handleMarkAllRead}
                disabled={actionLoading}
                className="text-xs font-medium text-purple-600 hover:text-purple-800 transition px-3 py-1 rounded-lg border border-purple-200 hover:bg-purple-50 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {personalNotifications.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-4 text-center text-sm text-slate-400 border border-slate-200">
              No personal notifications
            </div>
          ) : (
            <div className="space-y-2">
              {personalNotifications.map((notification, index) => {
                const isRead = notification.read || false;
                const isPersonal = notification.type === 'personal';
                const sender = notification.sender || {};

                let avatarContent;
                if (isPersonal) {
                  avatarContent = sender.avatar ? (
                    <Image
                      src={sender.avatar}
                      alt={sender.fullname || sender.username || 'User'}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {(sender.fullname || sender.username || 'U')[0].toUpperCase()}
                    </div>
                  );
                } else {
                  avatarContent = (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <FiBell className="w-4 h-4" />
                    </div>
                  );
                }

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`bg-white rounded-xl border p-4 flex items-start gap-3 hover:shadow-sm transition ${
                      isRead ? 'border-slate-200' : 'border-purple-200 bg-purple-50/30'
                    }`}
                    ref={index === personalNotifications.length - 1 ? lastElementRef : null}
                  >
                    <div className="flex-shrink-0">{avatarContent}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {notification.title || (isPersonal ? 'Personal Message' : 'Notification')}
                      </p>
                      <p className="text-sm text-slate-600 mt-0.5">{notification.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {formatDate(notification.createdAt)}
                        </span>
                        {isPersonal && sender.fullname && (
                          <span className="flex items-center gap-1">
                            <FiUser className="w-3 h-3" /> {sender.fullname}
                          </span>
                        )}
                        {notification.redirectUrl && (
                          <a
                            href={notification.redirectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:underline flex items-center gap-0.5"
                          >
                            <FiExternalLink className="w-3 h-3" /> Open
                          </a>
                        )}
                        {!isRead && (
                          <button
                            onClick={() => handleMarkRead(notification.id)}
                            disabled={processingId === notification.id}
                            className="text-purple-600 hover:text-purple-800 font-medium transition disabled:opacity-50"
                          >
                            {processingId === notification.id ? (
                              <FiLoader className="w-3 h-3 animate-spin" />
                            ) : (
                              'Mark read'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {isRead ? (
                      <FiCheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
                    ) : (
                      <FiCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-1" />
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Infinite scroll loading indicator */}
          {hasNextPage && (
            <div className="py-4 flex justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <FiLoader className="w-5 h-5 animate-spin text-purple-600" />
                  Loading more...
                </div>
              ) : (
                <div className="h-4" />
              )}
            </div>
          )}

          {!hasNextPage && personalNotifications.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-4">End of notifications</p>
          )}
        </div>
      </div>
    </>
  );
}