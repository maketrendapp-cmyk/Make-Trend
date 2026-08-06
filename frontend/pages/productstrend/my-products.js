// pages/productstrend/my-products.js
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
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

export default function MyProducts() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { invalidateMyProducts } = useInvalidateQueries();
  const { data: products = [], isLoading, isError, refetch } = useMyProducts(isAuthenticated);
  const deleteMutation = useDeleteProduct();

  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Local search: filter products by name, tagline, or category ──
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) =>
      p.name?.toLowerCase().includes(term) ||
      p.tagline?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const handleDelete = async (productId) => {
    if (!confirm('Delete this product?')) return;
    setDeletingId(productId);
    try {
      await deleteMutation.mutateAsync(productId);
      await refetch();
    } catch (err) {
      toast.error('Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Safe date formatter ──
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

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-lg mb-6" />
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="h-10 w-56 bg-slate-200 rounded-xl" />
          <div className="h-10 w-32 bg-slate-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 h-56" />
          ))}
        </div>
      </div>
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

  return (
    <>
      <Meta title="My Products – ProductTrend" />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/productstrend" className="text-slate-400 hover:text-slate-600 transition">
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FiGrid className="text-purple-600" />
              My Products
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({filteredProducts.length})
              </span>
            </h1>
          </div>
          <button
            onClick={() => router.push('/productstrend/launch')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition shadow-sm text-sm font-medium"
          >
            <FiPlus className="w-4 h-4" /> Launch New
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search your products by name, tagline, or category..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-2 text-xs text-slate-400">
              Showing {filteredProducts.length} of {products.length} products
            </p>
          )}
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-lg font-semibold text-slate-900">You haven't launched any products yet</h3>
            <p className="text-slate-500 text-sm">Create your first product launch now.</p>
            <button
              onClick={() => router.push('/productstrend/launch')}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
            >
              Launch Product
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-100">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-slate-900">No matches found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your search terms.</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
            >
              <FiX className="w-4 h-4" /> Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow duration-300 group flex flex-col"
              >
                <Link href={`/productstrend/${product.id}`} className="block relative aspect-video bg-slate-100 overflow-hidden">
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
                    <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">🚀</div>
                  )}
                </Link>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/productstrend/${product.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-base hover:text-purple-600 transition truncate">
                        {product.name}
                      </h3>
                    </Link>
                    <span
                      className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                        STATUS_BADGE[product.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {STATUS_LABELS[product.status] || product.status || 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1 flex-1">{product.tagline}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <FiHeart className="w-3 h-3" />
                      {product.upvotes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiMessageCircle className="w-3 h-3" />
                      {product.commentsCount || 0}
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <FiClock className="w-3 h-3" />
                      {formatDate(product.createdAt)}
                    </span>
                  </div>

                  {/* ── Actions ── */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                    <Link
                      href={`/productstrend/${product.id}`}
                      className="flex-1 text-center text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition"
                    >
                      View
                    </Link>
                    <Link
                      href={`/productstrend/edit/${product.id}`}
                      className="flex-1 text-center text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
                    >
                      <FiEdit2 className="inline w-3 h-3 mr-1" /> Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="flex-1 text-center text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                    >
                      {deletingId === product.id ? (
                        <FiLoader className="w-3 h-3 animate-spin mx-auto" />
                      ) : (
                        <FiTrash2 className="inline w-3 h-3 mr-1" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}