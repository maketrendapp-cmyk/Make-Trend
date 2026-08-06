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
  FiExternalLink,
} from 'react-icons/fi';

const CATEGORIES = ['All', 'Tech', 'Design', 'AI', 'Productivity', 'Education', 'Health', 'Fitness', 'Gaming', 'Other'];

const sortProducts = (products, sortBy) => {
  const copy = [...products];
  switch (sortBy) {
    case 'oldest':
      return copy.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    case 'most-upvoted':
      return copy.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    case 'most-commented':
      return copy.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    case 'newest':
    default:
      return copy.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }
};

export default function ProductTrendFeed() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateProductFeed } = useInvalidateQueries();

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  const backendFilters = {};
  if (searchQuery.trim()) backendFilters.search = searchQuery.trim();
  if (category !== 'All') backendFilters.category = category;
  if (sortBy) backendFilters.sort = sortBy;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetching,
    isFetchingNextPage,
    refetch,
    isError,
    error,
  } = useProductFeed(backendFilters, true);

  const rawProducts = data?.pages?.flatMap((page) => page.products) || [];
  const hasMore = hasNextPage;

  const clientFilteredProducts = useMemo(() => {
    let result = rawProducts;

    if (searchInput.trim()) {
      const term = searchInput.trim().toLowerCase();
      result = result.filter((p) =>
        p.name?.toLowerCase().includes(term) ||
        p.tagline?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }

    if (category !== 'All') {
      result = result.filter((p) => p.category === category);
    }

    result = sortProducts(result, sortBy);

    return result;
  }, [rawProducts, searchInput, category, sortBy]);

  const displayProducts = isFetching ? clientFilteredProducts : rawProducts;
  const isPreview = isFetching &&
    (searchInput.trim() || category !== 'All' || sortBy !== 'newest');

  const upvoteMutation = useUpvoteProduct();

  const observerRef = useRef(null);

  React.useEffect(() => {
    if (isFetchingNextPage || !hasMore || displayProducts.length === 0) return;

    const lastElement = document.querySelector('#feed-end');
    if (!lastElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(lastElement);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [isFetchingNextPage, hasMore, displayProducts.length, fetchNextPage]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setCategory('All');
    setSortBy('newest');
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

  const handleSortChange = (val) => {
    setSortBy(val);
    scrollToTop();
  };

  // ── Optimistic upvote with toggle ──
  const handleUpvote = (productId) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/productstrend/feed');
      return;
    }

    let currentProduct = null;
    let pageIndex = -1;
    let productIndex = -1;

    if (data?.pages) {
      for (let i = 0; i < data.pages.length; i++) {
        const page = data.pages[i];
        const idx = page.products.findIndex(p => p.id === productId);
        if (idx !== -1) {
          currentProduct = page.products[idx];
          pageIndex = i;
          productIndex = idx;
          break;
        }
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

    // Update feed cache
    const newPages = data.pages.map((page, idx) => {
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

    queryClient.setQueryData(['productFeed', backendFilters], {
      pages: newPages,
      pageParams: data.pageParams,
    });

    queryClient.setQueryData(['productDetail', productId], updatedProduct);

    upvoteMutation.mutate(productId, {
      onError: (error) => {
        // Revert on error
        const revertPages = data.pages.map((page, idx) => {
          if (idx === pageIndex) {
            return {
              ...page,
              products: page.products.map((p, pIdx) =>
                pIdx === productIndex ? currentProduct : p
              ),
            };
          }
          return page;
        });
        queryClient.setQueryData(['productFeed', backendFilters], {
          pages: revertPages,
          pageParams: data.pageParams,
        });
        queryClient.setQueryData(['productDetail', productId], currentProduct);
        toast.error(error.message || 'Failed to upvote');
      },
    });
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
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  if (isLoading && !rawProducts.length) {
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

  if (isError && !rawProducts.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600 font-medium">Failed to load products.</p>
          <button onClick={() => refetch()} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
            <FiRefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

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

        {/* Search & Filters – No horizontal scroll */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search products..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={triggerSearch}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium flex items-center gap-1.5"
              >
                <FiSearch className="w-4 h-4" /> Search
              </button>
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
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="most-upvoted">Most Upvoted</option>
                  <option value="most-commented">Most Comments</option>
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
          {(searchQuery || category !== 'All' || sortBy !== 'newest') && (
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
                {sortBy !== 'newest' && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full">
                    {sortBy.replace('-', ' ')}
                    <FiX className="w-3 h-3 cursor-pointer" onClick={() => setSortBy('newest')} />
                  </span>
                )}
              </div>
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium">
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Preview indicator */}
        {isPreview && (
          <div className="mb-4 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <FiLoader className="w-4 h-4 animate-spin" />
            Showing filtered preview from current feed – searching server...
          </div>
        )}

        {/* Products List */}
        {displayProducts.length === 0 && !isFetchingNextPage ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-slate-900">No products found</h3>
            <p className="text-slate-500 text-sm">
              {searchInput || category !== 'All' || sortBy !== 'newest'
                ? 'No matches in current feed. Searching the server...'
                : 'Try adjusting your filters or launch a new product.'}
            </p>
            {isAuthenticated && (
              <button
                onClick={() => router.push('/productstrend/launch')}
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
              >
                Launch Product
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-shadow duration-200 p-4 flex items-center gap-4"
              >
                <Link href={`/productstrend/${product.id}`} className="flex-shrink-0 w-24 h-24 md:w-28 md:h-28 bg-slate-100 rounded-xl overflow-hidden relative">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="120px"
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-slate-300">
                      🚀
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link href={`/productstrend/${product.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-base hover:text-purple-600 transition truncate">
                        {product.name}
                      </h3>
                    </Link>
                    <button
                      onClick={() => handleUpvote(product.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition text-xs font-medium flex-shrink-0 ${
                        product.userVoted
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-purple-50 hover:border-purple-200'
                      }`}
                      disabled={upvoteMutation.isLoading || !isAuthenticated}
                    >
                      <FiHeart className={`w-3.5 h-3.5 ${product.userVoted ? 'fill-purple-600 text-purple-600' : ''}`} />
                      {product.upvotes || 0}
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">
                    {product.tagline}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <FiUser className="w-3 h-3" />
                      {product.maker?.username || 'Anonymous'}
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
            ))}
          </div>
        )}

        {hasMore && (
          <div id="feed-end" className="py-8 flex justify-center">
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

        {!hasMore && displayProducts.length > 0 && (
          <p className="text-center text-xs text-slate-400 py-6">
            You've reached the end 🎉
          </p>
        )}
      </div>
    </>
  );
}