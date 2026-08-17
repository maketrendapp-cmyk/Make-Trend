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

  let cardClasses = 'bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 group';
  let badge = null;

  if (isFeatured && rank) {
    if (rank === 1) {
      cardClasses = 'bg-gradient-to-br from-amber-50/40 to-white rounded-3xl border border-amber-200/60 p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 group';
      badge = <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-sm uppercase tracking-wider">👑 #1</span>;
    } else if (rank === 2) {
      cardClasses = 'bg-gradient-to-br from-slate-50/50 to-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 group';
      badge = <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-slate-200 text-slate-700 uppercase tracking-wider">🥈 #2</span>;
    } else if (rank === 3) {
      cardClasses = 'bg-gradient-to-br from-orange-50/30 to-white rounded-3xl border border-orange-200/60 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 group';
      badge = <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-orange-200 text-orange-800 uppercase tracking-wider">🥉 #3</span>;
    } else {
      badge = <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-700 uppercase tracking-wider">#{rank}</span>;
    }
  }

  return (
    <div ref={ref} className={cardClasses}>
      <Link href={`/productstrend/${product.id}`} className="flex-shrink-0 flex sm:block justify-between items-center">
        {hasImage ? (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.25rem] bg-slate-50 overflow-hidden border border-slate-100 shadow-sm flex items-center justify-center group-hover:scale-[1.03] transition-transform duration-300">
            <img
              src={product.logo || product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          </div>
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.25rem] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-3xl text-slate-300 border border-slate-200 shadow-sm group-hover:scale-[1.03] transition-transform duration-300">
            <FiBox className="w-8 h-8" />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <Link href={`/productstrend/${product.id}`} className="block min-w-0">
              <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl hover:text-purple-600 transition-colors truncate">
                {product.name}
              </h3>
            </Link>
            {isFeatured && badge}
          </div>

          <p className="text-sm font-medium text-slate-500 line-clamp-2 leading-relaxed mb-3 pr-2">
            {product.tagline}
          </p>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-400 flex-wrap">
            <span className="flex items-center gap-2 bg-slate-50 border border-slate-100/80 px-2.5 py-1 rounded-lg">
              <span className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {product.maker?.avatar ? (
                  <img src={product.maker.avatar} alt="Maker" className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="w-3 h-3 text-slate-500" />
                )}
              </span>
              <span className="text-slate-600 truncate max-w-[120px]">{product.maker?.username || 'Anonymous'}</span>
            </span>
            <span className="flex items-center gap-1.5"><FiMessageCircle className="w-3.5 h-3.5" />{product.commentsCount || 0}</span>
            {product.category && (
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg border border-slate-200/50">{product.category}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => onUpvote(product.id)}
          disabled={!isAuthenticated || isUpvoting}
          className={`flex sm:flex-col items-center justify-center gap-2 sm:gap-1.5 px-6 py-3 sm:w-20 sm:py-3.5 rounded-[1.25rem] border-2 transition-all font-bold flex-shrink-0 active:scale-95 shadow-sm ${
            isLiked
              ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-purple-500/10'
              : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50/50 hover:text-purple-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <FiHeart className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors ${isLiked ? 'fill-purple-600 text-purple-600' : 'text-slate-400'}`} />
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

  // 1. Build exact filters to pass straight to the backend API
  const regularFilters = useMemo(() => {
    const filters = { sort: sortBy };
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (category !== 'All') filters.category = category;
    return filters;
  }, [searchQuery, category, sortBy]);

  // 2. Fetch Featured ONLY when sorting by 'most-upvoted' and no search
  const showFeatured = sortBy === 'most-upvoted' && !searchQuery;
  const featuredFilters = useMemo(() => {
    const filters = { sort: 'most-upvoted', limit: 100 };
    if (category !== 'All') filters.category = category;
    return filters;
  }, [category]);

  const {
    data: featuredData,
    isLoading: featuredLoading,
    refetch: refetchFeatured,
  } = useProductFeed(featuredFilters, showFeatured);

  // 3. Fetch regular feed with dynamic filters
  const {
    data: regularData,
    fetchNextPage,
    hasNextPage,
    isLoading: regularLoading,
    isFetchingNextPage,
    refetch: refetchRegular,
    isError: regularError,
  } = useProductFeed(regularFilters, true);

  const featuredProducts = showFeatured ? (featuredData?.pages?.[0]?.products || []) : [];
  const featuredIds = useMemo(() => new Set(featuredProducts.map(p => p.id)), [featuredProducts]);

  const regularProductsAll = useMemo(() => {
    return regularData?.pages?.flatMap((page) => page.products) || [];
  }, [regularData]);

  // Filter out featured from regular so they don't duplicate
  const regularProducts = useMemo(() => {
    if (showFeatured) {
      return regularProductsAll.filter(p => !featuredIds.has(p.id));
    }
    return regularProductsAll;
  }, [regularProductsAll, featuredIds, showFeatured]);

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setCategory('All');
    setSortBy('most-upvoted');
    scrollToTop();
  };

  const triggerSearch = () => {
    if (searchInput.trim() !== searchQuery.trim()) {
      setSearchQuery(searchInput.trim());
      scrollToTop();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerSearch();
    }
  };

  // ✅ SIMPLIFIED: Safe, clean optimistic update that preserves array orders
  const handleUpvote = (productId) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/productstrend/feed');
      return;
    }

    // 1. Optimistic Update (Scans all loaded queries to update the heart instantly)
    queryClient.setQueriesData({ queryKey: ['productFeed'] }, (oldData) => {
      if (!oldData || !oldData.pages) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map(page => ({
          ...page,
          products: page.products.map(p => {
            if (p.id === productId) {
              const isVoted = !p.userVoted;
              return { ...p, userVoted: isVoted, upvotes: p.upvotes + (isVoted ? 1 : -1) };
            }
            return p;
          })
        }))
      };
    });

    // 2. Fire backend mutation
    upvoteMutation.mutate(productId, {
      onError: () => {
        toast.error('Failed to upvote');
        // Rollback on error
        queryClient.invalidateQueries({ queryKey: ['productFeed'] });
      }
    });
  };

  return (
    <>
      <Meta title="Product Feed – Make Trend" description="Discover and upvote the latest tech products, tools, and startups." />
      <div className="min-h-screen bg-slate-50 pb-16">
        
        {/* ── Header Banner ── */}
        <div className="bg-white border-b border-slate-200/80 pt-8 pb-6 px-4">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <FiTrendingUp className="w-6 h-6" />
                </div>
                Product Directory
              </h1>
              <p className="text-sm sm:text-base font-medium text-slate-500 mt-2">Discover, upvote, and launch the best new products.</p>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <button onClick={() => router.push('/productstrend/my-products')} className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition text-sm shadow-sm">
                    My Products
                  </button>
                  <button onClick={() => router.push('/productstrend/launch')} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition shadow-sm text-sm flex items-center gap-2 active:scale-95">
                    <FiPlus className="w-5 h-5" /> Launch Product
                  </button>
                </>
              ) : (
                <button onClick={() => router.push('/login?redirect=/productstrend/feed')} className="px-8 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition text-sm shadow-sm">
                  Sign In to Upvote
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 mt-8">
          
          {/* ── Search & Filters Bar ── */}
          <div className="bg-white rounded-[2rem] border border-slate-200/80 p-5 shadow-sm mb-10">
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
                    className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-[1.25rem] text-sm font-semibold focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition"
                  />
                  {searchInput && (
                    <button onClick={() => setSearchInput('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full p-1 transition-colors">
                      <FiX className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button onClick={triggerSearch} className="px-8 py-3.5 bg-slate-900 text-white rounded-[1.25rem] hover:bg-slate-800 transition text-sm font-bold shadow-sm whitespace-nowrap active:scale-95">
                  Search
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative min-w-[200px]">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <FiFilter className="w-4 h-4" />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); scrollToTop(); }}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-[1.25rem] pl-11 pr-10 py-3.5 text-sm font-bold text-slate-700 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition cursor-pointer"
                >
                  <option value="most-upvoted">🔥 Most Upvoted</option>
                  <option value="newest">✨ Newest Releases</option>
                  <option value="oldest">🕰️ Oldest First</option>
                  <option value="most-commented">💬 Most Discussed</option>
                </select>
                <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5" />
              </div>
            </div>

            {/* Category Pills (Horizontal Scroll) */}
            <div className="mt-5 pt-5 border-t border-slate-100">
              <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide snap-x">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); scrollToTop(); }}
                    className={`snap-start px-5 py-2.5 rounded-xl whitespace-nowrap text-sm font-bold transition shadow-sm border ${
                      category === cat
                        ? 'bg-purple-600 text-white border-purple-600 shadow-purple-600/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Filters Clear Bar */}
            {(searchQuery || category !== 'All' || sortBy !== 'most-upvoted') && (
              <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100/80">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-400 mr-1">Active Filters:</span>
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                      Search: {searchQuery}
                      <FiX className="w-3.5 h-3.5 cursor-pointer hover:text-purple-900" onClick={() => { setSearchInput(''); setSearchQuery(''); }} />
                    </span>
                  )}
                  {category !== 'All' && (
                    <span className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                      {category}
                      <FiX className="w-3.5 h-3.5 cursor-pointer hover:text-purple-900" onClick={() => setCategory('All')} />
                    </span>
                  )}
                  {sortBy !== 'most-upvoted' && (
                    <span className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">
                      {sortBy.replace('-', ' ')}
                      <FiX className="w-3.5 h-3.5 cursor-pointer hover:text-purple-900" onClick={() => setSortBy('most-upvoted')} />
                    </span>
                  )}
                </div>
                <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-700 transition px-3 py-1.5 rounded-lg hover:bg-red-50">
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* ── Content Area ── */}
          {isLoading ? (
            <div className="space-y-5 animate-pulse">
              <div className="h-6 w-40 bg-slate-200 rounded-lg mb-6" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col sm:flex-row gap-6">
                  <div className="w-20 h-20 bg-slate-200 rounded-[1.25rem] flex-shrink-0" />
                  <div className="flex-1 space-y-3 pt-2">
                    <div className="h-6 w-48 bg-slate-200 rounded" />
                    <div className="h-4 w-full bg-slate-200 rounded" />
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                  </div>
                  <div className="w-20 h-20 bg-slate-200 rounded-[1.25rem] flex-shrink-0 hidden sm:block" />
                </div>
              ))}
            </div>
          ) : isError && !regularProducts.length && !featuredProducts.length ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-slate-800 font-bold text-xl mb-2">Failed to load products.</p>
              <p className="text-slate-500 font-medium mb-6">There was an issue connecting to the server.</p>
              <button onClick={() => { refetchFeatured(); refetchRegular(); }} className="mt-2 inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-sm">
                <FiRefreshCw className="w-5 h-5" /> Try Again
              </button>
            </div>
          ) : (
            <>
              {/* ── Featured Section ── */}
              {showFeatured && featuredProducts.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-6 px-1">
                    <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl shadow-sm border border-amber-200/50">
                      <FaFire className="text-amber-500 w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Featured Highlights</h2>
                  </div>
                  <div className="space-y-5">
                    {featuredProducts.map((product, idx) => (
                      <ProductCard
                        key={`featured-${product.id}`}
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

              {/* ── Regular Products Section ── */}
              <div>
                {regularProducts.length === 0 ? (
                  <div className="text-center py-24 bg-white rounded-[2rem] border border-slate-200/80 shadow-sm">
                    <div className="text-7xl mb-6 opacity-40">📭</div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">
                      {showFeatured ? 'No more products' : 'No products found'}
                    </h3>
                    <p className="text-slate-500 text-base font-medium max-w-sm mx-auto">
                      {searchQuery
                        ? 'No results match your search filters. Try adjusting your query.'
                        : 'Be the first to launch a product in this category!'}
                    </p>
                    {isAuthenticated && !searchQuery && (
                      <button onClick={() => router.push('/productstrend/launch')} className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-md hover:shadow-purple-500/20 active:scale-95">
                        <FiPlus className="w-5 h-5" /> Launch Your Product
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {showFeatured && regularProducts.length > 0 && (
                      <div className="flex items-center gap-3 mb-6 px-1 mt-12 border-t border-slate-200 pt-10">
                        <div className="p-2 bg-purple-100 rounded-xl border border-purple-200/50">
                          <FiClock className="text-purple-600 w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recent Launches</h2>
                      </div>
                    )}
                    <div className="space-y-5">
                      {regularProducts.map((product, index) => (
                        <ProductCard
                          key={`${product.id}-${index}`}
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

                {/* ── Infinite Scroll Sentinel ── */}
                {hasMore && (
                  <div className="py-12 flex justify-center">
                    {isFetchingNextPage ? (
                      <div className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded-full shadow-sm text-sm font-bold text-purple-600">
                        <FiLoader className="w-5 h-5 animate-spin" />
                        Loading more products...
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </div>
                )}

                {!hasMore && regularProducts.length > 0 && (
                  <div className="text-center py-12">
                    <p className="text-sm font-bold text-slate-400 bg-slate-100 inline-block px-8 py-3 rounded-full border border-slate-200/60">
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

