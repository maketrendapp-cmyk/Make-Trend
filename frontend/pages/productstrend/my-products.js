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
  FiAlertTriangle,      // ← import added
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
  { value: '', label: 'All Statuses' },
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

export default function MyProducts() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateMyProducts } = useInvalidateQueries();
  const deleteMutation = useDeleteProduct();

  // ── Filter state ──
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filters = {
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
  };

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

  // ── Local search ──
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return allProducts;
    const term = searchTerm.trim().toLowerCase();
    return allProducts.filter((p) =>
      p.name?.toLowerCase().includes(term) ||
      p.tagline?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    );
  }, [allProducts, searchTerm]);

  // ── Delete modal state ──
  const [deleteModal, setDeleteModal] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = (product) => {
    setDeleteModal(product);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);

    const productId = deleteModal.id;
    const queryKey = ['myProducts', { status: statusFilter || undefined, category: categoryFilter || undefined }];

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
      await refetch();
      toast.success('Product deleted');
      setDeleteModal(null);
    } catch (err) {
      await refetch();
      toast.error('Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Intersection Observer for infinite scroll ──
  const observerRef = useRef(null);

  useEffect(() => {
    if (isFetchingNextPage || !hasMore || filteredProducts.length === 0) return;

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
  }, [isFetchingNextPage, hasMore, filteredProducts.length, fetchNextPage]);

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

  const clearFilters = () => {
    setStatusFilter('');
    setCategoryFilter('');
    setSearchTerm('');
  };

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

  const hasFilters = statusFilter || categoryFilter || searchTerm;

  return (
    <>
      <Meta title="My Products – ProductTrend" />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ── Header ── */}
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
                  ({filteredProducts.length})
                </span>
              </h1>
              <p className="text-sm text-slate-400">Manage your launched products</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/productstrend/launch')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition shadow-sm text-sm font-medium hover:scale-105 active:scale-95"
          >
            <FiPlus className="w-4 h-4" /> Launch New
          </button>
        </div>

        {/* ── Filters & Search ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search your products..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative w-full md:w-44">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition bg-slate-50 cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Category Filter */}
            <div className="relative w-full md:w-44">
              <FiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full appearance-none border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition bg-slate-50 cursor-pointer"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
                Showing {filteredProducts.length} of {allProducts.length} products
                {statusFilter && <span className="ml-2">• Status: {statusFilter}</span>}
                {categoryFilter && <span className="ml-2">• Category: {categoryFilter}</span>}
                {searchTerm && <span className="ml-2">• Search: "{searchTerm}"</span>}
              </p>
            </div>
          )}
        </div>

        {/* ── Products Grid ── */}
        {allProducts.length === 0 && !isLoading && !isFetchingNextPage ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-slate-900">No products launched yet</h3>
            <p className="text-slate-500 text-sm mt-1">Share your creation with the community</p>
            <button
              onClick={() => router.push('/productstrend/launch')}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition shadow-sm"
            >
              <FiPlus className="w-4 h-4" /> Launch Your First Product
            </button>
          </div>
        ) : filteredProducts.length === 0 && allProducts.length > 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-slate-900">No matches found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your search or filters.</p>
            <button
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
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

            {!hasMore && filteredProducts.length > 0 && (
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
    </>
  );
}