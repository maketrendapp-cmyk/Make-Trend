// pages/productstrend/my-products.js
import React, { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import {
  useMyProducts,
  useDeleteProduct,
  useInvalidateQueries,
  useMtCoins,
  useBuyUpvotes,
} from '../../lib/queries';
import {
  FiGrid,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiHeart,
  FiMessageCircle,
  FiClock,
  FiLoader,
  FiRefreshCw,
  FiArrowLeft,
  FiSearch,
  FiX,
  FiExternalLink,
  FiUser,
  FiFilter,
  FiChevronDown,
  FiAlertTriangle,
  FiTag,
  FiAward,
  FiTrendingUp,
  FiCheck,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABELS = {
  pending: '⏳ Pending',
  approved: '✅ Approved',
  rejected: '❌ Rejected',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'Tech', label: 'Tech' },
  { value: 'Design', label: 'Design' },
  { value: 'AI', label: 'AI' },
  { value: 'Productivity', label: 'Productivity' },
  { value: 'Education', label: 'Education' },
  { value: 'Health', label: 'Health' },
  { value: 'Fitness', label: 'Fitness' },
  { value: 'Gaming', label: 'Gaming' },
  { value: 'Social', label: 'Social' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'SaaS', label: 'SaaS' },
  { value: 'Developer Tools', label: 'Developer Tools' },
  { value: 'Other', label: 'Other' },
];

const UPVOTE_COST = 5;
const MAX_UPVOTES = 1000;

// ─── CUSTOM SELECT COMPONENT ──────────────────────────────────
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
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200 hover:border-purple-300"
      >
        <span className="truncate">{selectedLabel}</span>
        <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors duration-150 ${
                  isSelected
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate pr-2">{option.label}</span>
                {isSelected && <FiCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
// ─── END CUSTOM SELECT ────────────────────────────────────────

export default function MyProducts() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateMyProducts } = useInvalidateQueries();
  const deleteMutation = useDeleteProduct();
  const buyUpvotesMutation = useBuyUpvotes();

  // ── Filter state ──
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');      // what user types
  const [searchQuery, setSearchQuery] = useState('');      // what is actually sent to backend

  // ── Applied filters (search only changes when user clicks button or Enter) ──
  const filters = {
    status: statusFilter,
    category: categoryFilter || undefined,
    search: searchQuery.trim() || undefined,
  };

  // ── Fetch MT Coins ──
  const { data: mtCoinsData, isLoading: mtCoinsLoading, refetch: refetchMtCoins } = useMtCoins(isAuthenticated);

  // ── React Query: My Products (infinite) ──
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    refetch,
    isError,
  } = useMyProducts(filters, isAuthenticated);

  const allProducts = data?.pages?.flatMap((page) => page.products) || [];
  const hasMore = hasNextPage;

  // ── Delete modal state ──
  const [deleteModal, setDeleteModal] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Boost modal state ──
  const [boostProduct, setBoostProduct] = useState(null);
  const [boostAmount, setBoostAmount] = useState(10);
  const [isBoosting, setIsBoosting] = useState(false);

  const confirmDelete = (product) => {
    setDeleteModal(product);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);

    const productId = deleteModal.id;
    const queryKey = ['myProducts', filters];

    // Optimistically remove from cache
    queryClient.setQueryData(queryKey, (oldData) => {
      if (!oldData) return oldData;
      const newPages = oldData.pages.map((page) => ({
        ...page,
        products: page.products.filter((p) => p.id !== productId),
      }));
      return { ...oldData, pages: newPages };
    });

    try {
      await deleteMutation.mutateAsync(productId);
      await invalidateMyProducts();
      queryClient.setQueryData(
        queryKey,
        (oldData) => {
          if (!oldData) return oldData;
          return { ...oldData, pages: oldData.pages.slice(0, 1) };
        }
      );
      await refetch({ force: true });
      toast.success('Product deleted');
      setDeleteModal(null);
    } catch (err) {
      await refetch();
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Handle Boost Purchase ──
  const handleBoost = async () => {
    if (!boostProduct) return;
    if (boostAmount < 1 || boostAmount > MAX_UPVOTES) {
      toast.error(`Amount must be between 1 and ${MAX_UPVOTES}`);
      return;
    }
    const cost = boostAmount * UPVOTE_COST;
    const available = mtCoinsData?.available || 0;
    if (cost > available) {
      toast.error(`Insufficient MT Coins. You need ${cost}, have ${available}`);
      return;
    }

    setIsBoosting(true);
    try {
      await buyUpvotesMutation.mutateAsync({
        productId: boostProduct.id,
        amount: boostAmount,
      });
      toast.success(`Added ${boostAmount} upvotes to "${boostProduct.name}"!`);
      await refetch();
      await refetchMtCoins();
      setBoostProduct(null);
      setBoostAmount(10);
    } catch (err) {
      toast.error(err.message || 'Failed to boost product');
    } finally {
      setIsBoosting(false);
    }
  };

  // ── Intersection Observer ──
  const observerRef = useRef(null);

  useEffect(() => {
    if (isFetchingNextPage || !hasMore || allProducts.length === 0) return;

    const lastElement = document.querySelector('#my-products-end');
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
  }, [isFetchingNextPage, hasMore, allProducts.length, fetchNextPage]);

  // ── Format date ──
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
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // ── Apply search ──
  const applySearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applySearch();
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('');
    setSearchInput('');
    setSearchQuery('');
  };

  const hasFilters = statusFilter !== 'all' || categoryFilter || searchQuery;

  // ── Loading state ──
  if (isLoading) {
    return (
      <>
        <Meta title="My Products – ProductTrend" />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-slate-200 rounded-full" />
              <div className="h-8 w-48 bg-slate-200 rounded-lg" />
            </div>
            <div className="h-10 w-32 bg-slate-200 rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6 animate-pulse">
            <div className="h-10 w-full bg-slate-200 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                <div className="aspect-video bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-full" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="flex justify-between pt-3 border-t border-slate-100">
                    <div className="h-8 bg-slate-200 rounded w-16" />
                    <div className="h-8 bg-slate-200 rounded w-16" />
                    <div className="h-8 bg-slate-200 rounded w-16" />
                  </div>
                </div>
              </div>
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
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition"
          >
            <FiRefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="My Products – ProductTrend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-sm p-8 text-center border border-slate-100">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600">
              <FiGrid className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Sign In Required</h2>
            <p className="text-slate-500 text-sm mb-6">Please sign in to view your products.</p>
            <button
              onClick={() => router.push('/login?redirect=/productstrend/my-products')}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  const earnedFromProducts = mtCoinsData?.earnedFromProducts ?? 0;
  const availableCoins = mtCoinsData?.available ?? 0;

  return (
    <>
      <Meta title="My Products – ProductTrend" />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ── Header & Earnings ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/productstrend/feed"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              title="Back to Feed"
            >
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <FiGrid className="text-purple-600" />
                My Products
                <span className="text-sm font-normal text-slate-400 ml-2">
                  ({allProducts.length})
                </span>
              </h1>
              <p className="text-sm text-slate-400">Manage your launched products</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-indigo-50 px-4 py-2 rounded-xl border border-purple-100 shadow-sm">
              <FiAward className="w-5 h-5 text-purple-600" />
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">Earned from upvotes</p>
                <p className="text-lg font-bold text-purple-700">
                  {mtCoinsLoading ? '...' : earnedFromProducts}
                  <span className="text-xs font-normal text-slate-400 ml-1">MT Coins</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/productstrend/launch')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition shadow-sm text-sm font-medium hover:scale-105 active:scale-95"
            >
              <FiPlus className="w-4 h-4" /> Launch New
            </button>
          </div>
        </div>

        {/* ── Filters & Search ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search your products..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={applySearch}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium flex items-center gap-1.5 whitespace-nowrap"
              >
                <FiSearch className="w-4 h-4" /> Search
              </button>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-44">
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={STATUS_OPTIONS}
                placeholder="All Statuses"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-48">
              <CustomSelect
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                options={CATEGORY_OPTIONS}
                placeholder="All Categories"
              />
            </div>

            {/* Clear Filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition whitespace-nowrap"
              >
                <FiX className="inline w-4 h-4 mr-1" /> Clear
              </button>
            )}
          </div>

          {/* Active filters count */}
          {hasFilters && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Showing {allProducts.length} products
                {statusFilter && statusFilter !== 'all' && <span className="ml-2">• Status: {statusFilter}</span>}
                {categoryFilter && <span className="ml-2">• Category: {categoryFilter}</span>}
                {searchQuery && <span className="ml-2">• Search: "{searchQuery}"</span>}
              </p>
            </div>
          )}
        </div>

        {/* ── Products Grid ── */}
        {allProducts.length === 0 && !isLoading && !isFetchingNextPage ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-slate-900">
              {hasFilters ? 'No matching products' : 'No products launched yet'}
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              {hasFilters
                ? 'Try adjusting your filters or search term.'
                : 'Share your creation with the community'}
            </p>
            {!hasFilters && (
              <button
                onClick={() => router.push('/productstrend/launch')}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition shadow-sm"
              >
                <FiPlus className="w-4 h-4" /> Launch Your First Product
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allProducts.map((product) => (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
                >
                  <Link
                    href={`/productstrend/${product.id}`}
                    className="block relative aspect-video bg-slate-100 overflow-hidden"
                  >
                    {product.thumbnail || product.imageUrl ? (
                      <Image
                        src={product.thumbnail || product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        quality={85}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl text-slate-300">
                        🚀
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-[10px] font-medium px-2.5 py-1 rounded-full border shadow-sm ${
                          STATUS_BADGE[product.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {STATUS_LABELS[product.status] || product.status || 'Pending'}
                      </span>
                    </div>
                  </Link>

                  <div className="p-5 flex flex-col flex-1">
                    <Link
                      href={`/productstrend/${product.id}`}
                      className="block group-hover:text-purple-600 transition-colors"
                    >
                      <h3 className="font-semibold text-slate-900 text-base line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-slate-500 line-clamp-2 mt-1 flex-1">
                      {product.tagline}
                    </p>

                    {product.logo && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                          <Image
                            src={product.logo}
                            alt="Logo"
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Logo</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <FiHeart className="w-3.5 h-3.5" />
                        {product.upvotes || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiMessageCircle className="w-3.5 h-3.5" />
                        {product.commentsCount || 0}
                      </span>
                      <span className="flex items-center gap-1 ml-auto">
                        <FiClock className="w-3.5 h-3.5" />
                        {formatDate(product.createdAt)}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-3 pt-2 border-t border-slate-100">
                      <Link
                        href={`/productstrend/${product.id}`}
                        className="flex-1 text-center text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition"
                      >
                        View
                      </Link>
                      <Link
                        href={`/productstrend/launch?id=${product.id}`}
                        className="flex-1 text-center text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
                      >
                        <FiEdit2 className="inline w-3 h-3 mr-1" /> Edit
                      </Link>
                      {product.status === 'approved' && (
                        <button
                          onClick={() => setBoostProduct(product)}
                          className="flex-1 text-center text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition"
                        >
                          <FiTrendingUp className="inline w-3 h-3 mr-1" /> Boost
                        </button>
                      )}
                      <button
                        onClick={() => confirmDelete(product)}
                        className="flex-1 text-center text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                      >
                        <FiTrash2 className="inline w-3 h-3 mr-1" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div id="my-products-end" className="py-8 flex justify-center">
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <FiLoader className="w-5 h-5 animate-spin text-purple-600" />
                    Loading more...
                  </div>
                ) : (
                  <div className="h-4" />
                )}
              </div>
            )}

            {!hasMore && allProducts.length > 0 && (
              <p className="text-center text-xs text-slate-400 py-6">
                You've reached the end of your products 🎉
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiAlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1.5">Delete Product</h3>
            <p className="text-gray-500 text-xs sm:text-sm mb-6 leading-relaxed">
              Are you sure you want to delete <strong>{deleteModal.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {isDeleting ? <FiLoader className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Boost Modal ── */}
      {boostProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">🚀 Boost Product</h3>
              <button
                onClick={() => setBoostProduct(null)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-600">
                <strong>{boostProduct.name}</strong>
              </p>
              <p className="text-xs text-slate-400">
                Current upvotes: <strong>{boostProduct.upvotes || 0}</strong>
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-3 border border-purple-200 mb-4">
              <p className="text-sm font-medium text-purple-800">Available MT Coins</p>
              <p className="text-2xl font-bold text-purple-700">{availableCoins}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Number of Upvotes (max {MAX_UPVOTES})
              </label>
              <input
                type="number"
                min="1"
                max={MAX_UPVOTES}
                value={boostAmount}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setBoostAmount(Math.min(Math.max(val, 1), MAX_UPVOTES));
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition"
              />
            </div>

            <div className="flex justify-between text-sm text-slate-600 mb-4">
              <span>Cost per upvote:</span>
              <span className="font-medium">{UPVOTE_COST} MT Coins</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-3 mb-4">
              <span>Total cost:</span>
              <span className="text-purple-600">{boostAmount * UPVOTE_COST} MT Coins</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mb-4">
              <span>New upvotes:</span>
              <span>{(boostProduct.upvotes || 0) + boostAmount}</span>
            </div>

            <button
              onClick={handleBoost}
              disabled={isBoosting || (boostAmount * UPVOTE_COST) > availableCoins}
              className={`w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 ${
                (isBoosting || (boostAmount * UPVOTE_COST) > availableCoins)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:shadow-lg hover:-translate-y-0.5'
              }`}
            >
              {isBoosting ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <FiTrendingUp className="w-4 h-4" /> Buy Upvotes
                </>
              )}
            </button>
            {(boostAmount * UPVOTE_COST) > availableCoins && (
              <p className="text-xs text-red-500 mt-2 text-center">
                Insufficient MT Coins. You need {boostAmount * UPVOTE_COST}, have {availableCoins}.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}