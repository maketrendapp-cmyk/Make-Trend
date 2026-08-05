// pages/productstrend/my-products.js
import React, { useState } from 'react';
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
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function MyProducts() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { invalidateMyProducts } = useInvalidateQueries();
  const { data: products = [], isLoading, isError, refetch } = useMyProducts(isAuthenticated);
  const deleteMutation = useDeleteProduct();

  const [deletingId, setDeletingId] = useState(null);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 h-56" />)}
        </div>
      </div>
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
      <Meta title="My Products – ProductTrend" />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/productstrend" className="text-slate-400 hover:text-slate-600 transition">
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FiGrid className="text-purple-600" />
              My Products
            </h1>
          </div>
          <button
            onClick={() => router.push('/productstrend/launch')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition shadow-sm"
          >
            <FiPlus className="w-4 h-4" /> Launch New
          </button>
        </div>

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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow group"
              >
                <Link href={`/productstrend/${product.id}`} className="block">
                  <div className="aspect-video bg-slate-100 overflow-hidden relative">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">🚀</div>
                    )}
                  </div>
                </Link>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <Link href={`/productstrend/${product.id}`} className="flex-1">
                      <h3 className="font-semibold text-slate-900 hover:text-purple-600 transition line-clamp-1">
                        {product.name}
                      </h3>
                    </Link>
                    <span
                      className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${
                        STATUS_BADGE[product.status] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {product.status || 'pending'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">{product.tagline}</p>
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
                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                    <Link
                      href={`/productstrend/${product.id}`}
                      className="flex-1 text-center text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => router.push(`/productstrend/edit/${product.id}`)}
                      className="flex-1 text-center text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
                    >
                      <FiEdit2 className="inline w-3 h-3 mr-1" /> Edit
                    </button>
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