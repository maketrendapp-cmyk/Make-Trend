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

const CATEGORIES = ['All', 'Tech', 'Design', 'AI', 'Productivity', 'Education', 'Health', 'Fitness', 'Gaming', 'Social', 'Marketing', 'SaaS', 'Developer Tools', 'Other'];

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

// ── Custom Select ──
const CustomSelect = ({ value, onChange, options, placeholder }) => {
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:border-purple-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition min-w-[140px]"
      >
        <span className="truncate">{selectedLabel}</span>
        <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto py-1">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition ${
                value === option.value ? 'bg-purple-50 text-purple-700 font-medium' : 'text-slate-700'
              }`}
            >
              <span>{option.label}</span>
              {value === option.value && <FiCheck className="w-4 h-4 text-purple-600" />}
            </button>
          ))}
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

  let cardClasses = 'bg-white rounded-2xl border p-4 hover:shadow-lg transition-shadow flex items-center gap-4';
  let badge = null;

  if (isFeatured && rank) {
    cardClasses += ' border-purple-200 bg-purple-50/30';
    const rankEmojis = ['🥇', '🥈', '🥉'];
    const rankColors = ['text-yellow-600 bg-yellow-100', 'text-slate-600 bg-slate-200', 'text-orange-600 bg-orange-100'];
    if (rank <= 3) {
      badge = (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${rankColors[rank-1]}`}>
          {rankEmojis[rank-1]} #{rank}
        </span>
      );
    } else {
      badge = (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-purple-600 bg-purple-100">
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
          <div className={`${compact ? 'w-10 h-10 md:w-12 md:h-12' : 'w-14 h-14 md:w-16 md:h-16'} rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center`}>
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
                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-slate-300"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>`;
                }
              }}
            />
          </div>
        ) : (
          <div className={`${compact ? 'w-10 h-10 md:w-12 md:h-12' : 'w-14 h-14 md:w-16 md:h-16'} rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200`}>
            <FiBox className="w-6 h-6" />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/productstrend/${product.id}`} className="block">
              <h3 className={`font-semibold text-slate-900 hover:text-purple-600 transition ${compact ? 'text-sm' : 'text-base'} truncate`}>
                {product.name}
              </h3>
            </Link>
            {isFeatured && badge && <div className="mt-1">{badge}</div>}
          </div>
          <button
            onClick={() => onUpvote(product.id)}
            disabled={!isAuthenticated || isUpvoting}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition text-xs font-medium flex-shrink-0 ${
              isLiked
                ? 'bg-purple-100 border-purple-300 text-purple-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-purple-50 hover:border-purple-200'
            } disabled:opacity-50`}
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
                <span className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                  {product.maker?.avatar ? (
                    <Image src={product.maker.avatar} alt="" width={20} height={20} className="w-full h-full object-cover" />
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

// ── Featured Carousel ──
const FeaturedCarousel = ({ products, onUpvote, isAuthenticated, isUpvoting }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const timerRef = useRef(null);
  const [touchStart, setTouchStart] = useState(0);

  const total = products.length;

  const goTo = (index) => {
    if (index < 0) index = total - 1;
    if (index >= total) index = 0;
    setCurrentIndex(index);
  };

  const next = () => goTo(currentIndex + 1);
  const prev = () => goTo(currentIndex - 1);

  useEffect(() => {
    if (!isAutoPlaying || total <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(next, 5000);
    return () => clearInterval(timerRef.current);
  }, [currentIndex, isAutoPlaying, total]);

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
  };

  if (!products.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-10 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FiTrendingUp className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-bold text-slate-900">🔥 Featured</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Top 3</span>
        </div>
        {total > 1 && (
          <div className="flex gap-2">
            <button onClick={prev} className="p-1.5 rounded-full border border-slate-200 hover:bg-purple-50 transition">
              <FiChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button onClick={next} className="p-1.5 rounded-full border border-slate-200 hover:bg-purple-50 transition">
              <FiChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        )}
      </div>

      <div
        className="relative overflow-hidden"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {products.map((product, idx) => (
            <div key={product.id} className="w-full flex-shrink-0 px-1">
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
          ))}
        </div>
      </div>

      {total > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {products.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex ? 'w-6 bg-purple-600' : 'w-1.5 bg-slate-300'
              }`}
            />
          ))}
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

  const regularFilters = useMemo(() => {
    const f = {};
    if (searchQuery.trim()) f.search = searchQuery.trim();
    if (category !== 'All') f.category = category;
    f.sort = sortBy;
    return f;
  }, [searchQuery, category, sortBy]);

  const shouldFetchFeatured = sortBy === 'most-upvoted' && !searchQuery;
  const featuredFilters = useMemo(() => ({
    sort: 'most-upvoted',
    limit: 100,
    ...(category !== 'All' && { category }),
  }), [category]);

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

  const featuredProductsAll = shouldFetchFeatured ? (featuredData?.pages?.[0]?.products || []) : [];
  const carouselProducts = featuredProductsAll.slice(0, 3);
  const remainingFeatured = featuredProductsAll.slice(3);
  const carouselIds = new Set(carouselProducts.map(p => p.id));

  const featuredRankMap = new Map(featuredProductsAll.map((p, idx) => [p.id, idx + 1]));

  const regularProductsAll = regularData?.pages?.flatMap((page) => page.products) || [];
  const filteredRegular = regularProductsAll.filter(p => !carouselIds.has(p.id));

  const displayedProducts = [
    ...remainingFeatured,
    ...filteredRegular.filter(p => !featuredRankMap.has(p.id))
  ];

  const hasMore = hasNextPage;
  const isLoading = regularLoading && !regularProductsAll.length;
  const isError = regularError && !regularProductsAll.length;

  const upvoteMutation = useUpvoteProduct();

  const observerRef = useRef(null);
  const lastElementRef = useCallback((node) => {
    if (isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) fetchNextPage();
      },
      { threshold: 0.1 }
    );
    if (node) observerRef.current.observe(node);
  }, [isFetchingNextPage, hasMore, fetchNextPage]);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

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

  const categoryOptions = CATEGORIES.map(cat => ({ value: cat, label: cat }));
  const sortOptions = [
    { value: 'most-upvoted', label: 'Most Upvoted' },
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'most-commented', label: 'Most Comments' },
  ];

  const handleUpvote = (productId) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/productstrend/feed');
      return;
    }

    // Find product in cache
    let currentProduct = null;
    let pageIndex = -1;
    let productIndex = -1;
    let isFeaturedCache = false;

    if (regularData?.pages) {
      for (let i = 0; i < regularData.pages.length; i++) {
        const idx = regularData.pages[i].products.findIndex(p => p.id === productId);
        if (idx !== -1) {
          currentProduct = regularData.pages[i].products[idx];
          pageIndex = i;
          productIndex = idx;
          break;
        }
      }
    }

    if (!currentProduct && featuredData?.pages) {
      const idx = featuredData.pages[0].products.findIndex(p => p.id === productId);
      if (idx !== -1) {
        currentProduct = featuredData.pages[0].products[idx];
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

    // Update both feeds optimistically
    const feedKey = isFeaturedCache ? ['productFeed', featuredFilters] : ['productFeed', regularFilters];
    const feedData = queryClient.getQueryData(feedKey);
    if (feedData) {
      const newPages = feedData.pages.map((page, idx) => {
        if (idx === pageIndex) {
          return {
            ...page,
            products: page.products.map((p, pIdx) => pIdx === productIndex ? updatedProduct : p)
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

  if (isLoading && !regularProductsAll.length) {
    return (
      <>
        <Meta title="Product Feed" />
        <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6" />
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="h-10 w-48 bg-slate-200 rounded-xl" />
            <div className="h-10 w-32 bg-slate-200 rounded-xl" />
            <div className="h-10 w-32 bg-slate-200 rounded-xl" />
          </div>
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 h-24" />
          ))}
        </div>
      </>
    );
  }

  if (isError) {
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

  return (
    <>
      <Meta title="Product Feed – ProductTrend" />
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
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium shadow-sm"
                >
                  Launch Product
                </button>
                <button
                  onClick={() => router.push('/productstrend/my-products')}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition text-sm font-medium"
                >
                  My Products
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/login?redirect=/productstrend/feed')}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium"
              >
                Sign In to Upvote
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
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
                  placeholder="Search products or @username..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                />
                {searchInput && (
                  <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button onClick={triggerSearch} className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium flex items-center gap-1.5 whitespace-nowrap">
                <FiSearch className="w-4 h-4" /> Search
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CustomSelect value={category} onChange={handleCategoryChange} options={categoryOptions} placeholder="Category" />
              <CustomSelect value={sortBy} onChange={handleSortChange} options={sortOptions} placeholder="Sort by" />
            </div>
          </div>

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
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear All</button>
            </div>
          )}
        </div>

        {/* Featured Carousel */}
        {showFeatured && (
          <FeaturedCarousel
            products={carouselProducts}
            onUpvote={handleUpvote}
            isAuthenticated={isAuthenticated}
            isUpvoting={upvoteMutation.isLoading}
          />
        )}

        {/* Regular List */}
        <div>
          {displayedProducts.length === 0 && !regularLoading && !isFetchingNextPage ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-slate-900">
                {showFeatured ? 'No more products' : 'No products found'}
              </h3>
              <p className="text-slate-500 text-sm">
                {searchQuery ? 'No results match your search.' : isAuthenticated ? 'Be the first to launch a product!' : 'Sign in to join the community.'}
              </p>
              {isAuthenticated && !searchQuery && (
                <button onClick={() => router.push('/productstrend/launch')} className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition">
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
              <div className="space-y-4">
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
                <FiLoader className="w-5 h-5 animate-spin text-purple-600" /> Refreshing...
              </div>
            </div>
          )}

          {hasMore && (
            <div className="py-6 flex justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <FiLoader className="w-5 h-5 animate-spin text-purple-600" /> Loading more...
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
    </>
  );
}