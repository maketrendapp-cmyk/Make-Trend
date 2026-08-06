// pages/productstrend/[id].js
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import {
  useProductDetail,
  useProductComments,
  useUpvoteProduct,
  useAddProductComment,
  useInvalidateQueries,
} from '../../lib/queries';
import { getToken } from '../../lib/api';
import toast from 'react-hot-toast';
import {
  FiArrowLeft,
  FiHeart,
  FiUser,
  FiClock,
  FiMessageCircle,
  FiExternalLink,
  FiLoader,
  FiRefreshCw,
  FiSend,
  FiEdit2,
  FiTrash2,
  FiShare2,
  FiGlobe,
  FiInfo,
  FiDollarSign,
  FiUsers,
  FiCpu,
  FiTwitter,
  FiCalendar,
  FiVideo,
  FiList,
  FiLock,
} from 'react-icons/fi';
import { FaRocket } from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

const PRICING_COLORS = {
  Free: 'text-green-600 bg-green-50 border-green-200',
  Freemium: 'text-blue-600 bg-blue-50 border-blue-200',
  Paid: 'text-amber-600 bg-amber-50 border-amber-200',
  Enterprise: 'text-purple-600 bg-purple-50 border-purple-200',
  'Contact for Pricing': 'text-slate-600 bg-slate-50 border-slate-200',
};

const STATUS_COLORS = {
  Live: 'text-green-600 bg-green-50 border-green-200',
  Beta: 'text-blue-600 bg-blue-50 border-blue-200',
  'Coming Soon': 'text-amber-600 bg-amber-50 border-amber-200',
  'In Development': 'text-slate-600 bg-slate-50 border-slate-200',
};

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateProductDetail, invalidateProductFeed, invalidateMyProducts } = useInvalidateQueries();

  const { data: product, isLoading, isError, refetch } = useProductDetail(id, !!id);
  const { data: comments = [], refetch: refetchComments } = useProductComments(id, true);
  const upvoteMutation = useUpvoteProduct();
  const addCommentMutation = useAddProductComment();

  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const isMaker = product?.makerUid === user?.uid;

  // ── Optimistic upvote handler ──
  const handleUpvote = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/productstrend/' + id);
      return;
    }

    const currentProduct = product;
    const prevUpvotes = currentProduct?.upvotes || 0;
    const prevUserVoted = currentProduct?.userVoted || false;
    const newUserVoted = !prevUserVoted;
    const newUpvotes = newUserVoted ? prevUpvotes + 1 : prevUpvotes - 1;

    const optimisticProduct = {
      ...currentProduct,
      upvotes: newUpvotes,
      userVoted: newUserVoted,
    };

    // Update detail cache
    queryClient.setQueryData(['productDetail', id], optimisticProduct);

    // Also update feed cache if possible (optional)
    // We'll skip to keep simple; feed will be updated when user navigates back

    upvoteMutation.mutate(id, {
      onError: (error) => {
        queryClient.setQueryData(['productDetail', id], currentProduct);
        toast.error(error.message || 'Failed to upvote');
      },
      // No onSuccess – keep optimistic
    });
  };

  // ── Optimistic comment handler ──
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/productstrend/' + id);
      return;
    }

    setSubmittingComment(true);

    const optimisticComment = {
      id: `temp-${Date.now()}`,
      text: commentText.trim(),
      userId: user?.uid,
      user: {
        username: user?.username || 'You',
        fullname: user?.fullname || 'You',
        avatar: user?.avatar || null,
      },
      createdAt: new Date().toISOString(),
    };

    const currentComments = queryClient.getQueryData(['productComments', id]) || [];
    queryClient.setQueryData(['productComments', id], [optimisticComment, ...currentComments]);

    const textToSend = commentText.trim();
    setCommentText('');

    try {
      await addCommentMutation.mutateAsync({ productId: id, text: textToSend });
      // On success, we keep the optimistic comment; no refetch needed.
      // But we should update the product's comment count? We can update product detail cache too.
      // Since we don't get the updated count from the backend, we can increment locally.
      // We'll update the product detail cache's commentsCount.
      const currentProduct = queryClient.getQueryData(['productDetail', id]);
      if (currentProduct) {
        queryClient.setQueryData(['productDetail', id], {
          ...currentProduct,
          commentsCount: (currentProduct.commentsCount || 0) + 1,
        });
      }
    } catch (error) {
      // Revert on error
      queryClient.setQueryData(['productComments', id], currentComments);
      toast.error(error.message || 'Failed to post comment');
      setCommentText(optimisticComment.text);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this product?')) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/productstrend/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        await invalidateProductDetail(id);
        await invalidateProductFeed();
        await invalidateMyProducts();
        router.push('/productstrend/my-products');
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete product');
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/productstrend/${id}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // ── Robust date formatter ──
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
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
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  if (isLoading) {
    return (
      <>
        <Meta title="Loading..." />
        <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
          <div className="h-8 w-24 bg-slate-200 rounded-lg mb-6" />
          <div className="w-full aspect-video bg-slate-200 rounded-2xl" />
          <div className="mt-6 space-y-4">
            <div className="h-8 w-64 bg-slate-200 rounded" />
            <div className="h-5 w-full bg-slate-200 rounded" />
            <div className="flex gap-4">
              <div className="h-10 w-24 bg-slate-200 rounded-full" />
              <div className="h-10 w-24 bg-slate-200 rounded-full" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600 font-medium">Product not found.</p>
          <button onClick={() => refetch()} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
            <FiRefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Meta title={`${product.name} – ProductTrend`} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/productstrend/feed" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-purple-600 transition mb-6">
          <FiArrowLeft className="w-4 h-4" /> Back to Feed
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="w-full aspect-video bg-slate-100 overflow-hidden relative">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 80vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-slate-300">🚀</div>
            )}
          </div>

          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{product.name}</h1>
                <p className="text-base text-slate-500 mt-1">{product.tagline}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {product.category && (
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                      {product.category}
                    </span>
                  )}
                  {product.pricing && (
                    <span className={`text-xs font-medium px-3 py-1 rounded-full border ${PRICING_COLORS[product.pricing] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {product.pricing}
                    </span>
                  )}
                  {product.productStatus && (
                    <span className={`text-xs font-medium px-3 py-1 rounded-full border ${STATUS_COLORS[product.productStatus] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {product.productStatus}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleUpvote}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition font-medium text-sm ${
                    product.userVoted
                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-200'
                  }`}
                  disabled={upvoteMutation.isLoading}
                >
                  <FiHeart className={`w-4 h-4 ${product.userVoted ? 'fill-purple-600 text-purple-600' : ''}`} />
                  <span>{product.upvotes || 0}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition text-sm font-medium"
                >
                  {shareCopied ? 'Copied!' : <FiShare2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="w-8 h-8 rounded-full bg-purple-100 overflow-hidden flex-shrink-0">
                {product.maker?.avatar ? (
                  <Image
                    src={product.maker.avatar}
                    alt={product.maker.fullname || 'User'}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-purple-600">
                    <FiUser className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {product.maker?.fullname || product.maker?.username || 'Anonymous'}
                </span>
                <span className="flex items-center gap-1.5">
                  <FiClock className="w-3.5 h-3.5" />
                  Launched {formatDate(product.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <FiMessageCircle className="w-3.5 h-3.5" />
                  {product.commentsCount || 0} comments
                </span>
                {isMaker && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">You are the maker</span>
                )}
                {!isAuthenticated && (
                  <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <FiLock className="w-3 h-3" /> Sign in to upvote
                  </span>
                )}
              </div>
            </div>

            {product.description && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Description</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {product.features && product.features.length > 0 && (
              <div className="mt-6 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <FiList className="text-purple-600" /> Key Features
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-purple-500">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.targetAudience && (
              <div className="mt-4 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                  <FiUsers className="text-indigo-600" /> Target Audience
                </h3>
                <p className="text-sm text-slate-600">{product.targetAudience}</p>
              </div>
            )}

            {product.techStack && product.techStack.length > 0 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <FiCpu className="text-slate-600" /> Tech Stack
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.techStack.map((tech, index) => (
                    <span
                      key={index}
                      className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(product.url || product.websiteTitle || product.websiteDescription || product.demoUrl || product.twitter) && (
              <div className="mt-6 p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <FiGlobe className="text-emerald-600" /> Website & Links
                </h3>
                {product.websiteTitle && (
                  <p className="text-sm text-slate-800 font-medium">{product.websiteTitle}</p>
                )}
                {product.websiteDescription && (
                  <p className="text-sm text-slate-600 mt-1">{product.websiteDescription}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {product.url && (
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 transition text-xs font-medium"
                    >
                      <FiExternalLink className="w-3 h-3" /> Website
                    </a>
                  )}
                  {product.demoUrl && (
                    <a
                      href={product.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition text-xs font-medium"
                    >
                      <FiVideo className="w-3 h-3" /> Demo
                    </a>
                  )}
                  {product.twitter && (
                    <a
                      href={`https://twitter.com/${product.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-sky-500 border border-sky-200 rounded-lg hover:bg-sky-50 transition text-xs font-medium"
                    >
                      <FiTwitter className="w-3 h-3" /> {product.twitter}
                    </a>
                  )}
                </div>
                {product.releaseDate && (
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                    <FiCalendar className="w-3 h-3" />
                    Released: {new Date(product.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                )}
              </div>
            )}

            {isMaker && (
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
                <Link
                  href={`/productstrend/edit/${product.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm hover:bg-slate-200 transition"
                >
                  <FiEdit2 className="w-4 h-4" /> Edit
                </Link>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm hover:bg-red-100 transition"
                >
                  <FiTrash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FiMessageCircle className="text-purple-600" />
            Comments ({comments.length})
          </h3>

          <form onSubmit={handleAddComment} className="mt-4 flex gap-3">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={isAuthenticated ? "Add a comment..." : "Sign in to comment"}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
              disabled={!isAuthenticated || submittingComment}
            />
            <button
              type="submit"
              disabled={!isAuthenticated || !commentText.trim() || submittingComment}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {submittingComment ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />}
            </button>
          </form>
          {!isAuthenticated && (
            <p className="mt-2 text-xs text-slate-400">
              <Link href={`/login?redirect=/productstrend/${id}`} className="text-purple-600 hover:underline">
                Sign in
              </Link> to join the conversation.
            </p>
          )}

          <div className="mt-6 space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6 bg-white rounded-xl border border-slate-100">
                No comments yet. Be the first!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
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
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">
                        {comment.user?.fullname?.[0] || comment.user?.username?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">
                      {comment.user?.fullname || comment.user?.username || 'Anonymous'}
                    </p>
                    <p className="text-sm text-slate-600 mt-0.5">{comment.text}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(comment.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}