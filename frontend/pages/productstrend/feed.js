// pages/productstrend/feed.js
import React, { useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import { useProductFeed, useUpvoteProduct } from '../../lib/queries';
import toast from 'react-hot-toast';
import {
  FiTrendingUp,
  FiHeart,
  FiUser,
  FiChevronDown,
  FiSearch,
  FiX,
  FiLoader,
  FiClock,
  FiMessageCircle,
  FiBox,
  FiPlus,
  FiFilter,
  FiRefreshCw,
} from 'react-icons/fi';
import { FaFire } from 'react-icons/fa';

const CATEGORIES = ['All', 'Tech', 'Design', 'AI', 'Productivity', 'Education', 'Health', 'Fitness', 'Gaming', 'Other'];

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

const ProductCard = React.forwardRef(({
  product,
  isFeatured = false,
  rank = null,
  onUpvote,
  isAuthenticated,
  isUpvoting,
}, ref) => {
  const [imgFailed, setImgFailed] = useState(false);
  const isLiked = product.userVoted || false;
  const upvotes = product.upvotes || 0;
  const hasImage = !!(product.logo || product.imageUrl) && !imgFailed;

  let cardClasses = 'bg-white rounded-3xl border p-5 sm:p-6 hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 group';
  let badge = null;

  if (isFeatured && rank) {
    if (rank === 1) {
      cardClasses += ' border-amber-300 bg-gradient-to-br from-amber-50/50 to-white shadow-md';
      badge = <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm">👑 #1</span>;
    } else if (rank === 2) {
      cardClasses += ' border-slate-300 bg-gradient-to-br from-slate-50 to-white shadow-sm';
      badge = <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">🥈 #2</span>;
    } else if (rank === 3) {
      cardClasses += ' border-orange-300 bg-gradient-to-br from-orange-50 to-white shadow-sm';
      badge = <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-200 text-orange-800">🥉 #3</span>;
    } else {
      cardClasses += ' border-purple-200 bg-gradient-to-br from-purple-50/30 to-white';
      badge = <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">#{rank}</span>;
    }
  } else {
    cardClasses += ' border-slate-200/80';
  }

  return (
    <div ref={ref} className={cardClasses}>
      <Link href={`/productstrend/${product.id}`} className="flex-shrink-0 flex sm:block justify-between items-center">
        {hasImage ? (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
            <img
              src={product.logo || product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          </div>
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl text-slate-400 border border-slate-200 shadow-sm group-hover:scale-105 transition-transform">
            <FiBox className="w-8 h-8" />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Link href={`/productstrend/${product.id}`} className="block min-w-0">
              <h3 className="font-extrabold text-slate-900 text-lg hover:text-purple-600 transition truncate">
                {product.name}
              </h3>
            </Link>
            {isFeatured && badge && (
              <div className="flex items-center gap-2">
                {badge}
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Featured</span>
              </div>
            )}
          </div>

          <p className="text-sm font-medium text-slate-500 line-clamp-2 leading-relaxed mb-3">
            {product.tagline}
          </p>

          <div className="flex items-center gap-3 text-[11px] sm:text-xs font-semibold text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
              <span className="w-4 h-4 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {product.maker?.avatar ? (
                  <img src={product.maker.avatar} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="w-2.5 h-2.5 text-slate-500" />
                )}
              </span>
              <span className="text-slate-600 truncate max-w-[100px]">{product.maker?.username || 'Anonymous'}</span>
            </span>
            <span className="flex items-center gap-1.5"><FiMessageCircle className="w-3.5 h-3.5" />{product.commentsCount || 0}</span>
            {product.category && (
              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200/60">{product.category}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => onUpvote(product.id)}
          disabled={!isAuthenticated || isUpvoting}
          className={`flex sm:flex-col items-center justify-center gap-2 sm:gap-1 px-5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border-2 transition-all font-bold flex-shrink-0 active:scale-95 shadow-sm ${
            isLiked
              ? 'bg-purple-50 border-purple-500 text-purple-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50/50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <FiHeart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-purple-600 text-purple-600' : 'text-slate-400'}`} />
          <span className="text-sm sm:text-base leading-none">{upvotes}</span>
        </button>
      </div>
    </div>
  );
});
ProductCard.displayName = 'ProductCard';

export default function ProductTrendFeed() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('most-upvoted');

  const regularFilters = useMemo(() => {
    const filters = {};
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (category !== 'All') filters.category = category;
    filters.sort = sortBy;
    return filters;
  }, [searchQuery, category, sortBy]);

  const featuredFilters = useMemo(() => {
    const filters = {};
    if (category !== 'All') filters.category = category;
    filters.sort = 'most-upvoted';
    filters.limit = 100;
    return filters;
  }, [category]);

  const {
    data: featuredData,
    isLoading: featuredLoading,
    refetch: refetchFeatured,
  } = useProductFeed(featuredFilters, true);

  const {
    data: regularData,
    fetchNextPage,
    hasNextPage,
    isLoading: regularLoading,
    isFetchingNextPage,
    refetch: refetchRegular,
    isError: regularError,
  } = useProductFeed(regularFilters, true);

  const featuredProducts = featuredData?.pages?.[0]?.products || [];
  const featuredIds = useMemo(() => new Set(featuredProducts.map(p => p.id)), [featuredProducts]);

  const regularProductsAll = regularData?.pages?.flatMap((page) => page.products) || [];
  const regularProducts = useMemo(() => {
    return regularProductsAll.filter(p => !featuredIds.has(p.id));
  }, [regularProductsAll, featuredIds]);

  const hasMore = hasNextPage;
  const isLoading = (featuredLoading || regularLoading) && !regularProductsAll.length && !featuredProducts.length;
  const isError = regularError && !regularProducts.length;

  const upvoteMutation = useUpvoteProduct();

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

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setCategory('All');
    setSortBy('most-upvoted');
    scrollToTop();
  };

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

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    scrollToTop();
  };

  const handleUpvote = (productId) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/productstrend/feed');
      return;
    }

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

    const prevUpvotes = currentProduct.upvotes || 0;
    const prevUserVoted = currentProduct.userVoted || false;
    const newUserVoted = !prevUserVoted;
    const newUpvotes = newUserVoted ? prevUpvotes + 1 : prevUpvotes - 1;

    const updatedProduct = {
      ...currentProduct,
      upvotes: newUpvotes,
      userVoted: newUserVoted,
    };

    setLocalVote(productId, newUserVoted, newUpvotes);

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

    queryClient.setQueryData(['productDetail', productId], updatedProduct);

    upvoteMutation.mutate(productId, {
      onSuccess: (result) => {
        const serverVoted = result.action === 'added';
        const serverUpvotes = result.upvotes;
        const finalProduct = { ...currentProduct, upvotes: serverUpvotes, userVoted: serverVoted };

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

        queryClient.setQueryData(['productDetail', productId], finalProduct);
        setLocalVote(productId, serverVoted, serverUpvotes);
      },
      onError: () => {
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

  const showFeatured = sortBy === 'most-upvoted' && !searchQuery;
  const filterKey = `${sortBy}-${category}-${searchQuery}`;

  return (
    <>
      <Meta title="Product Feed – Make Trend" description="Discover and upvote the latest tech products, tools, and startups." />
      <div className="min-h-screen bg-slate-50/50 pb-16">
        
        {/* ── Header Banner ── */}
        <div className="bg-white border-b border-slate-200 pt-8 pb-6 px-4">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
                <FiTrendingUp className="text-purple-600" />
                Product Directory
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Discover, upvote, and launch the best new products.</p>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <button onClick={() => router.push('/productstrend/my-products')} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition text-sm shadow-sm">
                    My Products
                  </button>
                  <button onClick={() => router.push('/productstrend/launch')} className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition shadow-sm text-sm flex items-center gap-1.5">
                    <FiPlus className="w-4 h-4" /> Launch Product
                  </button>
                </>
              ) : (
                <button onClick={() => router.push('/login?redirect=/productstrend/feed')} className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition text-sm shadow-sm">
                  Sign In to Upvote
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 mt-8">
          
          {/* ── Search & Filters Bar ── */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              
              {/* Search Box */}
              <div className="flex flex-1 gap-2">
                <div className="relative flex-1">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search by name, tagline, or description..."
                    className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition"
                  />
                  {searchInput && (
                    <button onClick={() => setSearchInput('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full p-0.5">
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button onClick={triggerSearch} className="px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition text-sm font-bold shadow-sm whitespace-nowrap">
                  Search
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative min-w-[180px]">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <FiFilter className="w-4 h-4" />
                </div>
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-sm font-bold text-slate-700 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition cursor-pointer"
                >
                  <option value="most-upvoted">🔥 Most Upvoted</option>
                  <option value="newest">✨ Newest Releases</option>
                  <option value="oldest">🕰️ Oldest First</option>
                  <option value="most-commented">💬 Most Discussed</option>
                </select>
                <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Category Pills */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex overflow-x-auto gap-2.5 pb-2 scrollbar-hide snap-x">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`snap-start px-5 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition shadow-sm border ${
                      category === cat
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Filters Clear Bar */}
            {(searchQuery || category !== 'All' || sortBy !== 'most-upvoted') && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100/50">
                <p className="text-xs font-semibold text-slate-400">Active filters applied</p>
                <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-700 transition">
                  Clear All Filters
                </button>
              </div>
            )}
          </div>

          {/* ── Content Area ── */}
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-6 w-32 bg-slate-200 rounded-lg mb-6" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 flex gap-6">
                  <div className="w-20 h-20 bg-slate-200 rounded-2xl flex-shrink-0" />
                  <div className="flex-1 space-y-3 pt-2">
                    <div className="h-5 w-48 bg-slate-200 rounded" />
                    <div className="h-4 w-full bg-slate-200 rounded" />
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                  </div>
                  <div className="w-16 h-16 bg-slate-200 rounded-2xl flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : isError && !regularProducts.length && !featuredProducts.length ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-slate-800 font-bold text-lg mb-2">Failed to load products.</p>
              <button onClick={() => { refetchFeatured(); refetchRegular(); }} className="mt-2 inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-sm">
                <FiRefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Featured Section */}
              {showFeatured && featuredProducts.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-5 px-1">
                    <div className="p-1.5 bg-amber-100 rounded-lg"><FaFire className="text-amber-500 w-4 h-4" /></div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">Featured Highlights</h2>
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

              {/* Regular Section */}
              <div>
                {regularProducts.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <div className="text-6xl mb-4 opacity-50">📭</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {showFeatured ? 'No more products' : 'No products found'}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium max-w-sm mx-auto">
                      {searchQuery
                        ? 'No results match your search filters. Try adjusting your query.'
                        : 'Be the first to launch a product in this category!'}
                    </p>
                    {isAuthenticated && !searchQuery && (
                      <button onClick={() => router.push('/productstrend/launch')} className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-sm">
                        <FiPlus className="w-4 h-4" /> Launch Product
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {showFeatured && regularProducts.length > 0 && (
                      <div className="flex items-center gap-2 mb-5 px-1 mt-10 border-t border-slate-200 pt-8">
                        <div className="p-1.5 bg-purple-100 rounded-lg"><FiClock className="text-purple-600 w-4 h-4" /></div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Recent Launches</h2>
                      </div>
                    )}
                    <div key={filterKey} className="space-y-4">
                      {regularProducts.map((product, index) => (
                        <ProductCard
                          key={`${product.id}-${index}-${filterKey}`}
                          product={product}
                          isFeatured={false}
                          onUpvote={handleUpvote}
                          isAuthenticated={isAuthenticated}
                          isUpvoting={upvoteMutation.isLoading}
                          ref={index === regularProducts.length - 1 ? lastElementRef : undefined}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Infinite Scroll Sentinel */}
                {hasMore && (
                  <div className="py-10 flex justify-center">
                    {isFetchingNextPage ? (
                      <div className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm text-sm font-bold text-purple-600">
                        <FiLoader className="w-4 h-4 animate-spin" />
                        Loading more products...
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </div>
                )}

                {!hasMore && regularProducts.length > 0 && (
                  <div className="text-center py-10">
                    <p className="text-sm font-bold text-slate-400 bg-slate-100 inline-block px-6 py-2 rounded-full">
                      You've reached the end of the list 🎉
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}

