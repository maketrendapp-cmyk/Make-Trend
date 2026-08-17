// pages/productstrend/feed.js
import React, { useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import {
  useProductFeed,
  useUpvoteProduct,
  useInvalidateQueries,
} from '../../lib/queries';
import toast from 'react-hot-toast';
import {
  FiTrendingUp,
  FiHeart,
  FiUser,
  FiChevronDown,
  FiSearch,
  FiX,
  FiLoader,
  FiRefreshCw,
  FiClock,
  FiMessageCircle,
  FiBox,
} from 'react-icons/fi';

const CATEGORIES = ['All', 'Tech', 'Design', 'AI', 'Productivity', 'Education', 'Health', 'Fitness', 'Gaming', 'Other'];

// ── Helper: format date ──
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
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

// ── Product Card Component ──
const ProductCard = React.forwardRef(({
  product,
  isFeatured = false,
  rank = null,
  onUpvote,
  isAuthenticated,
  isUpvoting,
}, ref) => {
  const isLiked = product.userVoted || false;
  const upvotes = product.upvotes || 0;
  const hasImage = !!(product.logo || product.imageUrl);

  let cardClasses = 'bg-white rounded-2xl border p-4 hover:shadow-md transition flex items-center gap-4';
  let badge = null;

  if (isFeatured && rank) {
    if (rank === 1) {
      cardClasses += ' border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-md';
      badge = (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900">
          👑 #1
        </span>
      );
    } else if (rank === 2) {
      cardClasses += ' border-slate-400 bg-gradient-to-br from-slate-50 to-gray-100 shadow-md';
      badge = (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-300 text-slate-700">
          🥈 #2
        </span>
      );
    } else if (rank === 3) {
      cardClasses += ' border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md';
      badge = (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-300 text-orange-800">
          🥉 #3
        </span>
      );
    } else {
      cardClasses += ' border-purple-200 bg-gradient-to-br from-purple-50/50 to-white';
      badge = (
        <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
          #{rank}
        </span>
      );
    }
  } else {
    cardClasses += ' border-slate-200';
  }

  return (
    <div ref={ref} className={cardClasses}>
      {/* Image / Logo */}
      <Link href={`/productstrend/${product.id}`} className="flex-shrink-0">
        {hasImage ? (
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center">
            <Image
              src={product.logo || product.imageUrl}
              alt={product.name}
              width={64}
              height={64}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                const parent = e.target.parentElement;
                if (parent) {
                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-3xl text-slate-300"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>`;
                }
              }}
            />
          </div>
        ) : (
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl text-slate-400 border border-slate-200 shadow-sm">
            <FiBox className="w-7 h-7" />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/productstrend/${product.id}`} className="block">
              <h3 className="font-semibold text-slate-900 text-base hover:text-purple-600 transition truncate">
                {product.name}
              </h3>
            </Link>
            {isFeatured && badge && (
              <div className="flex items-center gap-2 mt-0.5">
                {badge}
                <span className="text-xs text-purple-400">🔥 Featured</span>
              </div>
            )}
          </div>
          <button
            onClick={() => onUpvote(product.id)}
            disabled={!isAuthenticated || isUpvoting}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition text-xs font-medium flex-shrink-0 ${
              isLiked
                ? 'bg-purple-100 border-purple-300 text-purple-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-purple-50 hover:border-purple-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <FiHeart className={`w-3.5 h-3.5 ${isLiked ? 'fill-purple-600 text-purple-600' : ''}`} />
            <span>{upvotes}</span>
          </button>
        </div>

        <p className="text-sm text-slate-500 line-clamp-2 mt-1">{product.tagline}</p>

        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {product.maker?.avatar ? (
                <Image
                  src={product.maker.avatar}
                  alt={product.maker.username || 'User'}
                  width={20}
                  height={20}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FiUser className="w-3 h-3 text-slate-500" />
              )}
            </span>
            <span className="font-medium text-slate-600">
              {product.maker?.username || 'Anonymous'}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <FiClock className="w-3 h-3" />
            {formatDate(product.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <FiMessageCircle className="w-3 h-3" />
            {product.commentsCount || 0}
          </span>
          {product.category && (
            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {product.category}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
ProductCard.displayName = 'ProductCard';

export default function ProductTrendFeed() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateProductFeed } = useInvalidateQueries();

  // ── Filter state ──
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('most-upvoted');

  // ── Memoize backend filters for regular feed ──
  const regularFilters = useMemo(() => {
    const filters = {};
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (category !== 'All') filters.category = category;
    filters.sort = 'newest';
    return filters;
  }, [searchQuery, category]);

  // ── Featured filters (top 100 most-upvoted) ──
  const featuredFilters = useMemo(() => {
    const filters = {};
    if (category !== 'All') filters.category = category;
    filters.sort = 'most-upvoted';
    filters.limit = 100;
    return filters;
  }, [category]);

  // ── React Query: Featured feed ──
  const {
    data: featuredData,
    isLoading: featuredLoading,
    refetch: refetchFeatured,
  } = useProductFeed(featuredFilters, true);

  const featuredProducts = featuredData?.pages?.[0]?.products || [];
  const featuredIds = useMemo(() => new Set(featuredProducts.map(p => p.id)), [featuredProducts]);

  // ── React Query: Regular feed (newest) ──
  const {
    data: regularData,
    fetchNextPage,
    hasNextPage,
    isLoading: regularLoading,
    isFetchingNextPage,
    refetch: refetchRegular,
    isError: regularError,
  } = useProductFeed(regularFilters, true);

  const regularProductsAll = regularData?.pages?.flatMap((page) => page.products) || [];
  const regularProducts = useMemo(() => {
    return regularProductsAll.filter(p => !featuredIds.has(p.id));
  }, [regularProductsAll, featuredIds]);

  const hasMore = hasNextPage;
  const isLoading = featuredLoading && regularLoading && !regularProductsAll.length && !featuredProducts.length;
  const isError = regularError && !regularProducts.length;

  // ── Upvote mutation ──
  const upvoteMutation = useUpvoteProduct();

  // ── Intersection Observer for regular feed ──
  const observerRef = useRef(null);
  const lastElementRef = useCallback(
    (node) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasMore, fetchNextPage]
  );

  // ── Scroll to top ──
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Clear all filters ──
  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setCategory('All');
    setSortBy('most-upvoted');
    scrollToTop();
  };

  // ── Trigger backend search ──
  const triggerSearch = () => {
    if (searchInput.trim() !== searchQuery.trim()) {
      setSearchQuery(searchInput);
      scrollToTop();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerSearch();
    }
  };

  const handleCategoryChange = (val) => {
    setCategory(val);
    scrollToTop();
  };

  const handleSortChange = (val) => {
    setSortBy(val);
    scrollToTop();
  };

  // ── Simple upvote handler (updates both caches if product exists) ──
  const handleUpvote = (productId) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/productstrend/feed');
      return;
    }

    // Find product in regular feed
    let currentProduct = null;
    let currentPage = null;
    let pageIndex = -1;
    let productIndex = -1;

    if (regularData?.pages) {
      for (let i = 0; i < regularData.pages.length; i++) {
        const page = regularData.pages[i];
        const idx = page.products.findIndex(p => p.id === productId);
        if (idx !== -1) {
          currentProduct = page.products[idx];
          currentPage = page;
          pageIndex = i;
          productIndex = idx;
          break;
        }
      }
    }

    // If not in regular, check featured
    let isFeaturedCache = false;
    if (!currentProduct && featuredData?.pages) {
      const page = featuredData.pages[0];
      const idx = page.products.findIndex(p => p.id === productId);
      if (idx !== -1) {
        currentProduct = page.products[idx];
        currentPage = page;
        pageIndex = 0;
        productIndex = idx;
        isFeaturedCache = true;
      }
    }

    if (!currentProduct) {
      toast.error('Product not found in cache');
      return;
    }

    // Toggle
    const prevUpvotes = currentProduct.upvotes || 0;
    const prevUserVoted = currentProduct.userVoted || false;
    const newUserVoted = !prevUserVoted;
    const newUpvotes = newUserVoted ? prevUpvotes + 1 : prevUpvotes - 1;

    const updatedProduct = {
      ...currentProduct,
      upvotes: newUpvotes,
      userVoted: newUserVoted,
    };

    // ── Update localStorage ──
    setLocalVote(productId, newUserVoted, newUpvotes);

    // ── Update the cache where the product was found ──
    const feedKey = isFeaturedCache ? ['productFeed', featuredFilters] : ['productFeed', regularFilters];
    const feedData = queryClient.getQueryData(feedKey);
    if (feedData) {
      const newPages = feedData.pages.map((page, idx) => {
        if (idx === pageIndex) {
          return {
            ...page,
            products: page.products.map((p, pIdx) =>
              pIdx === productIndex ? updatedProduct : p
            ),
          };
        }
        return page;
      });
      queryClient.setQueryData(feedKey, { ...feedData, pages: newPages });
    }

    // ── Also update the other cache if the product exists there ──
    const otherKey = isFeaturedCache ? ['productFeed', regularFilters] : ['productFeed', featuredFilters];
    const otherData = queryClient.getQueryData(otherKey);
    if (otherData) {
      const otherPages = otherData.pages.map((page) => {
        const idx = page.products.findIndex(p => p.id === productId);
        if (idx !== -1) {
          const newProducts = [...page.products];
          newProducts[idx] = updatedProduct;
          return { ...page, products: newProducts };
        }
        return page;
      });
      queryClient.setQueryData(otherKey, { ...otherData, pages: otherPages });
    }

    // ── Update product detail cache ──
    queryClient.setQueryData(['productDetail', productId], updatedProduct);

    // ── Call the mutation ──
    upvoteMutation.mutate(productId, {
      onSuccess: (result) => {
        const serverVoted = result.action === 'added';
        const serverUpvotes = result.upvotes;
        const finalProduct = { ...currentProduct, upvotes: serverUpvotes, userVoted: serverVoted };

        // Update both caches with server values
        [['productFeed', regularFilters], ['productFeed', featuredFilters]].forEach((key) => {
          const cache = queryClient.getQueryData(key);
          if (cache) {
            const newPages = cache.pages.map((page) => {
              const idx = page.products.findIndex(p => p.id === productId);
              if (idx !== -1) {
                const newProducts = [...page.products];
                newProducts[idx] = finalProduct;
                return { ...page, products: newProducts };
              }
              return page;
            });
            queryClient.setQueryData(key, { ...cache, pages: newPages });
          }
        });

        // Update detail cache
        queryClient.setQueryData(['productDetail', productId], finalProduct);
        setLocalVote(productId, serverVoted, serverUpvotes);
      },
      onError: () => {
        // Revert both caches
        const revertProduct = { ...currentProduct, upvotes: prevUpvotes, userVoted: prevUserVoted };
        [['productFeed', regularFilters], ['productFeed', featuredFilters]].forEach((key) => {
          const cache = queryClient.getQueryData(key);
          if (cache) {
            const newPages = cache.pages.map((page) => {
              const idx = page.products.findIndex(p => p.id === productId);
              if (idx !== -1) {
                const newProducts = [...page.products];
                newProducts[idx] = revertProduct;
                return { ...page, products: newProducts };
              }
              return page;
            });
            queryClient.setQueryData(key, { ...cache, pages: newPages });
          }
        });
        queryClient.setQueryData(['productDetail', productId], revertProduct);
        setLocalVote(productId, prevUserVoted, prevUpvotes);
        toast.error('Failed to upvote');
      },
    });
  };

  // ── Loading state ──
  if (isLoading && !featuredProducts.length && !regularProducts.length) {
    return (
      <>
        <Meta title="Product Feed – ProductTrend" />
        <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6" />
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="h-10 w-48 bg-slate-200 rounded-xl" />
            <div className="h-10 w-32 bg-slate-200 rounded-xl" />
            <div className="h-10 w-32 bg-slate-200 rounded-xl" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 h-24" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (isError && !regularProducts.length && !featuredProducts.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600 font-medium">Failed to load products.</p>
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

  const hasFeatured = featuredProducts.length > 0;

  return (
    <>
      <Meta title="Product Feed – ProductTrend" description="Discover and upvote the latest products." />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FiTrendingUp className="text-purple-600" />
            Product Feed
          </h1>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => router.push('/productstrend/launch')}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition shadow-sm text-sm"
                >
                  Launch Product
                </button>
                <button
                  onClick={() => router.push('/productstrend/my-products')}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition text-sm"
                >
                  My Products
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login?redirect=/productstrend/feed')}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition text-sm"
              >
                Sign In to Upvote
              </button>
            )}
          </div>
        </div>

        {/* ── Search & Filters ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search products..."
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
                onClick={triggerSearch}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium flex items-center gap-1.5 whitespace-nowrap"
              >
                <FiSearch className="w-4 h-4" /> Search
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition cursor-pointer"
                >
                  <option value="most-upvoted">Most Upvoted</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="most-commented">Most Comments</option>
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Active filters chips */}
          {(searchQuery || category !== 'All' || sortBy !== 'most-upvoted') && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap gap-2">
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full">
                    Search: {searchQuery}
                    <FiX className="w-3 h-3 cursor-pointer" onClick={() => { setSearchInput(''); setSearchQuery(''); }} />
                  </span>
                )}
                {category !== 'All' && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full">
                    {category}
                    <FiX className="w-3 h-3 cursor-pointer" onClick={() => setCategory('All')} />
                  </span>
                )}
                {sortBy !== 'most-upvoted' && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full">
                    {sortBy.replace('-', ' ')}
                    <FiX className="w-3 h-3 cursor-pointer" onClick={() => setSortBy('most-upvoted')} />
                  </span>
                )}
              </div>
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* ── FEATURED PRODUCTS (Top 100) ── */}
        {hasFeatured && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <FiTrendingUp className="text-purple-600 text-xl" />
              <h2 className="text-lg font-bold text-slate-900">🔥 Featured</h2>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Top {featuredProducts.length}
              </span>
            </div>
            <div className="space-y-4">
              {featuredProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFeatured
                  rank={idx + 1}
                  onUpvote={handleUpvote}
                  isAuthenticated={isAuthenticated}
                  isUpvoting={upvoteMutation.isLoading}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── REGULAR PRODUCTS (Newest) ── */}
        <div>
          {regularProducts.length === 0 && !regularLoading && !isFetchingNextPage ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-slate-900">
                {hasFeatured ? 'No more products' : 'No products found'}
              </h3>
              <p className="text-slate-500 text-sm">
                {searchQuery
                  ? 'No results match your search. Try adjusting your query.'
                  : isAuthenticated
                  ? 'Be the first to launch a product!'
                  : 'Sign in to join the community.'}
              </p>
              {isAuthenticated && !searchQuery && (
                <button
                  onClick={() => router.push('/productstrend/launch')}
                  className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
                >
                  Launch Product
                </button>
              )}
            </div>
          ) : (
            <div>
              {hasFeatured && regularProducts.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-slate-900">📰 Recent</h2>
                </div>
              )}
              <div className="space-y-4">
                {regularProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isFeatured={false}
                    onUpvote={handleUpvote}
                    isAuthenticated={isAuthenticated}
                    isUpvoting={upvoteMutation.isLoading}
                    ref={index === regularProducts.length - 1 ? lastElementRef : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {hasMore && (
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

          {!hasMore && regularProducts.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-6">
              You've reached the end 🎉
            </p>
          )}
        </div>
      </div>
    </>
  );
}