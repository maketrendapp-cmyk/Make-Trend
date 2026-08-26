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

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-purple-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200 min-w-[140px] shadow-sm"
      >
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <span className="flex-1 text-left truncate">{selectedLabel}</span>
        <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 animate-fadeIn">
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors duration-150 ${
                  isSelected
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <FiCheck className="w-4 h-4 text-purple-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Product Card ──
const ProductCard = React.forwardRef(({
  product,
  isFeatured = false,
  rank = null,
  onUpvote,
  isAuthenticated,
  isUpvoting,
  compact = false,
}, ref) => {
  const isLiked = product.userVoted || false;
  const upvotes = product.upvotes || 0;
  const hasImage = !!(product.logo || product.imageUrl);

  let cardClasses = 'bg-white rounded-2xl border p-4 hover:shadow-md transition flex items-center gap-4';
  let badge = null;

  if (isFeatured && rank) {
    // Unified gradient for all featured cards – clean and professional
    cardClasses += ' bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 shadow-md';
    
    // Rank badges – clean and modern
    if (rank === 1) {
      badge = (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
          🥇 #1
        </span>
      );
    } else if (rank === 2) {
      badge = (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
          🥈 #2
        </span>
      );
    } else if (rank === 3) {
      badge = (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
          🥉 #3
        </span>
      );
    } else {
      badge = (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-purple-600 bg-purple-100 border border-purple-200">
          🔥 #{rank}
        </span>
      );
    }
  } else {
    cardClasses += ' border-slate-200';
  }

  if (compact) {
    cardClasses = cardClasses.replace('p-4', 'p-3');
  }

  return (
    <div ref={ref} className={cardClasses}>
      <Link href={`/productstrend/${product.id}`} className="flex-shrink-0">
        {hasImage ? (
          <div className={`${compact ? 'w-10 h-10 md:w-12 md:h-12' : 'w-14 h-14 md:w-16 md:h-16'} rounded-full bg-slate-100 overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center`}>
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
          <div className={`${compact ? 'w-10 h-10 md:w-12 md:h-12' : 'w-14 h-14 md:w-16 md:h-16'} rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-3xl text-slate-400 border border-slate-200 shadow-sm`}>
            <FiBox className={`${compact ? 'w-5 h-5' : 'w-7 h-7'}`} />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link href={`/productstrend/${product.id}`} className="block">
              <h3 className={`font-semibold text-slate-900 hover:text-purple-600 transition ${compact ? 'text-sm' : 'text-base'} truncate`}>
                {product.name}
              </h3>
            </Link>
            {isFeatured && badge && (
              <div className="flex items-center gap-2 mt-0.5">
                {badge}
                {!compact && <span className="text-xs text-purple-400">Featured</span>}
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

        {!compact && (
          <>
            <p className="text-sm text-slate-500 line-clamp-2 mt-1">{product.tagline}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {product.maker?.avatar ? (
                    <Image src={product.maker.avatar} alt={product.maker.username || 'User'} width={20} height={20} className="w-full h-full object-cover" />
                  ) : (
                    <FiUser className="w-3 h-3 text-slate-500" />
                  )}
                </span>
                <span className="font-medium text-slate-600">{product.maker?.username || 'Anonymous'}</span>
              </span>
              <span className="flex items-center gap-1"><FiClock className="w-3 h-3" />{formatDate(product.createdAt)}</span>
              <span className="flex items-center gap-1"><FiMessageCircle className="w-3 h-3" />{product.commentsCount || 0}</span>
              {product.category && (
                <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{product.category}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
});
ProductCard.displayName = 'ProductCard';

// ── Featured Carousel (only top 3) ──
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

  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  if (!products.length) return null;

  return (
    <div className="relative bg-gradient-to-r from-purple-100/60 via-indigo-50/80 to-purple-100/60 rounded-3xl p-6 md:p-8 border border-purple-100 shadow-lg mb-10 overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-purple-100 flex-shrink-0">
              <FiTrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 whitespace-nowrap">
                🔥 Featured Products
              </h2>
              <p className="text-sm text-slate-500 hidden sm:block">
                The top 3 most upvoted products {total > 1 && `– #${currentIndex+1}`}
              </p>
            </div>
          </div>
          {total > 1 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={prev}
                className="p-2 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 hover:bg-purple-50 hover:border-purple-300 transition shadow-sm"
                aria-label="Previous"
              >
                <FiChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button
                onClick={next}
                className="p-2 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 hover:bg-purple-50 hover:border-purple-300 transition shadow-sm"
                aria-label="Next"
              >
                <FiChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          )}
        </div>

        <div
          className="relative transition-all duration-500 ease-in-out"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {products.map((product, idx) => (
              <div key={product.id} className="w-full flex-shrink-0 px-2">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8">
                  <ProductCard
                    product={product}
                    isFeatured
                    rank={idx + 1}
                    onUpvote={onUpvote}
                    isAuthenticated={isAuthenticated}
                    isUpvoting={isUpvoting}
                    compact={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {total > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {products.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'w-8 bg-purple-600' : 'bg-purple-200 hover:bg-purple-300'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {total > 1 && (
          <div className="text-center mt-3 text-xs text-slate-400">
            <span>Slide {currentIndex+1} of {total}</span>
          </div>
        )}
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

  // ── Featured only when `most-upvoted` and no search ──
  const shouldFetchFeatured = sortBy === 'most-upvoted' && !searchQuery;
  const featuredFilters = useMemo(() => {
    const filters = { sort: 'most-upvoted', limit: 100 };
    if (category !== 'All') filters.category = category;
    return filters;
  }, [category]);

  // ── Featured feed ──
  const {
    data: featuredData,
    refetch: refetchFeatured,
  } = useProductFeed(featuredFilters, shouldFetchFeatured);

  // ── Regular feed ──
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
  const carouselProducts = featuredProductsAll.slice(0, 3);        // only top 3 in carousel
  const remainingFeatured = featuredProductsAll.slice(3);          // ranks 4+ go to regular list
  const carouselIds = new Set(carouselProducts.map(p => p.id));

  // ── Build rank map for all featured products ──
  const featuredRankMap = new Map(featuredProductsAll.map((p, idx) => [p.id, idx + 1]));

  // ── Regular products from regular query ──
  const regularProductsAll = regularData?.pages?.flatMap((page) => page.products) || [];
  // Exclude carousel products (top 3) to avoid duplicates
  const filteredRegular = regularProductsAll.filter(p => !carouselIds.has(p.id));

  // ── Combine: remaining featured (4+) at the top, then the rest ──
  const displayedProducts = [
    ...remainingFeatured,
    ...filteredRegular.filter(p => !featuredRankMap.has(p.id))
  ];

  const hasMore = hasNextPage;
  const isLoading = regularLoading && !regularProductsAll.length;
  const isError = regularError && !regularProducts.length;

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

  // ── Scroll to top helper ──
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Handlers ──
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

  // ── Upvote handler ──
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

  // ── Loading state ──
  if (isLoading && !regularProductsAll.length) {
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

  if (isError && !regularProductsAll.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-600 font-medium">Failed to load products.</p>
          <button onClick={() => refetchRegular()} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition">
            <FiRefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const showFeatured = shouldFetchFeatured && carouselProducts.length > 0;
  const filterKey = `${sortBy}-${category}-${searchQuery}`;

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
            {/* Search */}
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search products or @username..."
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

            {/* ── CUSTOM DROPDOWNS ── */}
            <div className="flex flex-wrap items-center gap-2">
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

        {/* ── Featured Carousel (top 3 only) ── */}
        {showFeatured && (
          <FeaturedCarousel
            products={carouselProducts}
            onUpvote={handleUpvote}
            isAuthenticated={isAuthenticated}
            isUpvoting={upvoteMutation.isLoading}
          />
        )}

        {/* ── Regular Products (including remaining featured 4+) ── */}
        <div>
          {displayedProducts.length === 0 && !regularLoading && !isFetchingNextPage ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-slate-900">
                {showFeatured ? 'No more products' : 'No products found'}
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
            <>
              {showFeatured && displayedProducts.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-bold text-slate-900">📰 More Products</h2>
                </div>
              )}
              <div key={filterKey} className="space-y-4">
                {displayedProducts.map((product, index) => {
                  const rank = featuredRankMap.get(product.id) || null;
                  const isFeatured = rank !== null && rank > 3;
                  return (
                    <ProductCard
                      key={`${product.id}-${sortBy}`}
                      product={product}
                      isFeatured={isFeatured}
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

          {isRegularFetching && displayedProducts.length > 0 && (
            <div className="py-4 flex justify-center">
              <div className="flex items-center gap-2 text-slate-400">
                <FiLoader className="w-5 h-5 animate-spin text-purple-600" />
                <span>Refreshing...</span>
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

          {!hasMore && displayedProducts.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-6">You've reached the end 🎉</p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}