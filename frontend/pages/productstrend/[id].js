// pages/productstrend/[id].js
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import {
  useProductDetail,
  useProductComments,
  useUpvoteProduct,
  useAddProductComment,
  useInvalidateQueries,
} from '../../lib/queries';
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
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const { invalidateProductDetail } = useInvalidateQueries();

  const { data: product, isLoading, isError, refetch } = useProductDetail(id, isAuthenticated && !!id);
  const { data: comments = [], refetch: refetchComments } = useProductComments(id, isAuthenticated && !!id);
  const upvoteMutation = useUpvoteProduct();
  const addCommentMutation = useAddProductComment();

  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const isMaker = product?.makerUid === user?.uid;

  const handleUpvote = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/productstrend/' + id);
      return;
    }
    upvoteMutation.mutate(id);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await addCommentMutation.mutateAsync({ productId: id, text: commentText.trim() });
      setCommentText('');
      await refetchComments();
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return 'Recently'; }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="Product Detail" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-8 text-center border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Sign In Required</h2>
            <p className="text-slate-500 text-sm mb-6">Please sign in to view this product.</p>
            <button
              onClick={() => router.push('/login?redirect=/productstrend/' + id)}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition"
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
          {/* Image */}
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

          <div className="p-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
                <p className="text-sm text-slate-500 mt-1">{product.tagline}</p>
                {product.category && (
                  <span className="inline-block mt-2 text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                    {product.category}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleUpvote}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition font-medium ${
                    product.userVoted
                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-200'
                  }`}
                  disabled={upvoteMutation.isLoading}
                >
                  <FiHeart className={`w-4 h-4 ${product.userVoted ? 'fill-purple-600 text-purple-600' : ''}`} />
                  <span>{product.upvotes || 0}</span>
                </button>
                {product.url && (
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition text-sm font-medium"
                  >
                    <FiExternalLink className="w-4 h-4" /> Visit
                  </a>
                )}
              </div>
            </div>

            {/* Maker & meta */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <FiUser className="w-4 h-4" />
                {product.maker?.fullname || product.maker?.username || 'Anonymous'}
              </span>
              <span className="flex items-center gap-1.5">
                <FiClock className="w-4 h-4" />
                Launched on {formatDate(product.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <FiMessageCircle className="w-4 h-4" />
                {product.commentsCount || 0} comments
              </span>
              {isMaker && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">You are the maker</span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Description</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Maker actions */}
            {isMaker && (
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => router.push(`/productstrend/edit/${product.id}`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm hover:bg-slate-200 transition"
                >
                  <FiEdit2 className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this product?')) {
                      // useDeleteProduct mutation here (we'll add soon)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm hover:bg-red-100 transition"
                >
                  <FiTrash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Comments section */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <FiMessageCircle className="text-purple-600" />
            Comments ({comments.length})
          </h3>

          <form onSubmit={handleAddComment} className="mt-4 flex gap-3">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
              disabled={submittingComment}
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {submittingComment ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No comments yet. Be the first!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                    {comment.user?.fullname?.[0] || comment.user?.username?.[0] || 'U'}
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