// pages/community/myposts.js
import React, { useState } from 'react';
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
  const deletePostMutation = useDeletePost();

  // ── Fetch profile and posts ──
  const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);
  const { data: posts, isLoading: postsLoading, isError, refetch: refetchPosts } = useMyPosts(isAuthenticated);

  const isLoading = profileLoading || postsLoading;

  // ── Custom delete confirmation modal state ──
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, postId: null });

  // ── Like handler ──
  const handleLike = (postId) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/community/myposts');
      return;
    }
    likeMutation.mutate(postId);
  };

  // ── Delete handler (opens modal) ──
  const handleDeleteClick = (postId) => {
    setDeleteModal({ isOpen: true, postId });
  };

  // ── Confirm delete ──
  const confirmDelete = () => {
    if (deleteModal.postId) {
      deletePostMutation.mutate(deleteModal.postId, {
        onSuccess: () => {
          setDeleteModal({ isOpen: false, postId: null });
          toast.success('Post deleted successfully');
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to delete post');
          setDeleteModal({ isOpen: false, postId: null });
        },
      });
    }
  };

  // ── Cancel delete ──
  const cancelDelete = () => {
    setDeleteModal({ isOpen: false, postId: null });
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
            onClick={() => refetchPosts()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
          >
            <FiRefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Use profile data for post author info ──
  const authorName = profile?.fullname || profile?.username || 'Anonymous';
  const authorAvatar = profile?.avatar || '';
  const authorUid = user?.uid;

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
                {profile?.fullname || profile?.username || 'Your'} posts
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
        {profile && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-200 overflow-hidden">
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt={profile.fullname || 'User'}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-lg font-bold">
                  {profile.fullname?.[0] || profile.username?.[0] || 'U'}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{profile.fullname || profile.username || 'Anonymous'}</p>
              <p className="text-sm text-slate-500">@{profile.username || 'user'}</p>
              {profile.bio && <p className="text-sm text-slate-600 mt-1">{profile.bio}</p>}
              {profile.createdAt && (
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                  <FiClock className="w-3 h-3" /> Joined {formatDate(profile.createdAt)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Posts List ── */}
        {posts && posts.length === 0 ? (
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
                  {/* ── Post Header (using profile data) ── */}
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

                    {/* ── EDIT ── */}
                    <Link
                      href={`/community/edit/${post.id}`}
                      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-600 transition"
                    >
                      <FiEdit className="w-4 h-4" />
                      <span>Edit</span>
                    </Link>

                    {/* ── DELETE ── */}
                    <button
                      onClick={() => handleDeleteClick(post.id)}
                      disabled={deletePostMutation.isLoading}
                      className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition disabled:opacity-50"
                    >
                      {deletePostMutation.isLoading ? (
                        <FiLoader className="w-4 h-4 animate-spin" />
                      ) : (
                        <FiTrash2 className="w-4 h-4" />
                      )}
                      <span>Delete</span>
                    </button>

                    {/* ── SHARE ── */}
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

        {/* ── Custom Delete Confirmation Modal ── */}
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
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deletePostMutation.isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {deletePostMutation.isLoading ? (
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