
// pages/productstrend/feed.js
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';

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
    <div className="relative flex-1" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-white border border-slate-200 hover:border-purple-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 shadow-sm"
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-slate-400 shrink-0" />}
          <span className="truncate">{selectedLabel}</span>
        </span>
        <FiChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl py-1.5 z-50 animate-fadeIn">
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                  isSelected
                    ? 'bg-purple-50 text-purple-700 font-bold'
                    : 'text-slate-600 hover:bg-slate-50 font-medium'
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

  let badge = null;
  if (isFeatured && rank) {
    if (rank === 1) {
      badge = <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-yellow-100 text-yellow-800">🥇 #1</span>;
    } else if (rank === 2) {
      badge = <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 text-slate-700">🥈 #2</span>;
    } else if (rank === 3) {
      badge = <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-orange-100 text-orange-800">🥉 #3</span>;
    } else {
      badge = <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold text-purple-600 bg-purple-100">🔥 #{rank}</span>;
    }
  }

  return (
    <div
      ref={ref}
      className="group bg-white rounded-3xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-4 sm:p-5 hover:border-purple-200 hover:shadow-lg transition-all duration-300 flex items-start sm:items-center gap-4 relative"
    >
      {/* Product Logo */}
      <Link href={`/productstrend/${product.id}`} className="shrink-0">
        {hasImage ? (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
            <img
              src={product.logo || product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          </div>
        ) : (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-slate-100 flex items-center justify-center text-purple-400 shadow-sm group-hover:scale-105 transition-transform duration-200">
            <FiBox className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        )}
      </Link>

      {/* Main Product Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Link href={`/productstrend/${product.id}`}>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 hover:text-purple-600 transition-colors truncate">
                {product.name}
              </h3>
            </Link>
            
            <div className="flex items-center gap-2 mt-1 mb-1.5 flex-wrap">
              {isFeatured && rank && badge}
              {isFeatured && (
                <span className="text-[11px] font-semibold text-purple-400 shrink-0">Featured</span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 sm:line-clamp-2 leading-relaxed">
              {product.tagline || 'Discover this amazing product.'}
            </p>
          </div>

          {/* Upvote Button - Heart Style */}
          <button
            type="button"
            onClick={() => onUpvote(product.id)}
            disabled={!isAuthenticated || isUpvoting}
            className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 shadow-sm active:scale-95 ${
              isLiked
                ? 'bg-purple-100 border-purple-200 text-purple-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isAuthenticated ? 'Upvote' : 'Sign in to upvote'}
          >
            <FiHeart className={`w-4 h-4 transition-colors ${isLiked ? 'fill-purple-600 text-purple-600' : ''}`} />
            <span className="text-xs sm:text-sm font-bold">{upvotes}</span>
          </button>
        </div>

        {/* Footer Meta */}
        <div className="flex items-center justify-between gap-3 mt-3">
          <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-5 h-5 rounded-full bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                {product.maker?.avatar ? (
                  <img src={product.maker.avatar} alt={product.maker.username || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="w-3 h-3 text-slate-400" />
                )}
              </span>
              <span className="font-semibold text-slate-600 truncate max-w-[90px] sm:max-w-none">
                {product.maker?.username || 'Anonymous'}
              </span>
            </span>

            <span className="flex items-center gap-1 shrink-0">
              <FiClock className="w-3.5 h-3.5" />
              {formatDate(product.createdAt)}
            </span>

            <span className="flex items-center gap-1 shrink-0">
              <FiMessageCircle className="w-3.5 h-3.5" />
              {product.commentsCount || 0}
            </span>
          </div>

          {product.category && (
            <span className="hidden sm:inline-flex text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md shrink-0">
              {product.category}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
ProductCard.displayName = 'ProductCard';

// ── Featured Carousel (Top Products) ──
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
    timerRef.current = setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, [currentIndex, isAutoPlaying, isSingle]);

  if (!products.length) return null;

  return (
    <div className="mb-8 relative rounded-[2rem] bg-gradient-to-b from-purple-50/80 to-white/40 p-5 sm:p-8 shadow-sm border border-purple-100 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div className="flex items-center gap-2">
          <FiTrendingUp className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            🔥 Featured Products
          </h2>
        </div>
        
        {total > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={prev}
              className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center hover:bg-purple-50 hover:text-purple-600 transition"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center hover:bg-purple-50 hover:text-purple-600 transition"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Carousel Container */}
      <div
        className="relative overflow-hidden"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {products.map((product, idx) => (
            <div key={product.id} className="w-full shrink-0 px-1 sm:px-2">
              <ProductCard
                product={product}
                isFeatured
                rank={idx + 1}
                onUpvote={onUpvote}
                isAuthenticated={isAuthenticated}
                isUpvoting={isUpvoting}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots Indicator */}
      {total > 1 && (
        <div className="flex flex-col items-center mt-5">
          <div className="flex justify-center gap-2">
            {products.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'w-6 bg-purple-600' : 'w-1.5 bg-purple-200 hover:bg-purple-400'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            </div>
          <span className="text-[10px] font-semibold text-slate-400 mt-2">Slide {currentIndex + 1} of {total}</span>
        </div>
      )}
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

  // ── Dropdown options ──
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
        toast.error('Failed to update vote');
      },
    });
  };

  return (
    <>
      <Meta title="Product Feed – Discover Top Tech Products" description="Discover and upvote the best products launched today." />

      <div className="min-h-screen bg-slate-50/50 pb-16">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                <FiTrendingUp className="text-purple-600" />
                Product Feed
              </h1>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto w-full sm:w-auto">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => router.push('/productstrend/launch')}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-sm text-sm"
                  >
                    Launch Product
                  </button>
                  <button
                    onClick={() => router.push('/productstrend/my-products')}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm text-sm"
                  >
                    My Products
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push('/login?redirect=/productstrend/feed')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-sm text-sm"
                >
                  Sign In to Upvote
                </button>
              )}
            </div>
          </div>

          {/* Search & Filters Toolbar */}
          <div className="mb-8 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              
              {/* Search Box */}
              <div className="relative flex-1 flex items-center bg-white rounded-xl border border-slate-200 shadow-sm p-1">
                <FiSearch className="absolute left-3.5 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search products or @username..."
                  className="w-full pl-10 pr-9 py-2 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="absolute right-20 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={triggerSearch}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-bold ml-auto"
                >
                  Search
                </button>
              </div>

            </div>
            
            {/* Filter Dropdowns */}
            <div className="flex items-center gap-3">
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
            <div className="flex items-center justify-between mb-6 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-bold border border-purple-100">
                    Search: {searchQuery}
                    <FiX className="w-3 h-3 cursor-pointer" onClick={() => { setSearchInput(''); setSearchQuery(''); }} />
                  </span>
                )}
                {category !== 'All' && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-bold border border-purple-100">
                    {category}
                    <FiX className="w-3 h-3 cursor-pointer" onClick={() => setCategory('All')} />
                  </span>
                )}
                {sortBy !== 'most-upvoted' && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-bold border border-purple-100">
                    {sortBy.replace('-', ' ')}
                    <FiX className="w-3 h-3 cursor-pointer" onClick={() => setSortBy('most-upvoted')} />
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-1 rounded-md transition"
              >
                Clear
              </button>
            </div>
          )}

          {/* ── Content Area ── */}
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-44 bg-slate-200 rounded-[2rem]" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 h-28" />
              ))}
            </div>
          ) : isError && !regularProductsAll.length ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-slate-800 font-bold mb-3">Failed to load products.</p>
              <button
                onClick={() => refetchRegular()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-bold"
              >
                <FiRefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          ) : (
            <>
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
                {displayedProducts.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 shadow-sm px-4">
                    <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                      🚀
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No products found</h3>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1 mb-5">
                      {searchQuery
                        ? 'We couldn\'t find anything matching your search query.'
                        : 'Be the pioneer to launch the very first product in this category!'}
                    </p>
                    {isAuthenticated && !searchQuery && (
                      <button
                        type="button"
                        onClick={() => router.push('/productstrend/launch')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition shadow-sm text-sm"
                      >
                        Launch a Product Now
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {showFeatured && displayedProducts.length > 0 && (
                      <div className="flex items-center gap-2 mb-4 mt-2">
                        <div className="p-1.5 bg-slate-200 text-slate-600 rounded-md">
                          <FiClock className="w-4 h-4" />
                        </div>
                        <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                          More Products
                        </h2>
                      </div>
                    )}

                    <div className="space-y-4">
                      {displayedProducts.map((product, index) => {
                        const rank = featuredRankMap.get(product.id) || null;
                        return (
                          <ProductCard
                            key={`${product.id}-${sortBy}`}
                            product={product}
                            rank={rank}
                            isFeatured={rank !== null && rank > 3}
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
                    You've reached the end 🎉
                  </p>
                )}
              </div>
            </>
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