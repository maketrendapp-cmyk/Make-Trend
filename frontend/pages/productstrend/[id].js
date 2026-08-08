// pages/productstrend/[id].js
import React, { useState, useEffect, useRef } from 'react';
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
  FiLink,
  FiGithub,
  FiInstagram,
  FiFacebook,
  FiYoutube,
  FiTwitch,
  FiLinkedin,
  FiCode,
  FiShoppingBag,
  FiPlay,
} from 'react-icons/fi';
import { FaRocket, FaDiscord, FaTelegram, FaTiktok } from 'react-icons/fa';

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

// ── localStorage helpers ──
const getLocalVote = (productId) => {
  try {
    const raw = localStorage.getItem(`upvote_${productId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
};

const setLocalVote = (productId, voted, upvotes) => {
  try {
    localStorage.setItem(`upvote_${productId}`, JSON.stringify({ voted, upvotes }));
  } catch (e) {}
};

// ── Cloudinary image optimization ──
const getOptimizedUrl = (url, width = 1200, height = 675) => {
  if (!url) return url;
  if (url.includes('res.cloudinary.com')) {
    const base = url.split('/upload/')[0] + '/upload/';
    const rest = url.split('/upload/')[1] || '';
    const cleanRest = rest.replace(/^[^/]+_/g, '');
    return `${base}w_${width},h_${height},c_limit,q_auto,f_auto/${cleanRest}`;
  }
  return url;
};

// ── Video embed detection ──
const getVideoEmbedUrl = (url) => {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
};

const SOCIAL_ICONS = {
  twitter: FiTwitter,
  facebook: FiFacebook,
  instagram: FiInstagram,
  linkedin: FiLinkedin,
  youtube: FiYoutube,
  tiktok: FaTiktok,
  github: FiGithub,
  discord: FaDiscord,
  telegram: FaTelegram,
  twitch: FiTwitch,
  other: FiLink,
};

const getSocialIcon = (platform) => {
  const Icon = SOCIAL_ICONS[platform?.toLowerCase()] || FiLink;
  return Icon;
};

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateProductDetail, invalidateProductFeed, invalidateMyProducts, invalidateProductComments } = useInvalidateQueries();

  const { data: product, isLoading, isError, refetch } = useProductDetail(id, !!id);
  const {
    data: commentsData,
    fetchNextPage: fetchMoreComments,
    hasNextPage: hasMoreComments,
    isFetchingNextPage: isFetchingMoreComments,
    refetch: refetchComments,
  } = useProductComments(id, true);

  const upvoteMutation = useUpvoteProduct();
  const addCommentMutation = useAddProductComment();

  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const isMaker = product?.makerUid === user?.uid;

  const comments = commentsData?.pages?.flatMap((page) => page.comments) || [];
  const hasMore = hasMoreComments;

  // ── Local upvote state ──
  const [localUpvote, setLocalUpvote] = useState(null);
  useEffect(() => {
    if (id && !product) {
      const stored = getLocalVote(id);
      if (stored) setLocalUpvote(stored);
    }
  }, [id, product]);

  useEffect(() => {
    if (product && product.userVoted !== undefined) {
      const stored = getLocalVote(id);
      if (!stored || stored.voted !== product.userVoted || stored.upvotes !== product.upvotes) {
        setLocalVote(id, product.userVoted, product.upvotes);
        setLocalUpvote({ voted: product.userVoted, upvotes: product.upvotes });
      }
    }
  }, [product, id]);

  const currentUpvote = product ? { voted: product.userVoted, upvotes: product.upvotes } : localUpvote;
  const userVoted = currentUpvote?.voted ?? false;
  const upvotes = currentUpvote?.upvotes ?? 0;

  // ── Robust upvote handler ──
  const handleUpvote = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/productstrend/' + id);
      return;
    }

    const currentProduct = product;
    if (!currentProduct) return;

    const prevUpvotes = currentProduct.upvotes || 0;
    const prevUserVoted = currentProduct.userVoted || false;
    const newUserVoted = !prevUserVoted;
    const newUpvotes = newUserVoted ? prevUpvotes + 1 : prevUpvotes - 1;

    const optimisticProduct = {
      ...currentProduct,
      upvotes: newUpvotes,
      userVoted: newUserVoted,
    };

    // Optimistic update
    queryClient.setQueryData(['productDetail', id], optimisticProduct);
    setLocalVote(id, newUserVoted, newUpvotes);
    setLocalUpvote({ voted: newUserVoted, upvotes: newUpvotes });

    upvoteMutation.mutate(id, {
      onSuccess: (data) => {
        const serverVoted = data.action === 'added';
        const serverUpvotes = data.upvotes;
        const current = queryClient.getQueryData(['productDetail', id]);
        if (current) {
          queryClient.setQueryData(['productDetail', id], {
            ...current,
            upvotes: serverUpvotes,
            userVoted: serverVoted,
          });
        }
        setLocalVote(id, serverVoted, serverUpvotes);
        setLocalUpvote({ voted: serverVoted, upvotes: serverUpvotes });
      },
      onError: () => {
        // Revert
        queryClient.setQueryData(['productDetail', id], currentProduct);
        setLocalVote(id, prevUserVoted, prevUpvotes);
        setLocalUpvote({ voted: prevUserVoted, upvotes: prevUpvotes });
        toast.error('Failed to upvote');
      },
    });
  };

  // ── Comment handler with server‑sync update ──
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/productstrend/' + id);
      return;
    }

    setSubmittingComment(true);

    // Optimistically add comment (temporary ID)
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

    const currentComments = queryClient.getQueryData(['productComments', id]) || { pages: [{ comments: [] }] };
    const updatedPages = [...currentComments.pages];
    if (updatedPages.length > 0) {
      updatedPages[0] = {
        ...updatedPages[0],
        comments: [optimisticComment, ...updatedPages[0].comments],
      };
    } else {
      updatedPages.push({ comments: [optimisticComment], nextCursor: null });
    }
    queryClient.setQueryData(['productComments', id], { ...currentComments, pages: updatedPages });

    const textToSend = commentText.trim();
    setCommentText('');

    try {
      const result = await addCommentMutation.mutateAsync({ productId: id, text: textToSend });
      const serverComment = result.comment;

      // Replace optimistic comment with server comment in cache
      const currentCache = queryClient.getQueryData(['productComments', id]);
      if (currentCache) {
        const updatedPages = currentCache.pages.map((page, idx) => {
          if (idx === 0) {
            return {
              ...page,
              comments: page.comments.map(c =>
                c.id === optimisticComment.id ? { ...serverComment, user: serverComment.user || optimisticComment.user } : c
              ),
            };
          }
          return page;
        });
        queryClient.setQueryData(['productComments', id], { ...currentCache, pages: updatedPages });
      }

      // Update product commentsCount
      const currentProduct = queryClient.getQueryData(['productDetail', id]);
      if (currentProduct) {
        queryClient.setQueryData(['productDetail', id], {
          ...currentProduct,
          commentsCount: (currentProduct.commentsCount || 0) + 1,
        });
      }
    } catch (error) {
      // Revert optimistic comment
      const revertComments = queryClient.getQueryData(['productComments', id]);
      if (revertComments) {
        const revertedPages = revertComments.pages.map((page, idx) => {
          if (idx === 0) {
            return {
              ...page,
              comments: page.comments.filter((c) => c.id !== optimisticComment.id),
            };
          }
          return page;
        });
        queryClient.setQueryData(['productComments', id], { ...revertComments, pages: revertedPages });
      }
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

  // ── Navigate to user profile ──
  const goToUserProfile = (uid) => {
    if (uid) {
      router.push(`/userinfo/${uid}`);
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

  const videoEmbedUrl = getVideoEmbedUrl(product.demoUrl);
  const isVideoLink = !!videoEmbedUrl;

  return (
    <>
      <Meta title={`${product.name} – ProductTrend`} />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/productstrend/feed" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-purple-600 transition mb-6">
          <FiArrowLeft className="w-4 h-4" /> Back to Feed
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* ── Hero Image ── */}
          <div className="w-full aspect-[16/9] bg-slate-100 overflow-hidden relative">
            {(product.thumbnail || product.imageUrl) ? (
              <Image
                src={getOptimizedUrl(product.thumbnail || product.imageUrl, 1200, 675)}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 70vw"
                className="object-contain"
                priority
                quality={90}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-slate-300">🚀</div>
            )}
          </div>

          <div className="p-6 md:p-8">
            {/* ── Product header ── */}
            <div className="flex items-start gap-4 mb-4">
              {product.logo ? (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-100 overflow-hidden border-2 border-slate-200 shadow-sm flex-shrink-0">
                  <Image
                    src={getOptimizedUrl(product.logo, 200, 200)}
                    alt={product.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    quality={90}
                  />
                </div>
              ) : product.imageUrl ? (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                  <Image
                    src={getOptimizedUrl(product.imageUrl, 200, 200)}
                    alt={product.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    quality={90}
                  />
                </div>
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-slate-100 flex items-center justify-center text-4xl text-slate-300 border border-slate-200 flex-shrink-0">🚀</div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{product.name}</h1>
                <p className="text-base text-slate-500 mt-1">{product.tagline}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {product.category && (
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{product.category}</span>
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
                  {product.referralCode && (
                    <span className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">🔗 {product.referralCode}</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Upvote & Share ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-2 mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUpvote}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition font-medium text-sm ${
                    userVoted
                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-purple-50 hover:border-purple-200'
                  }`}
                  disabled={upvoteMutation.isLoading}
                >
                  <FiHeart className={`w-4 h-4 ${userVoted ? 'fill-purple-600 text-purple-600' : ''}`} />
                  <span>{upvotes}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition text-sm font-medium"
                >
                  {shareCopied ? 'Copied!' : <FiShare2 className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5"><FiClock className="w-3.5 h-3.5" /> Launched {formatDate(product.createdAt)}</span>
                <span className="flex items-center gap-1.5"><FiMessageCircle className="w-3.5 h-3.5" /> {product.commentsCount || 0} comments</span>
                {isMaker && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Maker</span>}
                {!isAuthenticated && (
                  <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <FiLock className="w-3 h-3" /> Sign in to upvote
                  </span>
                )}
              </div>
            </div>

            {/* ── Maker info (clickable) ── */}
            <div 
              className="flex items-center gap-3 pt-4 border-t border-slate-100 cursor-pointer hover:bg-slate-50/50 rounded-xl p-2 -mx-2 transition"
              onClick={() => goToUserProfile(product.maker?.uid)}
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 overflow-hidden flex-shrink-0">
                {product.maker?.avatar ? (
                  <Image src={product.maker.avatar} alt={product.maker.fullname || 'User'} width={32} height={32} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-purple-600"><FiUser className="w-4 h-4" /></div>
                )}
              </div>
              <span className="font-medium text-slate-700 text-sm hover:text-purple-600 transition">
                {product.maker?.fullname || product.maker?.username || 'Anonymous'}
              </span>
              <span className="text-xs text-slate-400">(View Profile)</span>
            </div>

            {/* ── Description ── */}
            {product.description && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Description</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* ── Video embed ── */}
            {isVideoLink && (
              <div className="mt-6 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <div className="relative w-full aspect-video bg-black">
                  <iframe
                    src={videoEmbedUrl}
                    title={`${product.name} – Demo`}
                    className="absolute top-0 left-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </div>
            )}

            {/* ── Features ── */}
            {product.features && product.features.length > 0 && (
              <div className="mt-6 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><FiList className="text-purple-600" /> Key Features</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-700"><span className="text-purple-500">•</span>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Website & Links ── */}
            {(product.url || product.websiteTitle || product.websiteDescription || product.websiteImage || product.demoUrl || product.twitter || product.referralCode) && (
              <div className="mt-6 p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><FiGlobe className="text-emerald-600" /> Website & Links</h3>
                {product.websiteTitle && <p className="text-sm text-slate-800 font-medium">{product.websiteTitle}</p>}
                {product.websiteDescription && <p className="text-sm text-slate-600 mt-1">{product.websiteDescription}</p>}
                {product.websiteImage && (
                  <div className="mt-2 w-32 h-20 rounded-lg overflow-hidden border border-slate-200">
                    <Image src={getOptimizedUrl(product.websiteImage, 200, 120)} alt="Website preview" width={128} height={80} className="w-full h-full object-cover" quality={80} />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {product.url && <a href={product.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 transition text-xs font-medium"><FiExternalLink className="w-3 h-3" /> Website</a>}
                  {product.demoUrl && !isVideoLink && <a href={product.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition text-xs font-medium"><FiVideo className="w-3 h-3" /> Demo</a>}
                  {product.twitter && <a href={`https://twitter.com/${product.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-sky-500 border border-sky-200 rounded-lg hover:bg-sky-50 transition text-xs font-medium"><FiTwitter className="w-3 h-3" /> {product.twitter}</a>}
                  {product.referralCode && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium"><FiLink className="w-3 h-3" /> Referral: {product.referralCode}</span>}
                </div>
                {product.releaseDate && <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5"><FiCalendar className="w-3 h-3" /> Released: {new Date(product.releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
              </div>
            )}

            {/* ── Social Links ── */}
            {product.socialLinks && product.socialLinks.length > 0 && (
              <div className="mt-6 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><FiUsers className="text-indigo-600" /> Social Links</h3>
                <div className="flex flex-wrap gap-3">
                  {product.socialLinks.map((link, index) => {
                    const Icon = getSocialIcon(link.platform);
                    return (
                      <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition text-xs font-medium">
                        <Icon className="w-3.5 h-3.5 text-indigo-600" /> {link.platform}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Target Audience ── */}
            {product.targetAudience && (
              <div className="mt-6 p-4 bg-cyan-50/60 rounded-xl border border-cyan-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><FiUsers className="text-cyan-600" /> Target Audience</h3>
                <p className="text-sm text-slate-600">{product.targetAudience}</p>
              </div>
            )}

            {/* ── Tech Stack ── */}
            {product.techStack && product.techStack.length > 0 && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><FiCpu className="text-slate-600" /> Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {product.techStack.map((tech, index) => (
                    <span key={index} className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1 rounded-full">{tech}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Maker actions ── */}
            {isMaker && (
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
                <Link href={`/productstrend/launch?id=${product.id}`} className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm hover:bg-slate-200 transition"><FiEdit2 className="w-4 h-4" /> Edit</Link>
                <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm hover:bg-red-100 transition"><FiTrash2 className="w-4 h-4" /> Delete</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Comments Section ── */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <FiMessageCircle className="text-purple-600" />
            Comments ({product.commentsCount || 0})
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
              <Link href={`/login?redirect=/productstrend/${id}`} className="text-purple-600 hover:underline">Sign in</Link> to join the conversation.
            </p>
          )}

          {/* ── Comments List ── */}
          <div className="mt-6 space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6 bg-white rounded-xl border border-slate-100">No comments yet. Be the first!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                    {comment.user?.avatar ? (
                      <Image src={comment.user.avatar} alt={comment.user.fullname || 'User'} width={32} height={32} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-600">
                        {comment.user?.fullname?.[0] || comment.user?.username?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{comment.user?.fullname || comment.user?.username || 'Anonymous'}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{comment.text}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(comment.createdAt)}</p>
                  </div>
                </div>
              ))
            )}

            {/* ── Load More ── */}
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={() => fetchMoreComments()}
                  disabled={isFetchingMoreComments}
                  className="px-6 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-100 transition text-sm font-medium disabled:opacity-50"
                >
                  {isFetchingMoreComments ? (
                    <span className="flex items-center gap-2"><FiLoader className="w-4 h-4 animate-spin" /> Loading...</span>
                  ) : (
                    'Load More Comments'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}