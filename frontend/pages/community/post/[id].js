// pages/community/post/[id].js
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import Meta from '../../../components/Meta';
import { useAuth } from '../../../components/AuthScreen';
import {
  usePost,
  usePostComments,
  useAddComment,
  useLikePost,
} from '../../../lib/queries';
import {
  FiArrowLeft,
  FiHeart,
  FiMessageCircle,
  FiShare2,
  FiLoader,
  FiRefreshCw,
  FiSend,
  FiUser,
  FiClock,
  FiExternalLink,
  FiPlay,
  FiChevronUp,
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

export default function PostDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState('');
  const [expanded, setExpanded] = useState(false);

  // ── Fetch post and comments ──
  const { data: post, isLoading: postLoading, isError: postError, refetch: refetchPost } = usePost(id, !!id);
  const {
    data: commentsData,
    isLoading: commentsLoading,
    isError: commentsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchComments,
  } = usePostComments(id, !!id);

  const comments = commentsData?.pages?.flatMap((page) => page.comments) || [];

  // ── Mutations ──
  const likeMutation = useLikePost();
  const addCommentMutation = useAddComment();

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

  // ── Like handler with localStorage ──
  const handleLike = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/community/post/${id}`);
      return;
    }

    // Get current post from cache
    const currentPost = queryClient.getQueryData(['post', id]);
    if (!currentPost) {
      toast.error('Post not found');
      return;
    }

    // Optimistic UI: update localStorage and cache via mutation
    const newVoted = !currentPost.userLiked;
    const newLikes = newVoted ? currentPost.likes + 1 : currentPost.likes - 1;
    setLocalVote(id, newVoted, newLikes);

    likeMutation.mutate(id, {
      onSuccess: (data) => {
        // Sync localStorage with server
        const serverVoted = data.action === 'added';
        const serverLikes = data.likes;
        setLocalVote(id, serverVoted, serverLikes);
      },
      onError: (error) => {
        // Revert localStorage to previous state
        const revertedPost = queryClient.getQueryData(['post', id]);
        if (revertedPost) {
          setLocalVote(id, revertedPost.userLiked, revertedPost.likes);
        }
        toast.error(error.message || 'Failed to like');
      },
    });
  };

  // ── Comment submit ──
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthenticated) return;

    addCommentMutation.mutate(
      { postId: id, content: commentText.trim() },
      {
        onSuccess: () => {
          setCommentText('');
        },
      }
    );
  };

  // ── Share handler ──
  const handleShare = async () => {
    const url = `${window.location.origin}/community/post/${id}`;
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
  if (postLoading || commentsLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 w-32 bg-slate-200 rounded-lg mb-6" />
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-200" />
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-3 bg-slate-200 rounded w-24 mt-1" />
            </div>
          </div>
          <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-full" />
          <div className="h-4 bg-slate-200 rounded w-2/3" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-32" />
                <div className="h-3 bg-slate-200 rounded w-full mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (postError || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600 font-medium">Post not found.</p>
          <button
            onClick={() => router.push('/community/feed')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  const isLiked = post.userLiked || false;
  const postTypeIcon = POST_TYPE_ICONS[post.type] || '📌';
  const postTypeLabel = POST_TYPE_LABELS[post.type] || 'General';
  const isVideo = post.videoUrl && post.videoUrl.trim() !== '';
  const hasImage = post.imageUrl && post.imageUrl.trim() !== '';
  const hasCTA = post.ctaText && post.ctaUrl;

  // ── Read more logic ──
  const titleLength = post.title?.length || 0;
  const descLength = post.description?.length || 0;
  const truncateTitle = titleLength > 150;
  const truncateDesc = descLength > 400;
  const needsExpand = truncateTitle || truncateDesc;

  return (
    <>
      <Meta title={`${post.title} – Make Trend Community`} />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/community/feed"
              className="text-slate-400 hover:text-slate-600 transition"
            >
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Post</h1>
          </div>
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium"
          >
            <FiShare2 className="w-4 h-4" /> Share
          </button>
        </div>

        {/* ── Full Post ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          {/* Header */}
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

          {/* Content with Read more */}
          <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-900">
              {truncateTitle && !expanded ? (
                <>
                  {post.title.slice(0, 150)}...
                  <span
                    onClick={() => setExpanded(true)}
                    className="text-purple-600 hover:underline ml-1 text-sm font-normal cursor-pointer"
                  >
                    Read more
                  </span>
                </>
              ) : (
                post.title
              )}
            </h2>
            <p className="text-slate-600 mt-2 text-base whitespace-pre-wrap">
              {truncateDesc && !expanded ? (
                <>
                  {post.description.slice(0, 400)}...
                  <span
                    onClick={() => setExpanded(true)}
                    className="text-purple-600 hover:underline ml-1 text-sm font-normal cursor-pointer"
                  >
                    Read more
                  </span>
                </>
              ) : (
                post.description
              )}
            </p>
            {needsExpand && expanded && (
              <button
                onClick={() => setExpanded(false)}
                className="text-xs text-purple-600 hover:underline mt-2 flex items-center gap-0.5"
              >
                Show less <FiChevronUp className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Image */}
          {hasImage && (
            <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <div className="relative aspect-video max-h-[500px]">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Video */}
          {isVideo && (
            <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video">
              <video
                src={post.videoUrl}
                controls
                className="w-full h-full"
                poster={post.imageUrl || undefined}
                playsInline
              />
            </div>
          )}

          {/* CTA */}
          {hasCTA && (
            <div className="mt-4">
              <a
                href={post.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium"
              >
                {post.ctaText} <FiExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={handleLike}
              disabled={!isAuthenticated}
              className={`flex items-center gap-2 text-sm transition ${
                isLiked
                  ? 'text-purple-600 font-semibold'
                  : 'text-slate-500 hover:text-purple-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLiked ? (
                <FaHeart className="w-5 h-5 text-purple-600" />
              ) : (
                <FiHeart className="w-5 h-5" />
              )}
              <span>{post.likes || 0}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-purple-600 transition"
            >
              <FiShare2 className="w-5 h-5" />
              Share
            </button>
          </div>
        </div>

        {/* ── Comments Section ── */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FiMessageCircle className="text-purple-600" />
            Comments ({post.commentsCount || 0})
          </h3>
        </div>

        {/* Comment Form */}
        {isAuthenticated ? (
          <form onSubmit={handleSubmitComment} className="flex gap-3 mb-6">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
              disabled={addCommentMutation.isLoading}
            />
            <button
              type="submit"
              disabled={!commentText.trim() || addCommentMutation.isLoading}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {addCommentMutation.isLoading ? (
                <FiLoader className="w-4 h-4 animate-spin" />
              ) : (
                <FiSend className="w-4 h-4" />
              )}
            </button>
          </form>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4 text-center text-sm text-slate-500 mb-6 border border-slate-200">
            <Link href={`/login?redirect=/community/post/${id}`} className="text-purple-600 hover:underline font-medium">
              Sign in
            </Link> to join the conversation.
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 && !isFetchingNextPage ? (
            <p className="text-center text-sm text-slate-400 py-8">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment, index) => (
              <div
                key={comment.id}
                className="flex gap-3"
                ref={index === comments.length - 1 ? lastElementRef : null}
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                  {comment.user?.avatar ? (
                    <Image
                      src={comment.user.avatar}
                      alt={comment.user.fullname || 'User'}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-bold">
                      {comment.user?.fullname?.[0] || comment.user?.username?.[0] || 'U'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-900">
                      {comment.user?.fullname || comment.user?.username || 'Anonymous'}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Load more ── */}
        {hasNextPage && (
          <div className="py-4 flex justify-center">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-slate-400">
                <FiLoader className="w-4 h-4 animate-spin text-purple-600" />
                Loading more comments...
              </div>
            ) : (
              <div className="h-4" />
            )}
          </div>
        )}

        {!hasNextPage && comments.length > 0 && (
          <p className="text-center text-xs text-slate-400 py-4">End of comments</p>
        )}
      </div>
    </>
  );
}