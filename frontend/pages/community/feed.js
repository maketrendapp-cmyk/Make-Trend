// pages/community/feed.js
import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import { usePosts, useLikePost } from '../../lib/queries';
import {
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiLoader,
  FiRefreshCw,
  FiFilter,
  FiX,
  FiUser,
  FiClock,
  FiExternalLink,
  FiPlay,
} from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import toast from 'react-hot-toast';

// ── Constants ──
const CATEGORIES = [
  { value: 'all', label: '📌 All' },
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

const POST_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'general', label: 'General' },
  { value: 'launch', label: '🚀 Launch' },
  { value: 'update', label: '📢 Update' },
  { value: 'job', label: '💼 Job' },
  { value: 'question', label: '❓ Question' },
  { value: 'event', label: '📅 Event' },
  { value: 'promotional', label: '💎 Promotional' },
];

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

export default function CommunityFeed() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // ── Filter state ──
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [appliedCategory, setAppliedCategory] = useState('all');
  const [appliedType, setAppliedType] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Like mutation (optimistic) ──
  const likeMutation = useLikePost();

  // ── Fetch posts with backend filtering ──
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = usePosts(
    appliedCategory === 'all' ? null : appliedCategory,
    appliedType === 'all' ? null : appliedType,
    true
  );

  const posts = data?.pages?.flatMap((page) => page.posts) || [];

  // ── Apply filters ──
  const applyFilters = () => {
    setAppliedCategory(selectedCategory);
    setAppliedType(selectedType);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedType('all');
    setAppliedCategory('all');
    setAppliedType('all');
    setIsFilterOpen(false);
  };

  // ── Infinite scroll observer ──
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

  // ── Like handler (optimistic) ──
  const handleLike = (postId) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/community/feed');
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

  // ── Skeleton loader ──
  if (isLoading && !posts.length) {
    return (
      <>
        <Meta title="Community Feed – Make Trend" />
        <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 w-32 bg-slate-200 rounded-lg" />
            <div className="h-10 w-32 bg-slate-200 rounded-xl" />
          </div>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-20 bg-slate-200 rounded-full flex-shrink-0" />
            ))}
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
      </>
    );
  }

  // ── Error state ──
  if (isError && !posts.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600 font-medium">Failed to load posts.</p>
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
      <Meta
        title="Community Feed – Make Trend"
        description="Discover posts from the Make Trend community – product launches, updates, questions, and more."
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              🌍 Community Feed
            </h1>
            <p className="text-sm text-slate-400">Discover what's happening</p>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <Link
                href="/community/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium"
              >
                <span>+</span> Create Post
              </Link>
            )}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium"
            >
              <FiFilter className="w-4 h-4" />
              Filters
              {(appliedCategory !== 'all' || appliedType !== 'all') && (
                <span className="w-2 h-2 bg-purple-600 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* ── Filter Panel ── */}
        {isFilterOpen && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm animate-slideDown">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Clear All
              </button>
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      selectedCategory === cat.value
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Post Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Post Type</label>
              <div className="flex flex-wrap gap-2">
                {POST_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      selectedType === type.value
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={applyFilters}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-medium text-sm"
            >
              Apply Filters
            </button>
          </div>
        )}

        {/* ── Active filters indicator ── */}
        {(appliedCategory !== 'all' || appliedType !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-slate-500 font-medium">Active filters:</span>
            {appliedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full">
                Category: {CATEGORIES.find(c => c.value === appliedCategory)?.label || appliedCategory}
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setAppliedCategory('all');
                  }}
                  className="hover:text-red-500"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </span>
            )}
            {appliedType !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full">
                Type: {POST_TYPES.find(t => t.value === appliedType)?.label || appliedType}
                <button
                  onClick={() => {
                    setSelectedType('all');
                    setAppliedType('all');
                  }}
                  className="hover:text-red-500"
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

        {/* ── Posts List ── */}
        {posts.length === 0 && !isLoading ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-slate-900">No posts found</h3>
            <p className="text-slate-500 text-sm">
              {isAuthenticated
                ? 'Be the first to share something!'
                : 'Sign in to join the conversation.'}
            </p>
            {isAuthenticated && (
              <Link
                href="/community/create"
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
              >
                Create Post
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {posts.map((post, index) => {
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
                  ref={index === posts.length - 1 ? lastElementRef : null}
                >
                  {/* ── Post Header ── */}
                  <div className="flex items-start gap-3">
                    <Link href={`/profile/${post.userId}`} className="flex-shrink-0">
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
                        <Link href={`/profile/${post.userId}`} className="font-semibold text-slate-900 hover:text-purple-600 transition text-sm">
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

        {/* ── Infinite scroll loading ── */}
        {hasNextPage && (
          <div className="py-6 flex justify-center">
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

        {!hasNextPage && posts.length > 0 && (
          <p className="text-center text-xs text-slate-400 py-6">
            You've reached the end 🎉
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </>
  );
}