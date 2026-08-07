// pages/community/myposts.js
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import { useUserProfile, useLikePost } from '../../lib/queries';
import {
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiLoader,
  FiRefreshCw,
  FiUser,
  FiClock,
  FiExternalLink,
  FiPlay,
  FiPlus,
  FiArrowLeft,
} from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import toast from 'react-hot-toast';

const POST_TYPE_ICONS = {
  general: '📌',
  launch: '🚀',
  update: '📢',
  job: '💼',
  question: '❓',
  event: '📅',
  promotional: '💎',
};

const POST_TYPE_LABELS = {
  general: 'General',
  launch: 'Launch',
  update: 'Update',
  job: 'Job',
  question: 'Question',
  event: 'Event',
  promotional: 'Promotional',
};

const CATEGORIES = [
  { value: 'general', label: '📌 General' },
  { value: 'web-dev', label: '💻 Web Dev' },
  { value: 'design', label: '🎨 Design' },
  { value: 'ai', label: '🤖 AI' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'content', label: '👑 Content' },
  { value: 'startup', label: '🚀 Startup' },
  { value: 'social', label: '📱 Social' },
  { value: 'coding', label: '💻 Coding' },
  { value: 'marketing', label: '📊 Marketing' },
  { value: 'other', label: '📌 Other' },
];

export default function MyPosts() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const likeMutation = useLikePost();

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useUserProfile(user?.uid, isAuthenticated && !!user);

  const posts = data?.posts || [];
  const profileUser = data?.user;

  // ── Like handler (optimistic) ──
  const handleLike = (postId) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/community/myposts');
      return;
    }
    likeMutation.mutate(postId);
  };

  // ── Share handler ──
  const handleShare = async (postId) => {
    const url = `${window.location.origin}/community/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Link copied!');
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

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-8 w-8 bg-slate-200 rounded-full" />
          <div className="h-8 w-40 bg-slate-200 rounded-lg" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-200" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-32" />
                <div className="h-3 bg-slate-200 rounded w-24 mt-1" />
              </div>
            </div>
            <div className="h-4 bg-slate-200 rounded w-full mb-2" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  // ── Not authenticated ──
  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <p className="text-yellow-700 font-medium">Please sign in to view your posts.</p>
          <button
            onClick={() => router.push('/login?redirect=/community/myposts')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600 font-medium">Failed to load your posts.</p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
          >
            <FiRefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Meta title="My Posts – Make Trend Community" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/community/feed"
              className="text-slate-400 hover:text-slate-600 transition"
            >
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Posts</h1>
              <p className="text-sm text-slate-400">
                {profileUser?.fullname || profileUser?.username || 'Your'} posts
              </p>
            </div>
          </div>
          <Link
            href="/community/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium"
          >
            <FiPlus className="w-4 h-4" /> Create Post
          </Link>
        </div>

        {/* ── User info card ── */}
        {profileUser && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-200 overflow-hidden">
              {profileUser.avatar ? (
                <Image
                  src={profileUser.avatar}
                  alt={profileUser.fullname || 'User'}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-lg font-bold">
                  {profileUser.fullname?.[0] || profileUser.username?.[0] || 'U'}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{profileUser.fullname || profileUser.username || 'Anonymous'}</p>
              <p className="text-sm text-slate-500">@{profileUser.username || 'user'}</p>
              {profileUser.bio && <p className="text-sm text-slate-600 mt-1">{profileUser.bio}</p>}
              {profileUser.createdAt && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <FiClock className="w-3 h-3" /> Joined {formatDate(profileUser.createdAt)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Posts List ── */}
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-slate-900">No posts yet</h3>
            <p className="text-slate-500 text-sm">Share your first post with the community!</p>
            <Link
              href="/community/create"
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
            >
              <FiPlus className="w-4 h-4" /> Create Post
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map((post) => {
              const isLiked = post.userLiked || false;
              const postTypeIcon = POST_TYPE_ICONS[post.type] || '📌';
              const postTypeLabel = POST_TYPE_LABELS[post.type] || 'General';
              const isVideo = post.videoUrl && post.videoUrl.trim() !== '';
              const hasImage = post.imageUrl && post.imageUrl.trim() !== '';
              const hasCTA = post.ctaText && post.ctaUrl;

              return (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition"
                >
                  {/* ── Post Header ── */}
                  <div className="flex items-start gap-3">
                    <Link href={`/community/profile/${post.userId}`} className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                        {post.user?.avatar ? (
                          <Image
                            src={post.user.avatar}
                            alt={post.user.fullname || 'User'}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm font-bold">
                            {post.user?.fullname?.[0] || post.user?.username?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <Link href={`/community/profile/${post.userId}`} className="font-semibold text-slate-900 hover:text-purple-600 transition text-sm">
                          {post.user?.fullname || post.user?.username || 'Anonymous'}
                        </Link>
                        <span className="text-xs text-slate-400">· {formatDate(post.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {postTypeIcon} {postTypeLabel}
                        </span>
                        {post.category && post.category !== 'general' && (
                          <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                            {CATEGORIES.find(c => c.value === post.category)?.label || post.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Post Content ── */}
                  <Link href={`/community/post/${post.id}`} className="block mt-3">
                    <h2 className="text-lg font-bold text-slate-900 hover:text-purple-600 transition">
                      {post.title}
                    </h2>
                    <p className="text-slate-600 mt-1 text-sm whitespace-pre-wrap line-clamp-4">
                      {post.description}
                    </p>
                  </Link>

                  {/* ── Image ── */}
                  {hasImage && (
                    <Link href={`/community/post/${post.id}`} className="block mt-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <div className="relative aspect-video max-h-80">
                        <Image
                          src={post.imageUrl}
                          alt={post.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 600px"
                          className="object-contain"
                          loading="lazy"
                        />
                      </div>
                    </Link>
                  )}

                  {/* ── Video ── */}
                  {isVideo && (
                    <Link href={`/community/post/${post.id}`} className="block mt-3 rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video">
                      <video
                        src={post.videoUrl}
                        controls
                        className="w-full h-full"
                        poster={post.imageUrl || undefined}
                        playsInline
                      />
                    </Link>
                  )}

                  {/* ── CTA Button ── */}
                  {hasCTA && (
                    <div className="mt-3">
                      <a
                        href={post.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                      >
                        {post.ctaText} <FiExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* ── Actions ── */}
                  <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleLike(post.id)}
                      disabled={!isAuthenticated}
                      className={`flex items-center gap-1.5 text-sm transition ${
                        isLiked
                          ? 'text-purple-600 font-semibold'
                          : 'text-slate-500 hover:text-purple-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isLiked ? (
                        <FaHeart className="w-4 h-4 text-purple-600" />
                      ) : (
                        <FiHeart className="w-4 h-4" />
                      )}
                      <span>{post.likes || 0}</span>
                    </button>

                    <Link
                      href={`/community/post/${post.id}`}
                      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-600 transition"
                    >
                      <FiMessageCircle className="w-4 h-4" />
                      <span>{post.commentsCount || 0}</span>
                    </Link>

                    <button
                      onClick={() => handleShare(post.id)}
                      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-600 transition ml-auto"
                    >
                      <FiShare2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}