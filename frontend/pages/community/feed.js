import React, { useState, useCallback, useRef, useMemo } from 'react';
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
  FiExternalLink,
  FiPlay,
  FiChevronUp,
  FiUser,
  FiSearch,
  FiTrendingUp,
} from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import toast from 'react-hot-toast';

// ── Helper: Get embed info for video URLs ──
function getEmbedInfo(url) {
  if (!url) return null;
  const ytRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/;
  const ytMatch = url.match(ytRegex);
  if (ytMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      id: ytMatch[1],
    };
  }
  const vimeoRegex = /vimeo\.com\/(\d+)/;
  const vimeoMatch = url.match(vimeoRegex);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      id: vimeoMatch[1],
    };
  }
  return null;
}

// ── localStorage helpers for like status ──
const getLocalVote = (postId) => {
  try {
    const raw = localStorage.getItem(`community_like_${postId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};

const setLocalVote = (postId, voted, likes) => {
  try {
    localStorage.setItem(`community_like_${postId}`, JSON.stringify({ voted, likes }));
  } catch (e) {}
};

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
  const likeMutation = useLikePost();

  // ── Filter state ──
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [appliedCategory, setAppliedCategory] = useState('all');
  const [appliedType, setAppliedType] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState(new Set());

  // ── Build filters for regular feed ──
  const filters = useMemo(() => {
    const f = {};
    if (appliedCategory !== 'all') f.category = appliedCategory;
    if (appliedType !== 'all') f.type = appliedType;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    return f;
  }, [appliedCategory, appliedType, searchQuery]);

  // ── Featured feed: top 100 most‑liked ──
  const featuredFilters = useMemo(() => ({
    ...filters,
    sort: 'most-liked',
    limit: 100,
  }), [filters]);

  const {
    data: featuredData,
    isLoading: featuredLoading,
    isError: featuredError,
    refetch: refetchFeatured,
  } = usePosts(featuredFilters, true);

  const featuredPosts = featuredData?.pages?.[0]?.posts || [];

  // ── Regular feed: newest (infinite) ──
  const {
    data: regularData,
    isLoading: regularLoading,
    isError: regularError,
    error: regularErrorObj,
    refetch: refetchRegular,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePosts(filters, true);

  const regularPostsAll = regularData?.pages?.flatMap((page) => page.posts) || [];

  // ── Build a set of featured post IDs to filter duplicates ──
  const featuredIds = useMemo(() => new Set(featuredPosts.map(p => p.id)), [featuredPosts]);

  // ── Filter regular posts to exclude featured ones ──
  const regularPosts = useMemo(() => {
    return regularPostsAll.filter(p => !featuredIds.has(p.id));
  }, [regularPostsAll, featuredIds]);

  // ── Combined loading/error states ──
  const isLoading = featuredLoading && regularLoading && !regularPostsAll.length && !featuredPosts.length;
  const isError = featuredError && regularError;

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
    setSearchInput('');
    setSearchQuery('');
    setIsFilterOpen(false);
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // ── Intersection Observer for infinite scroll (only for regular posts) ──
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

  // ── Like handler ──
  const handleLike = (postId) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/community/feed');
      return;
    }

    const regularQueryKey = ['posts', { ...filters, sort: undefined, limit: 20 }];
    const featuredQueryKey = ['posts', featuredFilters];

    const findPostInCache = (queryKey) => {
      const data = queryClient.getQueryData(queryKey);
      if (!data) return null;
      let found = null;
      for (const page of data.pages) {
        const idx = page.posts.findIndex(p => p.id === postId);
        if (idx !== -1) {
          found = { page, idx, queryKey };
          break;
        }
      }
      return found;
    };

    let found = findPostInCache(regularQueryKey);
    let isFeatured = false;
    if (!found) {
      found = findPostInCache(featuredQueryKey);
      if (found) isFeatured = true;
    }

    if (!found) {
      likeMutation.mutate(postId, {
        onSuccess: () => {
          queryClient.invalidateQueries(regularQueryKey);
          queryClient.invalidateQueries(featuredQueryKey);
          queryClient.invalidateQueries(['post', postId]);
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to like');
        },
      });
      return;
    }

    const { page, idx, queryKey } = found;
    const currentPost = page.posts[idx];
    const newVoted = !currentPost.userLiked;
    const newLikes = newVoted ? currentPost.likes + 1 : currentPost.likes - 1;
    const updatedPost = { ...currentPost, userLiked: newVoted, likes: newLikes };

    const currentData = queryClient.getQueryData(queryKey);
    if (currentData) {
      const newPages = currentData.pages.map((p) => {
        if (p === page) {
          return {
            ...p,
            posts: p.posts.map((pp) => (pp.id === postId ? updatedPost : pp)),
          };
        }
        return p;
      });
      queryClient.setQueryData(queryKey, { ...currentData, pages: newPages });
    }

    const otherQueryKey = isFeatured ? regularQueryKey : featuredQueryKey;
    const otherData = queryClient.getQueryData(otherQueryKey);
    if (otherData) {
      const otherPages = otherData.pages.map((p) => {
        const idx2 = p.posts.findIndex(pp => pp.id === postId);
        if (idx2 !== -1) {
          const newPosts = [...p.posts];
          newPosts[idx2] = updatedPost;
          return { ...p, posts: newPosts };
        }
        return p;
      });
      queryClient.setQueryData(otherQueryKey, { ...otherData, pages: otherPages });
    }

    queryClient.setQueryData(['post', postId], updatedPost);
    setLocalVote(postId, newVoted, newLikes);

    likeMutation.mutate(postId, {
      onSuccess: (data) => {
        const serverVoted = data.action === 'added';
        const serverLikes = data.likes;
        const finalPost = { ...currentPost, userLiked: serverVoted, likes: serverLikes };

        [regularQueryKey, featuredQueryKey].forEach(key => {
          const cache = queryClient.getQueryData(key);
          if (cache) {
            const newPages = cache.pages.map((p) => {
              const idx2 = p.posts.findIndex(pp => pp.id === postId);
              if (idx2 !== -1) {
                const newPosts = [...p.posts];
                newPosts[idx2] = finalPost;
                return { ...p, posts: newPosts };
              }
              return p;
            });
            queryClient.setQueryData(key, { ...cache, pages: newPages });
          }
        });
        queryClient.setQueryData(['post', postId], finalPost);
        setLocalVote(postId, serverVoted, serverLikes);
      },
      onError: (error) => {
        [regularQueryKey, featuredQueryKey].forEach(key => {
          const cache = queryClient.getQueryData(key);
          if (cache) {
            const newPages = cache.pages.map((p) => {
              const idx2 = p.posts.findIndex(pp => pp.id === postId);
              if (idx2 !== -1) {
                const newPosts = [...p.posts];
                newPosts[idx2] = currentPost;
                return { ...p, posts: newPosts };
              }
              return p;
            });
            queryClient.setQueryData(key, { ...cache, pages: newPages });
          }
        });
        queryClient.setQueryData(['post', postId], currentPost);
        setLocalVote(postId, currentPost.userLiked, currentPost.likes);
        toast.error(error.message || 'Failed to like');
      },
    });
  };

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

  const toggleExpand = (postId) => {
    setExpandedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // ── Loading state ──
  if (isLoading) {
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
  if (isError && !regularPosts.length && !featuredPosts.length) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600 font-medium">Failed to load posts.</p>
          <button
            onClick={() => { refetchFeatured(); refetchRegular(); }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
          >
            <FiRefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const hasActiveFilters = appliedCategory !== 'all' || appliedType !== 'all' || searchQuery;
  const hasFeatured = featuredPosts.length > 0;

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
              <>
                <Link
                  href="/community/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium"
                >
                  <span>+</span> Create Post
                </Link>
                <Link
                  href="/community/myposts"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium"
                >
                  <FiUser className="w-4 h-4" /> My Posts
                </Link>
              </>
            )}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium"
            >
              <FiFilter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-purple-600 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search posts or @username..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium flex items-center gap-1.5"
            >
              <FiSearch className="w-4 h-4" /> Search
            </button>
          </div>
          {searchQuery && (
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
              <span>Searching for: <strong className="text-slate-600">{searchQuery}</strong></span>
              <button
                onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                className="text-red-500 hover:text-red-700 font-medium"
              >
                Clear
              </button>
            </div>
          )}
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
        {hasActiveFilters && (
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
            {searchQuery && (
              <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full">
                Search: {searchQuery}
                <button
                  onClick={() => { setSearchInput(''); setSearchQuery(''); }}
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

        {/* ── FEATURED POSTS (Top Liked) ── */}
        {hasFeatured && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FiTrendingUp className="text-purple-600 text-xl" />
              <h2 className="text-lg font-bold text-slate-900">🔥 Top Liked</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Top {featuredPosts.length}
              </span>
            </div>
            <div className="space-y-4">
              {featuredPosts.map((post, idx) => {
                const rank = idx + 1;
                let isTop3 = rank <= 3;
                return (
                  <PostCard
                    key={post.id}
                    post={post}
                    isLiked={post.userLiked || false}
                    isAuthenticated={isAuthenticated}
                    onLike={handleLike}
                    onShare={handleShare}
                    formatDate={formatDate}
                    toggleExpand={toggleExpand}
                    expandedPosts={expandedPosts}
                    isFeatured={!isTop3} // only apply featured style for ranks 4+
                    rank={rank}
                    isTop3={isTop3}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── REGULAR POSTS (Newest) ── */}
        <div>
          {regularPosts.length === 0 && !regularLoading ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-slate-900">
                {hasFeatured ? 'No more posts' : 'No posts found'}
              </h3>
              <p className="text-slate-500 text-sm">
                {isAuthenticated
                  ? searchQuery
                    ? 'No results match your search. Try adjusting your query.'
                    : 'Be the first to share something!'
                  : 'Sign in to join the conversation.'}
              </p>
              {isAuthenticated && !searchQuery && !hasFeatured && (
                <Link
                  href="/community/create"
                  className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
                >
                  Create Post
                </Link>
              )}
            </div>
          ) : (
            <div>
              {hasFeatured && regularPosts.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-slate-900">📰 Recent</h2>
                </div>
              )}
              <div className="space-y-5">
                {regularPosts.map((post, index) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    isLiked={post.userLiked || false}
                    isAuthenticated={isAuthenticated}
                    onLike={handleLike}
                    onShare={handleShare}
                    formatDate={formatDate}
                    toggleExpand={toggleExpand}
                    expandedPosts={expandedPosts}
                    ref={index === regularPosts.length - 1 ? lastElementRef : undefined}
                  />
                ))}
              </div>
            </div>
          )}

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

          {!hasNextPage && regularPosts.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-6">
              You've reached the end 🎉
            </p>
          )}
        </div>
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

// ── Post Card Component (Enhanced for Top 3) ──
const PostCard = React.forwardRef(({
  post,
  isLiked,
  isAuthenticated,
  onLike,
  onShare,
  formatDate,
  toggleExpand,
  expandedPosts,
  isFeatured = false,
  rank = null,
  isTop3 = false,
}, ref) => {
  const postTypeIcon = POST_TYPE_ICONS[post.type] || '📌';
  const postTypeLabel = POST_TYPE_LABELS[post.type] || 'General';
  const isVideo = post.videoUrl && post.videoUrl.trim() !== '';
  const hasImage = post.imageUrl && post.imageUrl.trim() !== '';
  const hasCTA = post.ctaText && post.ctaUrl;
  const isExpanded = expandedPosts.has(post.id);
  const embedInfo = getEmbedInfo(post.videoUrl);
  const isEmbeddable = embedInfo !== null;
  const hasVideoUrl = isVideo;
  const titleLength = post.title?.length || 0;
  const descLength = post.description?.length || 0;
  const truncateTitle = titleLength > 150;
  const truncateDesc = descLength > 400;

  // ── Determine styling based on rank ──
  let cardClasses = 'bg-white rounded-2xl border p-5 hover:shadow-md transition';
  let badgeClasses = '';
  let badgeIcon = null;
  let rankBadge = null;

  if (isTop3 && rank) {
    if (rank === 1) {
      cardClasses += ' border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-md';
      badgeClasses = 'bg-yellow-100 text-yellow-800 border-yellow-300';
      badgeIcon = '👑';
      rankBadge = (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">
          👑 #1
        </span>
      );
    } else if (rank === 2) {
      cardClasses += ' border-slate-400 bg-gradient-to-br from-slate-50 to-gray-100 shadow-md';
      badgeClasses = 'bg-slate-200 text-slate-700 border-slate-300';
      badgeIcon = '🥈';
      rankBadge = (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-300 text-slate-700">
          🥈 #2
        </span>
      );
    } else if (rank === 3) {
      cardClasses += ' border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md';
      badgeClasses = 'bg-orange-100 text-orange-800 border-orange-300';
      badgeIcon = '🥉';
      rankBadge = (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-300 text-orange-800">
          🥉 #3
        </span>
      );
    }
  } else if (isFeatured) {
    cardClasses += ' border-purple-200 bg-gradient-to-br from-purple-50/50 to-white';
  } else {
    cardClasses += ' border-slate-200';
  }

  return (
    <div ref={ref} className={cardClasses}>
      {/* Top rank badge (only for top 3) */}
      {rankBadge && (
        <div className="flex items-center justify-between mb-2">
          {rankBadge}
          <span className="text-xs text-slate-400">🔥 Featured</span>
        </div>
      )}

      {isFeatured && !isTop3 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
            #{rank}
          </span>
          <span className="text-xs text-purple-400">🔥 Featured</span>
        </div>
      )}

      {/* ── Post Header ── */}
      <div className="flex items-start gap-3">
        <Link href={`/userinfo/${post.userId}`} className="flex-shrink-0">
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
            <Link
              href={`/userinfo/${post.userId}`}
              className="font-semibold text-slate-900 hover:text-purple-600 transition text-sm"
            >
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
          {truncateTitle && !isExpanded ? (
            <>
              {post.title.slice(0, 150)}...
              <span
                onClick={(e) => { e.preventDefault(); toggleExpand(post.id); }}
                className="text-purple-600 hover:underline ml-1 text-sm font-normal cursor-pointer"
              >
                Read more
              </span>
            </>
          ) : (
            post.title
          )}
        </h2>
        <p className="text-slate-600 mt-1 text-sm whitespace-pre-wrap">
          {truncateDesc && !isExpanded ? (
            <>
              {post.description.slice(0, 400)}...
              <span
                onClick={(e) => { e.preventDefault(); toggleExpand(post.id); }}
                className="text-purple-600 hover:underline ml-1 text-sm font-normal cursor-pointer"
              >
                Read more
              </span>
            </>
          ) : (
            post.description
          )}
        </p>
        {(truncateTitle || truncateDesc) && isExpanded && (
          <button
            onClick={() => toggleExpand(post.id)}
            className="text-xs text-purple-600 hover:underline mt-1 flex items-center gap-0.5"
          >
            Show less <FiChevronUp className="w-3 h-3" />
          </button>
        )}
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

      {/* ── Video / Embed ── */}
      {hasVideoUrl && (
        <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video">
          {isEmbeddable ? (
            <iframe
              src={embedInfo.embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              title={post.title || 'Video'}
            />
          ) : (
            <video
              src={post.videoUrl}
              controls
              className="w-full h-full"
              poster={post.imageUrl || undefined}
              playsInline
            />
          )}
        </div>
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
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
        <button
          onClick={() => onLike(post.id)}
          disabled={!isAuthenticated}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
            isLiked
              ? 'border-purple-300 bg-purple-50 text-purple-600'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-purple-50 hover:border-purple-200'
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-purple-50 hover:border-purple-200 transition text-sm"
        >
          <FiMessageCircle className="w-4 h-4" />
          <span>{post.commentsCount || 0}</span>
        </Link>

        <button
          onClick={() => onShare(post.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-purple-50 hover:border-purple-200 transition text-sm ml-auto"
        >
          <FiShare2 className="w-4 h-4" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
});
PostCard.displayName = 'PostCard';