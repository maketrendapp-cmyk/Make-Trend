// pages/productstrend/feed.js
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import {
  useProductFeed,
  useUpvoteProduct,
  useInvalidateQueries,
} from '../../lib/queries';
import {
  FiTrendingUp,
  FiHeart,
  FiUser,
  FiChevronDown,
  FiSearch,
  FiFilter,
  FiX,
  FiLoader,
  FiRefreshCw,
  FiArrowUp,
  FiClock,
  FiMessageCircle,
  FiExternalLink,
} from 'react-icons/fi';

const CATEGORIES = ['All', 'Tech', 'Design', 'AI', 'Productivity', 'Education', 'Health', 'Fitness', 'Gaming', 'Other'];

export default function ProductTrendFeed() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { invalidateProductFeed } = useInvalidateQueries();

  // ── Filter state ──
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Build filters object for query ──
  const filters = {};
  if (searchTerm.trim()) filters.search = searchTerm.trim();
  if (category !== 'All') filters.category = category;
  if (sortBy) filters.sort = sortBy;

  // ── React Query: Product Feed ──
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    refetch,
    isError,
    error,
  } = useProductFeed(filters, isAuthenticated);

  const products = data?.pages?.flatMap((page) => page.products) || [];
  const hasMore = hasNextPage;

  // ── Upvote mutation ──
  const upvoteMutation = useUpvoteProduct();

  // ── Intersection Observer ──
  const observerRef = useRef(null);

  useEffect(() => {
    if (isFetchingNextPage || !hasMore || products.length === 0) return;

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
  }, [isFetchingNextPage, hasMore, products.length, fetchNextPage]);

  // ── Scroll to top on filter change ──
  const handleFilterChange = () => {
    window.scrollTo(0, 0);
    refetch({ refetchPage: (page, index) => index === 0 });
  };

  // ── Clear all filters ──
  const clearFilters = () => {
    setSearchTerm('');
    setCategory('All');
    setSortBy('newest');
    setIsFilterOpen(false);
    handleFilterChange();
  };

  // ── Upvote handler ──
  const handleUpvote = (productId) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/productstrend/feed');
      return;
    }
    upvoteMutation.mutate(productId);
  };

  // ── Format date ──
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
        <Meta title="Product Feed – ProductTrend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-8 text-center border border-slate-100">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600">
              <FiTrendingUp className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Sign In Required</h2>
            <p className="text-slate-500 text-sm mb-6">Join ProductTrend to explore and upvote products.</p>
            <button
              onClick={() => router.push('/login?redirect=/productstrend/feed')}
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
      <>
        <Meta title="Product Feed – ProductTrend" />
        <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6" />
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="h-10 w-48 bg-slate-200 rounded-xl" />
            <div className="h-10 w-32 bg-slate-200 rounded-xl" />
            <div className="h-10 w-32 bg-slate-200 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 h-64" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (isError) {
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
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); handleFilterChange(); }}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); handleFilterChange(); }}
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
                  onChange={(e) => { setSortBy(e.target.value); handleFilterChange(); }}
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
          {(searchTerm || category !== 'All' || sortBy !== 'newest') && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full">
                    Search: {searchTerm}
                    <FiX className="w-3 h-3 cursor-pointer" onClick={() => setSearchTerm('')} />
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

        {/* Products Grid */}
        {products.length === 0 && !isFetchingNextPage ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-slate-900">No products found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your filters or launch a new product.</p>
            <button
              onClick={() => router.push('/productstrend/launch')}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
            >
              Launch Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 group flex flex-col"
              >
                <Link href={`/productstrend/${product.id}`} className="block">
                  <div className="aspect-video bg-slate-100 overflow-hidden relative">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
                        🚀
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between">
                    <Link href={`/productstrend/${product.id}`} className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-base hover:text-purple-600 transition line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>
                    <button
                      onClick={() => handleUpvote(product.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition text-xs font-medium ${
                        product.userVoted
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-purple-50 hover:border-purple-200'
                      }`}
                      disabled={upvoteMutation.isLoading}
                    >
                      <FiHeart className={`w-3.5 h-3.5 ${product.userVoted ? 'fill-purple-600 text-purple-600' : ''}`} />
                      {product.upvotes || 0}
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1 flex-1">
                    {product.tagline}
                  </p>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <FiUser className="w-3 h-3" />
                      {product.maker?.username || 'Anonymous'}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiClock className="w-3 h-3" />
                      {formatDate(product.createdAt)}
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <FiMessageCircle className="w-3 h-3" />
                      {product.commentsCount || 0}
                    </span>
                  </div>
                  {product.category && (
                    <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full self-start mt-2">
                      {product.category}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
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

        {!hasMore && products.length > 0 && (
          <p className="text-center text-xs text-slate-400 py-6">
            You've reached the end 🎉
          </p>
        )}
      </div>
    </>
  );
}