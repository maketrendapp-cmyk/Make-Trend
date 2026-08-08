// pages/productstrend/[id].js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
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
  FiX,
} from 'react-icons/fi';
import { FaDiscord, FaTelegram, FaTiktok } from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

const PRICING_COLORS = {
  Free: 'text-emerald-700 bg-emerald-50 border-emerald-200/60',
  Freemium: 'text-blue-700 bg-blue-50 border-blue-200/60',
  Paid: 'text-amber-700 bg-amber-50 border-amber-200/60',
  Enterprise: 'text-purple-700 bg-purple-50 border-purple-200/60',
  'Contact for Pricing': 'text-slate-700 bg-slate-50 border-slate-200/60',
};

const STATUS_COLORS = {
  Live: 'text-emerald-700 bg-emerald-50 border-emerald-200/60',
  Beta: 'text-blue-700 bg-blue-50 border-blue-200/60',
  'Coming Soon': 'text-amber-700 bg-amber-50 border-amber-200/60',
  'In Development': 'text-slate-700 bg-slate-50 border-slate-200/60',
};

// ── URL & Icon Helpers ──
function detectPlatformFromUrl(url) {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
    if (hostname.includes('facebook.com') || hostname.includes('fb.com')) return 'facebook';
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
    if (hostname.includes('instagram.com')) return 'instagram';
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('github.com')) return 'github';
    if (hostname.includes('twitch.tv')) return 'twitch';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (hostname.includes('discord.com') || hostname.includes('discord.gg')) return 'discord';
    if (hostname.includes('t.me') || hostname.includes('telegram.me')) return 'telegram';
    return null;
  } catch {
    return null;
  }
}

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
};

const getSocialIcon = (platformOrUrl) => {
  let platform = platformOrUrl?.toLowerCase();
  if (platformOrUrl && platformOrUrl.startsWith('http')) {
    platform = detectPlatformFromUrl(platformOrUrl);
  }
  return SOCIAL_ICONS[platform] || FiLink;
};

const getFavicon = (url) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
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

// ── Cloudinary optimization ──
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

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateProductDetail, invalidateProductFeed, invalidateMyProducts } = useInvalidateQueries();

  const { data: product, isLoading, isError, refetch } = useProductDetail(id, !!id);
  const {
    data: commentsData,
    fetchNextPage: fetchMoreComments,
    hasNextPage: hasMoreComments,
    isFetchingNextPage: isFetchingMoreComments,
  } = useProductComments(id, true);

  const upvoteMutation = useUpvoteProduct();
  const addCommentMutation = useAddProductComment();

  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  
  // Custom Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // ── Upvote handler ──
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

    const optimisticProduct = { ...currentProduct, upvotes: newUpvotes, userVoted: newUserVoted };

    queryClient.setQueryData(['productDetail', id], optimisticProduct);
    setLocalVote(id, newUserVoted, newUpvotes);
    setLocalUpvote({ voted: newUserVoted, upvotes: newUpvotes });

    upvoteMutation.mutate(id, {
      onSuccess: (data) => {
        const serverVoted = data.action === 'added';
        const serverUpvotes = data.upvotes;
        const current = queryClient.getQueryData(['productDetail', id]);
        if (current) {
          queryClient.setQueryData(['productDetail', id], { ...current, upvotes: serverUpvotes, userVoted: serverVoted });
        }
        setLocalVote(id, serverVoted, serverUpvotes);
        setLocalUpvote({ voted: serverVoted, upvotes: serverUpvotes });
      },
      onError: () => {
        queryClient.setQueryData(['productDetail', id], currentProduct);
        setLocalVote(id, prevUserVoted, prevUpvotes);
        setLocalUpvote({ voted: prevUserVoted, upvotes: prevUpvotes });
        toast.error('Failed to upvote');
      },
    });
  };

  // ── Comment handler ──
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
      user: { username: user?.username || 'You', fullname: user?.fullname || 'You', avatar: user?.avatar || null },
      createdAt: new Date().toISOString(),
    };

    const currentComments = queryClient.getQueryData(['productComments', id]) || { pages: [{ comments: [] }] };
    const updatedPages = [...currentComments.pages];
    if (updatedPages.length > 0) {
      updatedPages[0] = { ...updatedPages[0], comments: [optimisticComment, ...updatedPages[0].comments] };
    } else {
      updatedPages.push({ comments: [optimisticComment], nextCursor: null });
    }
    queryClient.setQueryData(['productComments', id], { ...currentComments, pages: updatedPages });

    const textToSend = commentText.trim();
    setCommentText('');

    try {
      const result = await addCommentMutation.mutateAsync({ productId: id, text: textToSend });
      const serverComment = result.comment;

      const currentCache = queryClient.getQueryData(['productComments', id]);
      if (currentCache) {
        const updatedPages = currentCache.pages.map((page, idx) => {
          if (idx === 0) {
            return {
              ...page,
              comments: page.comments.map(c => c.id === optimisticComment.id ? { ...serverComment, user: serverComment.user || optimisticComment.user } : c),
            };
          }
          return page;
        });
        queryClient.setQueryData(['productComments', id], { ...currentCache, pages: updatedPages });
      }

      const currentProduct = queryClient.getQueryData(['productDetail', id]);
      if (currentProduct) {
        queryClient.setQueryData(['productDetail', id], { ...currentProduct, commentsCount: (currentProduct.commentsCount || 0) + 1 });
      }
    } catch (error) {
      const revertComments = queryClient.getQueryData(['productComments', id]);
      if (revertComments) {
        const revertedPages = revertComments.pages.map((page, idx) => {
          if (idx === 0) return { ...page, comments: page.comments.filter((c) => c.id !== optimisticComment.id) };
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

  // ── Delete Handler ──
  const executeDelete = async () => {
    setIsDeleting(true);
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
        setShowDeleteModal(false);
        router.push('/productstrend/my-products');
        toast.success('Product deleted successfully');
      } else {
        toast.error(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
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
      if (timestamp.toDate && typeof timestamp.toDate === 'function') date = timestamp.toDate();
      else if (timestamp.seconds !== undefined) date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1e6);
      else if (timestamp._seconds !== undefined) date = new Date(timestamp._seconds * 1000);
      else if (typeof timestamp === 'string' || typeof timestamp === 'number') date = new Date(timestamp);
      else if (timestamp instanceof Date) date = timestamp;
      else date = new Date(timestamp);
      
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-5 w-24 bg-slate-200 rounded-lg mb-6" />
        <div className="w-full aspect-[21/9] sm:aspect-[16/6] bg-slate-200 rounded-3xl mb-8" />
        <div className="flex gap-6">
          <div className="w-20 h-20 bg-slate-200 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-4 pt-2">
            <div className="h-8 w-64 bg-slate-200 rounded" />
            <div className="h-5 w-full max-w-lg bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-red-50 border border-red-200 rounded-3xl p-10">
          <p className="text-red-600 font-bold text-lg mb-2">Product not found</p>
          <p className="text-slate-500 text-sm mb-6 font-medium">The product you are looking for does not exist or has been removed.</p>
          <button onClick={() => refetch()} className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition">
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
      <Meta title={`${product.name} – ProductTrend`} description={product.tagline} />
      <div className="min-h-screen bg-slate-50/50 pb-16">
        <div className="max-w-5xl mx-auto px-4 py-8">
          
          <Link href="/productstrend/feed" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition mb-6 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200/60">
            <FiArrowLeft className="w-4 h-4" /> Back to Products
          </Link>

          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm overflow-hidden">
            
            {/* ── Hero Image ── */}
            <div className="w-full aspect-[21/9] sm:aspect-[16/6] bg-slate-100 overflow-hidden relative border-b border-slate-100">
              {(product.thumbnail || product.imageUrl) ? (
                <img
                  src={getOptimizedUrl(product.thumbnail || product.imageUrl, 1200, 675)}
                  alt={product.name}
                  className="w-full h-full object-cover sm:object-contain bg-slate-100"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
                  <span className="text-6xl sm:text-8xl opacity-50">🚀</span>
                </div>
              )}
            </div>

            <div className="p-6 sm:p-10">
              {/* ── Product Header ── */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6 mb-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex-shrink-0 p-1">
                  {product.logo || product.imageUrl ? (
                    <img
                      src={getOptimizedUrl(product.logo || product.imageUrl, 200, 200)}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-50 rounded-xl flex items-center justify-center text-3xl">🚀</div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight">{product.name}</h1>
                  <p className="text-base sm:text-lg text-slate-600 font-medium mt-1.5 leading-snug">{product.tagline}</p>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {product.category && (
                      <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200/60">
                        {product.category}
                      </span>
                    )}
                    {product.pricing && (
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${PRICING_COLORS[product.pricing] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {product.pricing}
                      </span>
                    )}
                    {product.productStatus && (
                      <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${STATUS_COLORS[product.productStatus] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {product.productStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Upvote Box (Desktop Right Aligned) */}
                <div className="w-full sm:w-auto mt-4 sm:mt-0 flex flex-col gap-3">
                   <button
                    onClick={handleUpvote}
                    disabled={upvoteMutation.isLoading}
                    className={`w-full sm:w-auto flex flex-col items-center justify-center gap-1 px-8 py-3 rounded-2xl border-2 transition-all shadow-sm active:scale-95 ${
                      userVoted
                        ? 'bg-purple-50 border-purple-500 text-purple-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    <FiHeart className={`w-6 h-6 ${userVoted ? 'fill-purple-600 text-purple-600' : 'text-slate-400'}`} />
                    <span className="font-bold text-lg leading-none">{upvotes}</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition text-sm font-semibold"
                  >
                    {shareCopied ? 'Link Copied!' : <><FiShare2 className="w-4 h-4" /> Share</>}
                  </button>
                </div>
              </div>

              {/* ── Metadata Bar ── */}
              <div className="flex flex-wrap items-center gap-4 py-4 border-y border-slate-100 text-sm font-medium text-slate-500">
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-purple-600 transition"
                  onClick={() => router.push(`/userinfo/${product.maker?.uid}`)}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100">
                    {product.maker?.avatar ? (
                      <img src={product.maker.avatar} alt="Maker" className="w-full h-full object-cover" />
                    ) : (
                      <FiUser className="w-full h-full p-1" />
                    )}
                  </div>
                  <span>By {product.maker?.fullname || product.maker?.username || 'Maker'}</span>
                  {isMaker && <span className="ml-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md uppercase tracking-wider">You</span>}
                </div>
                <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1.5"><FiCalendar className="w-4 h-4" /> {formatDate(product.createdAt)}</span>
                <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1.5"><FiMessageCircle className="w-4 h-4" /> {product.commentsCount || 0} Comments</span>
              </div>

              {/* ── Main Content Grid ── */}
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column (Description & Video) */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Description */}
                  {product.description && (
                    <div className="prose prose-slate max-w-none">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
                        <FiInfo className="text-purple-600" /> About Product
                      </h3>
                      <p className="text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{product.description}</p>
                    </div>
                  )}

                  {/* Video Embed */}
                  {isVideoLink && (
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
                        <FiPlay className="text-red-500" /> Demo Video
                      </h3>
                      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-black relative w-full aspect-video">
                        <iframe
                          src={videoEmbedUrl}
                          title="Demo"
                          className="absolute top-0 left-0 w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}

                  {/* Website Preview Image (If available and no video) */}
                  {product.websiteImage && !isVideoLink && (
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-3">
                        <FiGlobe className="text-blue-500" /> Preview
                      </h3>
                      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                        <img src={getOptimizedUrl(product.websiteImage, 800, 450)} alt="Preview" className="w-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column (Details & Links) */}
                <div className="space-y-6">
                  
                  {/* Action Links */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-3">
                    {product.url && (
                      <a href={product.url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition shadow-sm">
                        <img src={getFavicon(product.url)} alt="" className="w-4 h-4 rounded-sm bg-white" onError={(e) => e.target.style.display='none'} />
                        Visit Website <FiExternalLink className="w-4 h-4 opacity-70" />
                      </a>
                    )}
                    {product.demoUrl && !isVideoLink && (
                      <a href={product.demoUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold transition shadow-sm">
                        <FiVideo className="w-4 h-4 text-blue-500" /> Watch Demo
                      </a>
                    )}
                  </div>

                  {/* Features */}
                  {product.features?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Key Features</h3>
                      <ul className="space-y-2.5">
                        {product.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                            <FiCheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span className="leading-snug">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tech Stack */}
                  {product.techStack?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Tech Stack</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.techStack.map((tech, idx) => (
                          <span key={idx} className="text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg shadow-sm">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social & Other Links */}
                  {product.socialLinks?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Links</h3>
                      <div className="flex flex-col gap-2">
                        {product.socialLinks.map((link, idx) => {
                          const Icon = getSocialIcon(link.url || link.platform);
                          const favicon = getFavicon(link.url);
                          return (
                            <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-purple-200 hover:shadow transition group">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 group-hover:text-purple-600 group-hover:bg-purple-50 transition">
                                {Icon === FiLink && favicon ? <img src={favicon} alt="" className="w-4 h-4 rounded-sm" /> : <Icon className="w-4 h-4" />}
                              </div>
                              <span className="text-sm font-semibold text-slate-700 group-hover:text-purple-700 transition">
                                {link.platform || 'Visit Link'}
                              </span>
                              <FiExternalLink className="w-3.5 h-3.5 text-slate-300 ml-auto group-hover:text-purple-400 transition" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Maker Actions */}
                  {isMaker && (
                    <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl">
                      <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-3">Maker Controls</h3>
                      <div className="flex gap-2">
                        <Link href={`/productstrend/launch?id=${product.id}`} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-xl text-sm font-semibold hover:bg-amber-50 transition shadow-sm">
                          <FiEdit2 className="w-4 h-4" /> Edit
                        </Link>
                        <button onClick={() => setShowDeleteModal(true)} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition shadow-sm">
                          <FiTrash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>

          {/* ── Comments Section ── */}
          <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
              <FiMessageCircle className="text-purple-600" />
              Discussion ({product.commentsCount || 0})
            </h3>

            <form onSubmit={handleAddComment} className="flex gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 hidden sm:block">
                {user?.avatar ? <img src={user.avatar} alt="You" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><FiUser /></div>}
              </div>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={isAuthenticated ? "What do you think about this product?" : "Sign in to join the discussion"}
                className="flex-1 border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition placeholder-slate-400"
                disabled={!isAuthenticated || submittingComment}
              />
              <button
                type="submit"
                disabled={!isAuthenticated || !commentText.trim() || submittingComment}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 flex items-center gap-2 shadow-sm"
              >
                {submittingComment ? <FiLoader className="w-5 h-5 animate-spin" /> : <><FiSend className="w-4 h-4" /><span className="hidden sm:inline">Post</span></>}
              </button>
            </form>

            <div className="space-y-5">
              {comments.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
                  <FiMessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 font-medium">No comments yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4">
                    <div 
                      className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 cursor-pointer"
                      onClick={() => goToUserProfile(comment.userId)}
                    >
                      {comment.user?.avatar ? (
                        <img src={comment.user.avatar} alt="User" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-slate-500">
                          {comment.user?.fullname?.[0] || comment.user?.username?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none p-4">
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <p 
                            className="text-sm font-bold text-slate-900 cursor-pointer hover:text-purple-600 transition"
                            onClick={() => goToUserProfile(comment.userId)}
                          >
                            {comment.user?.fullname || comment.user?.username || 'Anonymous'}
                          </p>
                          <span className="text-xs text-slate-400 font-medium">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{comment.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {hasMore && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => fetchMoreComments()}
                    disabled={isFetchingMoreComments}
                    className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition text-sm font-semibold disabled:opacity-50 shadow-sm"
                  >
                    {isFetchingMoreComments ? (
                      <span className="flex items-center justify-center gap-2"><FiLoader className="w-4 h-4 animate-spin" /> Loading...</span>
                    ) : (
                      'Load More Comments'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Custom Delete Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 transform scale-100">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <FiTrash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Product?</h3>
            <p className="text-sm text-slate-500 font-medium mb-6 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-700">{product.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? <FiLoader className="w-4 h-4 animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
