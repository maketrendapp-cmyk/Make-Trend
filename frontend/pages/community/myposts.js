// pages/community/myposts.js
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import {
  useProfile,
  useMyPosts,
  useLikePost,
  useDeletePost,
  useInvalidateQueries,
  useMtCoins,
  useBuyPostLike,
} from '../../lib/queries';
import {
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiLoader,
  FiRefreshCw,
  FiUser,
  FiClock,
  FiExternalLink,
  FiPlus,
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiX,
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiAward,
  FiTrendingUp,
} from 'react-icons/fi';
import { FaHeart } from 'react-icons/fa';
import toast from 'react-hot-toast';

// ─── CONSTANTS ────────────────────────────────────────────────
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
  { value: 'all', label: '📌 All Categories' },
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

export default function MyPosts() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { invalidateMyPosts } = useInvalidateQueries();
  const likeMutation = useLikePost();
  const deletePostMutation = useDeletePost();
  const buyPostLike = useBuyPostLike();

  // ── Filter state ──
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState({ category: 'all', type: 'all', search: '' });

  // ── Profile & MT Coins ──
  const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);
  const { data: mtCoinsData, isLoading: mtCoinsLoading } = useMtCoins(isAuthenticated);

  // ── Posts ──
  const {
    data,
    isLoading: postsLoading,
    isError,
    refetch: refetchPosts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyPosts(
    {
      category: appliedFilters.category !== 'all' ? appliedFilters.category : undefined,
      type: appliedFilters.type !== 'all' ? appliedFilters.type : undefined,
      search: appliedFilters.search || undefined,
    },
    isAuthenticated
  );

  const posts = data?.pages?.flatMap((page) => page.posts) || [];
  const isLoading = profileLoading || postsLoading;

  // ── Delete modal ──
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, postId: null });
  const [deletingPostId, setDeletingPostId] = useState(null);

  // ── Boost modal ──
  const [boostModal, setBoostModal] = useState({ isOpen: false, postId: null, postTitle: '' });
  const [boostAmount, setBoostAmount] = useState(10);
  const [isBoosting, setIsBoosting] = useState(false);

  // ── Observer ──
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

  // ── Filters ──
  const applyFilters = () => {
    setAppliedFilters({
      category: categoryFilter,
      type: typeFilter,
      search: searchInput.trim(),
    });
  };

  const clearFilters = () => {
    setCategoryFilter('all');
    setTypeFilter('all');
    setSearchInput('');
    setAppliedFilters({ category: 'all', type: 'all', search: '' });
  };

  // ── Like ──
  const handleLike = (postId) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/community/myposts');
      return;
    }
    likeMutation.mutate(postId);
  };

  // ── Delete ──
  const handleDeleteClick = (postId) => {
    setDeleteModal({ isOpen: true, postId });
  };

  const confirmDelete = () => {
    if (deleteModal.postId) {
      setDeletingPostId(deleteModal.postId);
      deletePostMutation.mutate(deleteModal.postId, {
        onSuccess: () => {
          setDeleteModal({ isOpen: false, postId: null });
          setDeletingPostId(null);
          invalidateMyPosts();
          toast.success('Post deleted');
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to delete post');
          setDeleteModal({ isOpen: false, postId: null });
          setDeletingPostId(null);
        },
      });
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, postId: null });
    setDeletingPostId(null);
  };

  // ── Boost ──
  const handleBoostClick = (postId, postTitle) => {
    setBoostModal({ isOpen: true, postId, postTitle });
    setBoostAmount(10);
  };

  const handleBoostConfirm = () => {
    if (!boostModal.postId) return;
    setIsBoosting(true);
    buyPostLike.mutate(
      { postId: boostModal.postId, amount: boostAmount },
      {
        onSuccess: (data) => {
          toast.success(data.message || 'Likes purchased successfully!');
          setBoostModal({ isOpen: false, postId: null, postTitle: '' });
          setIsBoosting(false);
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to buy likes');
          setBoostModal({ isOpen: false, postId: null, postTitle: '' });
          setIsBoosting(false);
        },
      }
    );
  };

  const cancelBoost = () => {
    setBoostModal({ isOpen: false, postId: null, postTitle: '' });
    setIsBoosting(false);
  };

  // ── Share ──
  const handleShare = async (postId) => {
    const url = `${window.location.origin}/community/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
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

  // ── Loading ──
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

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600 font-medium">Failed to load your posts.</p>
          <button
            onClick={() => refetchPosts()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
          >
            <FiRefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const authorName = profile?.fullname || profile?.username || 'Anonymous';
  const authorAvatar = profile?.avatar || '';
  const authorUid = user?.uid;
  const hasActiveFilters = appliedFilters.category !== 'all' || appliedFilters.type !== 'all' || appliedFilters.search;
  const earnedFromPosts = mtCoinsData?.earnedFromPosts ?? 0;

  return (
    <>
      <Meta title="My Posts – Make Trend Community" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/community/feed"
              className="text-slate-400 hover:text-slate-600 transition"
            >
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">My Posts</h1>
          </div>
          <Link
            href="/community/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium"
          >
            <FiPlus className="w-4 h-4" /> Create
          </Link>
        </div>

        {/* ─── Profile & Earnings ─── */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden border-2 border-purple-100 flex-shrink-0">
              {profile?.avatar ? (
                <Image
                  src={profile.avatar}
                  alt={profile.fullname || 'User'}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-lg font-bold">
                  {profile?.fullname?.[0] || profile?.username?.[0] || 'U'}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{profile?.fullname || profile?.username}</p>
              <p className="text-xs text-slate-400">@{profile?.username || 'user'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-2 rounded-xl border border-purple-100">
            <FiAward className="w-5 h-5 text-purple-600" />
            <div className="text-right">
              <p className="text-xs text-slate-500 font-medium">Earned from likes</p>
              <p className="text-lg font-bold text-purple-700">
                {mtCoinsLoading ? '...' : earnedFromPosts}
                <span className="text-xs font-normal text-slate-400 ml-1">MT Coins</span>
              </p>
            </div>
          </div>
        </div>

        {/* ─── Filters ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search your posts..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />
            </div>
            <div className="w-full md:w-48">
              <CustomSelect
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                options={CATEGORIES}
                placeholder="All Categories"
              />
            </div>
            <div className="w-full md:w-44">
              <CustomSelect
                value={typeFilter}
                onChange={(val) => setTypeFilter(val)}
                options={POST_TYPES}
                placeholder="All Types"
              />
            </div>
            <button
              onClick={applyFilters}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium whitespace-nowrap"
            >
              Apply
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition text-sm font-medium whitespace-nowrap"
              >
                <FiX className="inline w-4 h-4 mr-1" /> Clear
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
              Filters active: {appliedFilters.category !== 'all' && `Category: ${appliedFilters.category} `}
              {appliedFilters.type !== 'all' && `Type: ${appliedFilters.type} `}
              {appliedFilters.search && `Search: "${appliedFilters.search}"`}
            </div>
          )}
        </div>

        {/* ─── Posts ─── */}
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-semibold text-slate-900">
              {hasActiveFilters ? 'No matching posts' : 'No posts yet'}
            </h3>
            <p className="text-slate-500 text-sm">
              {hasActiveFilters
                ? 'Try adjusting your filters.'
                : 'Share your first post with the community!'}
            </p>
            {!hasActiveFilters && (
              <Link
                href="/community/create"
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
              >
                <FiPlus className="w-4 h-4" /> Create Post
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
              const isDeletingThisPost = deletingPostId === post.id;

              return (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition"
                  ref={index === posts.length - 1 ? lastElementRef : null}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <Link href={`/userinfo/${authorUid}`} className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                        {authorAvatar ? (
                          <Image
                            src={authorAvatar}
                            alt={authorName}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm font-bold">
                            {authorName?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <Link
                          href={`/userinfo/${authorUid}`}
                          className="font-semibold text-slate-900 hover:text-purple-600 transition text-sm"
                        >
                          {authorName}
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

                  <Link href={`/community/post/${post.id}`} className="block mt-3">
                    <h2 className="text-lg font-bold text-slate-900 hover:text-purple-600 transition">
                      {post.title}
                    </h2>
                    <p className="text-slate-600 mt-1 text-sm whitespace-pre-wrap line-clamp-4">
                      {post.description}
                    </p>
                  </Link>

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

                  {/* ─── ACTION BAR ─── */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-slate-100 text-sm">
                    <button
                      onClick={() => handleLike(post.id)}
                      disabled={!isAuthenticated}
                      className={`flex items-center gap-1.5 transition ${
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
                      className="flex items-center gap-1.5 text-slate-500 hover:text-purple-600 transition"
                    >
                      <FiMessageCircle className="w-4 h-4" />
                      <span>{post.commentsCount || 0}</span>
                    </Link>

                    <Link
                      href={`/community/edit/${post.id}`}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-purple-600 transition"
                    >
                      <FiEdit className="w-4 h-4" />
                      <span>Edit</span>
                    </Link>

                    <button
                      onClick={() => handleBoostClick(post.id, post.title)}
                      className="flex items-center gap-1.5 text-purple-500 hover:text-purple-700 transition"
                    >
                      <FiTrendingUp className="w-4 h-4" />
                      <span>Boost</span>
                    </button>

                    <button
                      onClick={() => handleDeleteClick(post.id)}
                      disabled={deletePostMutation.isLoading || isDeletingThisPost}
                      className="flex items-center gap-1.5 text-red-500 hover:text-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeletingThisPost ? (
                        <FiLoader className="w-4 h-4 animate-spin" />
                      ) : (
                        <FiTrash2 className="w-4 h-4" />
                      )}
                      <span>Delete</span>
                    </button>

                    <button
                      onClick={() => handleShare(post.id)}
                      className="flex items-center gap-1.5 text-slate-500 hover:text-purple-600 transition"
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
            You've seen all your posts 🎉
          </p>
        )}

        {/* ─── DELETE MODAL ─── */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-fadeIn">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Delete Post</h3>
                <button
                  onClick={cancelDelete}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <p className="text-slate-600 text-sm mb-6">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelDelete}
                  disabled={deletePostMutation.isLoading}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deletePostMutation.isLoading || deletingPostId !== null}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-medium flex items-center gap-2"
                >
                  {deletePostMutation.isLoading || deletingPostId !== null ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiTrash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── BOOST MODAL ─── */}
        {boostModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-fadeIn">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FiTrendingUp className="text-purple-500" /> Boost Post
                </h3>
                <button
                  onClick={cancelBoost}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <p className="text-slate-600 text-sm mb-2">
                Add extra likes to <strong>{boostModal.postTitle}</strong>.
              </p>
              <p className="text-xs text-slate-400 mb-4">
                <span className="font-medium">5 MT Coins per like</span> (max 1000)
              </p>
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm font-medium text-slate-700">Likes:</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={boostAmount}
                  onChange={(e) => setBoostAmount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                />
                <span className="text-sm font-medium text-purple-600">
                  {boostAmount * 5} MT Coins
                </span>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelBoost}
                  disabled={isBoosting}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBoostConfirm}
                  disabled={isBoosting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {isBoosting ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    'Boost Now'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}