// pages/productstrend/feed.js
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import {
  useProductFeed,
  useUpvoteProduct,
} from '../../lib/queries';
import toast from 'react-hot-toast';
import {
  FiTrendingUp,
  FiUser,
  FiChevronDown,
  FiSearch,
  FiX,
  FiLoader,
  FiRefreshCw,
  FiClock,
  FiMessageCircle,
  FiBox,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiAward,
  FiChevronUp,
} from 'react-icons/fi';

const CATEGORIES = ['All', 'Tech', 'Design', 'AI', 'Productivity', 'Education', 'Health', 'Fitness', 'Gaming', 'Other'];

const formatDate = (timestamp) => {
  if (!timestamp) return 'Recently';
  try {
    let date;
    if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp?.seconds !== undefined) {
      date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1e6);
    } else if (timestamp?._seconds !== undefined) {
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

const setLocalVote = (productId, voted, upvotes) => {
  try {
    localStorage.setItem(`upvote_${productId}`, JSON.stringify({ voted, upvotes }));
  } catch (e) {}
};

// ── Custom Dropdown Component ──
const CustomSelect = ({ value, onChange, options, placeholder, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <div className="relative flex-1 sm:flex-none" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 shadow-sm min-w-[130px]"
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
          <span className="truncate">{selectedLabel}</span>
        </span>
        <FiChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-48 mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl py-1.5 z-50 animate-fadeIn">
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm text-left transition-colors ${
                  isSelected
                    ? 'bg-purple-50 text-purple-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <FiCheck className="w-4 h-4 text-purple-600 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Standard Product Card ──
const ProductCard = React.forwardRef(({
  product,
  rank = null,
  onUpvote,
  isAuthenticated,
  isUpvoting,
}, ref) => {
  const isLiked = product.userVoted || false;
  const upvotes = product.upvotes || 0;
  const hasImage = !!(product.logo || product.imageUrl);

  return (
    <div
      ref={ref}
      className="group bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 hover:border-purple-300 hover:shadow-lg transition-all duration-200 flex items-start gap-3 sm:gap-4 relative"
    >
      {/* Product Logo */}
      <Link href={`/productstrend/${product.id}`} className="shrink-0 mt-0.5">
        {hasImage ? (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 border border-slate-200/60 overflow-hidden shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
            <Image
              src={product.logo || product.imageUrl}
              alt={product.name}
              width={56}
              height={56}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                if (e.target.parentElement) {
                  e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-slate-300"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>`;
                }
              }}
            />
          </div>
        ) : (
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-slate-200/60 flex items-center justify-center text-purple-600 shadow-sm group-hover:scale-105 transition-transform duration-200">
            <FiBox className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        )}
      </Link>

      {/* Main Product Info */}
      <div className="flex-1 min-w-0 pr-1 sm:pr-2">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Link href={`/productstrend/${product.id}`}>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 hover:text-purple-600 transition-colors truncate">
              {product.name}
            </h3>
          </Link>
          
          {rank && rank > 3 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60 shrink-0">
              #{rank}
            </span>
          )}
          {product.category && (
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
              {product.category}
            </span>
          )}
        </div>

        <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed mb-3">
          {product.tagline || 'No tagline available for this product.'}
        </p>

        {/* Footer Meta */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="w-4 h-4 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
              {product.maker?.avatar ? (
                <Image src={product.maker.avatar} alt={product.maker.username || 'User'} width={16} height={16} className="w-full h-full object-cover" />
              ) : (
                <FiUser className="w-2.5 h-2.5 text-slate-500" />
              )}
            </span>
            <span className="font-medium text-slate-600 truncate max-w-[100px] sm:max-w-none">
              {product.maker?.username || 'Anonymous'}
            </span>
          </span>

          <span className="flex items-center gap-1 shrink-0">
            <FiClock className="w-3.5 h-3.5 text-slate-400" />
            {formatDate(product.createdAt)}
          </span>

          <span className="flex items-center gap-1 shrink-0">
            <FiMessageCircle className="w-3.5 h-3.5 text-slate-400" />
            {product.commentsCount || 0}
          </span>
        </div>
      </div>

      {/* Upvote Button (Product Hunt Vertical Pill Style) */}
      <div className="shrink-0 flex items-center self-center sm:self-start">
        <button
          type="button"
          onClick={() => onUpvote(product.id)}
          disabled={!isAuthenticated || isUpvoting}
          className={`flex flex-col items-center justify-center min-w-[48px] sm:min-w-[54px] py-2 px-2.5 rounded-xl border transition-all duration-200 ${
            isLiked
              ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-white border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/50'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isAuthenticated ? 'Upvote this product' : 'Sign in to upvote'}
        >
          <FiChevronUp className={`w-5 h-5 -mb-0.5 transition-transform duration-200 ${isLiked ? 'text-white' : 'text-slate-500 group-hover:text-purple-600'}`} />
          <span className={`text-xs sm:text-sm font-bold ${isLiked ? 'text-white' : 'text-slate-800'}`}>
            {upvotes}
          </span>
        </button>
      </div>
    </div>
  );
});
ProductCard.displayName = 'ProductCard';

// ── Hero Spotlight Carousel (Top 1, 2, 3 Products Only) ──
const FeaturedCarousel = ({ products, onUpvote, isAuthenticated, isUpvoting }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const timerRef = useRef(null);

  const total = products.length;
  const isSingle = total === 1;

  const goTo = (index) => {
    if (index < 0) index = total - 1;
    if (index >= total) index = 0;
    setCurrentIndex(index);
  };

  const next = () => goTo(currentIndex + 1);
  const prev = () => goTo(currentIndex - 1);

  useEffect(() => {
    if (isSingle || !isAutoPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(next, 6000);
    return () => clearInterval(timerRef.current);
  }, [currentIndex, isAutoPlaying, isSingle]);

  if (!products.length) return null;

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-amber-950 shadow-sm border border-amber-300">
          <FiAward className="w-3.5 h-3.5" /> #1 PRODUCT OF THE DAY
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-800 shadow-sm border border-slate-300">
          🥈 #2 RUNNER UP
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-700/10 text-amber-800 shadow-sm border border-amber-800/20">
        🥉 #3 TOP PRODUCT
      </span>
    );
  };

  return (
    <div className="mb-8 relative rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-5 sm:p-7 text-white shadow-xl overflow-hidden border border-slate-800">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 mb-5 relative z-10 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-purple-500/20 backdrop-blur-md rounded-xl border border-purple-400/30 text-purple-300 shrink-0">
            <FiTrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-extrabold tracking-tight text-white truncate flex items-center gap-2">
              Daily Podium <span className="text-xs font-normal text-purple-300/80 hidden sm:inline">• Top Trending</span>
            </h2>
          </div>
        </div>

        {total > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={prev}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-white/80 hover:text-white border border-white/10"
              aria-label="Previous slide"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-purple-200/70">
              {currentIndex + 1}/{total}
            </span>
            <button
              type="button"
              onClick={next}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition text-white/80 hover:text-white border border-white/10"
              aria-label="Next slide"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Carousel Container */}
      <div
        className="relative overflow-hidden z-10"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {products.map((product, idx) => {
            const rank = idx + 1;
            const isLiked = product.userVoted || false;
            const upvotes = product.upvotes || 0;
            const hasImage = !!(product.logo || product.imageUrl);

            return (
              <div key={product.id} className="w-full shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/10">
                  {/* Left: Product Media & Info */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <Link href={`/productstrend/${product.id}`} className="shrink-0">
                      {hasImage ? (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800 border border-white/20 overflow-hidden shadow-md flex items-center justify-center">
                          <Image
                            src={product.logo || product.imageUrl}
                            alt={product.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 border border-white/20 flex items-center justify-center text-white shadow-md">
                          <FiBox className="w-8 h-8" />
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="mb-2">{getRankBadge(rank)}</div>
                      
                      <Link href={`/productstrend/${product.id}`} className="block">
                        <h3 className="text-lg sm:text-2xl font-black text-white hover:text-purple-300 transition truncate">
                          {product.name}
                        </h3>
                      </Link>

                      <p className="text-xs sm:text-sm text-purple-100/80 line-clamp-2 mt-1 leading-relaxed">
                        {product.tagline || 'Discover this trending product on ProductTrend.'}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-purple-200/60 mt-3 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-purple-900 border border-purple-400/40 overflow-hidden flex items-center justify-center">
                            {product.maker?.avatar ? (
                              <Image src={product.maker.avatar} alt={product.maker.username || 'User'} width={16} height={16} className="w-full h-full object-cover" />
                            ) : (
                              <FiUser className="w-2.5 h-2.5 text-purple-200" />
                            )}
                          </span>
                          <span className="font-semibold text-purple-200">{product.maker?.username || 'Anonymous'}</span>
                        </span>
                        <span>•</span>
                        <span>{formatDate(product.createdAt)}</span>
                        {product.category && (
                          <>
                            <span>•</span>
                            <span className="bg-white/10 text-white px-2 py-0.5 rounded-md text-[10px] uppercase font-bold">
                              {product.category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Upvote Callout Action */}
                  <div className="shrink-0 flex sm:flex-col items-center justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10">
                    <button
                      type="button"
                      onClick={() => onUpvote(product.id)}
                      disabled={!isAuthenticated || isUpvoting}
                      className={`w-full sm:w-auto flex sm:flex-col items-center justify-center gap-1.5 px-6 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-bold transition-all duration-200 shadow-lg ${
                        isLiked
                          ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-purple-500/30 ring-2 ring-purple-300'
                          : 'bg-white hover:bg-slate-100 text-slate-900 shadow-white/10'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <FiChevronUp className={`w-5 h-5 ${isLiked ? 'text-white' : 'text-purple-600'}`} />
                      <span className="text-xs uppercase tracking-wider hidden sm:block">Upvote</span>
                      <span className="text-sm sm:text-base">{upvotes}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function ProductTrendFeed() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('most-upvoted');

  // ── Build filters ──
  const regularFilters = useMemo(() => {
    const filters = {};
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (category !== 'All') filters.category = category;
    filters.sort = sortBy;
    return filters;
  }, [searchQuery, category, sortBy]);

  // ── Featured only when `most-upvoted` and no search query ──
  const shouldFetchFeatured = sortBy === 'most-upvoted' && !searchQuery;
  const featuredFilters = useMemo(() => {
    const filters = { sort: 'most-upvoted', limit: 100 };
    if (category !== 'All') filters.category = category;
    return filters;
  }, [category]);

  // ── Queries ──
  const { data: featuredData } = useProductFeed(featuredFilters, shouldFetchFeatured);

  const {
    data: regularData,
    fetchNextPage,
    hasNextPage,
    isLoading: regularLoading,
    isFetchingNextPage,
    refetch: refetchRegular,
    isError: regularError,
    isFetching: isRegularFetching,
  } = useProductFeed(regularFilters, true);

  // ── Compute featured products ──
  const featuredProductsAll = shouldFetchFeatured ? (featuredData?.pages?.[0]?.products || []) : [];
  const carouselProducts = featuredProductsAll.slice(0, 3);        // Only top 3 in podium carousel
  const remainingFeatured = featuredProductsAll.slice(3);          // Ranks 4+
  const carouselIds = useMemo(() => new Set(carouselProducts.map(p => p.id)), [carouselProducts]);

  const featuredRankMap = useMemo(() => new Map(featuredProductsAll.map((p, idx) => [p.id, idx + 1])), [featuredProductsAll]);

  // ── Regular products list deduplication ──
  const regularProductsAll = useMemo(() => regularData?.pages?.flatMap((page) => page.products) || [], [regularData]);
  const filteredRegular = useMemo(() => regularProductsAll.filter(p => !carouselIds.has(p.id)), [regularProductsAll, carouselIds]);

  const displayedProducts = useMemo(() => {
    return [
      ...remainingFeatured,
      ...filteredRegular.filter(p => !featuredRankMap.has(p.id))
    ];
  }, [remainingFeatured, filteredRegular, featuredRankMap]);

  const hasMore = hasNextPage;
  const isLoading = regularLoading && !regularProductsAll.length;
  const isError = regularError && !regularProductsAll.length;

  const upvoteMutation = useUpvoteProduct();

  // ── Infinite scroll observer ──
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

  // ── Filter Handlers ──
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

  const handleCategoryChange = (val) => {
    setCategory(val);
    scrollToTop();
  };

  const handleSortChange = (val) => {
    setSortBy(val);
    scrollToTop();
  };

  const categoryOptions = CATEGORIES.map(cat => ({ value: cat, label: cat }));
  const sortOptions = [
    { value: 'most-upvoted', label: 'Most Upvoted' },
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'most-commented', label: 'Most Comments' },
  ];

  // ── Upvote Handler with Optimistic UI ──
  const handleUpvote = (productId) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/productstrend/feed');
      return;
    }

    let currentProduct = null;
    let pageIndex = -1;
    let productIndex = -1;

    if (regularData?.pages) {
      for (let i = 0; i < regularData.pages.length; i++) {
        const page = regularData.pages[i];
        const idx = page.products.findIndex(p => p.id === productId);
        if (idx !== -1) {
          currentProduct = page.products[idx];
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
        pageIndex = 0;
        productIndex = idx;
        isFeaturedCache = true;
      }
    }

    if (!currentProduct) {
      toast.error('Product not found');
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
        toast.error('Failed to update vote');
      },
    });
  };

  // ── Skeleton Loader ──
  if (isLoading && !regularProductsAll.length) {
    return (
      <>
        <Meta title="Product Feed – ProductTrend" />
        <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse space-y-6">
          <div className="h-10 w-48 bg-slate-200 rounded-xl" />
          <div className="h-44 bg-slate-200 rounded-3xl" />
          <div className="h-16 bg-slate-200 rounded-2xl" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 h-28" />
            ))}
          </div>
        </div>
      </>
    );
  }

  if (isError && !regularProductsAll.length) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto">
          <p className="text-red-700 font-semibold mb-3">Unable to fetch products right now.</p>
          <button
            onClick={() => refetchRegular()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium text-sm shadow-sm"
          >
            <FiRefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const showFeatured = shouldFetchFeatured && carouselProducts.length > 0;

  return (
    <>
      <Meta title="Product Feed – Discover Top Tech Products" description="Discover and upvote the best products launched today." />

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <FiTrendingUp className="text-purple-600" />
              Product Feed
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Discover, launch, and vote for tomorrow's next big innovation.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => router.push('/productstrend/launch')}
                  className="px-4 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-600/20 text-xs sm:text-sm"
                >
                  + Launch Product
                </button>
                <button
                  onClick={() => router.push('/productstrend/my-products')}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition text-xs sm:text-sm"
                >
                  My Launches
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login?redirect=/productstrend/feed')}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-md shadow-purple-600/20 text-xs sm:text-sm"
              >
                Sign In to Vote
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row items-stretch gap-2.5">
            {/* Search Input Box */}
            <div className="relative flex-1 flex items-center">
              <FiSearch className="absolute left-3.5 text-slate-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search products or makers..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <FiX className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={triggerSearch}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shrink-0"
            >
              Search
            </button>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2">
              <CustomSelect
                value={category}
                onChange={handleCategoryChange}
                options={categoryOptions}
                placeholder="Category"
              />
              <CustomSelect
                value={sortBy}
                onChange={handleSortChange}
                options={sortOptions}
                placeholder="Sort by"
              />
            </div>
          </div>

          {/* Active Filters Chips */}
          {(searchQuery || category !== 'All' || sortBy !== 'most-upvoted') && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 font-medium">Active:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-md font-semibold border border-purple-200">
                    "{searchQuery}"
                    <FiX className="w-3 h-3 cursor-pointer hover:text-purple-900" onClick={() => { setSearchInput(''); setSearchQuery(''); }} />
                  </span>
                )}
                {category !== 'All' && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-md font-semibold border border-purple-200">
                    {category}
                    <FiX className="w-3 h-3 cursor-pointer hover:text-purple-900" onClick={() => setCategory('All')} />
                  </span>
                )}
                {sortBy !== 'most-upvoted' && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded-md font-semibold border border-purple-200">
                    {sortBy.replace('-', ' ')}
                    <FiX className="w-3 h-3 cursor-pointer hover:text-purple-900" onClick={() => setSortBy('most-upvoted')} />
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className="text-red-600 hover:text-red-700 font-bold ml-2 shrink-0"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Hero Spotlight: Top 1, 2, 3 Carousel */}
        {showFeatured && (
          <FeaturedCarousel
            products={carouselProducts}
            onUpvote={handleUpvote}
            isAuthenticated={isAuthenticated}
            isUpvoting={upvoteMutation.isLoading}
          />
        )}

        {/* Regular Feed List */}
        <div>
          {displayedProducts.length === 0 && !regularLoading && !isFetchingNextPage ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-sm px-4">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                🚀
              </div>
              <h3 className="text-lg font-bold text-slate-900">No products found</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                {searchQuery
                  ? 'We couldn\'t find anything matching your search query.'
                  : 'Be the pioneer to launch the very first product in this category!'}
              </p>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => router.push('/productstrend/launch')}
                  className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-md shadow-purple-600/20 text-sm"
                >
                  Launch a Product Now
                </button>
              )}
            </div>
          ) : (
            <>
              {showFeatured && displayedProducts.length > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Popular Launches
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    Showing {displayedProducts.length} items
                  </span>
                </div>
              )}

              <div className="space-y-3.5">
                {displayedProducts.map((product, index) => {
                  const rank = featuredRankMap.get(product.id) || null;
                  return (
                    <ProductCard
                      key={`${product.id}-${sortBy}`}
                      product={product}
                      rank={rank}
                      onUpvote={handleUpvote}
                      isAuthenticated={isAuthenticated}
                      isUpvoting={upvoteMutation.isLoading}
                      ref={index === displayedProducts.length - 1 ? lastElementRef : undefined}
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* Loader indicators */}
          {isRegularFetching && displayedProducts.length > 0 && (
            <div className="py-6 flex justify-center">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200">
                <FiLoader className="w-4 h-4 animate-spin" />
                <span>Refreshing live data...</span>
              </div>
            </div>
          )}

          {hasMore && (
            <div className="py-8 flex justify-center">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <FiLoader className="w-5 h-5 animate-spin text-purple-600" />
                  Fetching more products...
                </div>
              )}
            </div>
          )}

          {!hasMore && displayedProducts.length > 0 && (
            <p className="text-center text-xs font-semibold text-slate-400 py-8">
              You've reached the end of the feed 🎉
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out forwards;
        }
      `}</style>
    </>
  );
}
