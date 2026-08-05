// pages/productstrend/index.js
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import {
  FiRocket,
  FiTrendingUp,
  FiPlusCircle,
  FiGrid,
  FiUsers,
  FiHeart,
  FiExternalLink,
  FiArrowRight,
} from 'react-icons/fi';

export default function ProductTrendIndex() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Meta
        title="ProductTrend – Discover & Launch Products"
        description="Explore new products, launch your own, and grow with the community."
      />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 py-8 px-4">
        <div className="max-w-5xl mx-auto">

          {/* ── Hero Section ── */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-semibold px-4 py-2 rounded-full border border-purple-200 shadow-sm mb-4">
              <FiRocket className="w-4 h-4" />
              <span>New Feature – ProductTrend</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Discover, Launch, and Grow
              <span className="text-purple-600"> Products</span>
            </h1>
            <p className="max-w-2xl mx-auto mt-4 text-base sm:text-lg text-slate-500 leading-relaxed">
              ProductTrend is a community-driven space where makers share their latest creations.
              Upvote, comment, and launch your own product to gain traction.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/productstrend/launch"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition shadow-md hover:shadow-lg"
                  >
                    <FiPlusCircle className="w-5 h-5" />
                    Launch a Product
                  </Link>
                  <Link
                    href="/productstrend/feed"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition shadow-sm"
                  >
                    <FiTrendingUp className="w-5 h-5" />
                    Browse Feed
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => router.push('/login?redirect=/productstrend')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition shadow-md"
                >
                  Sign In to Join
                  <FiArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ── Feature Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Browse Feed */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <FiTrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Explore Products</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Discover the latest products from makers around the world. Upvote your favorites and leave feedback.
              </p>
              <Link
                href="/productstrend/feed"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-800 group-hover:gap-2.5 transition-all"
              >
                View Feed <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Card 2: Launch a Product */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <FiRocket className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Launch Your Product</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Share your creation with the community. Fill in the details and get real feedback from early adopters.
              </p>
              <Link
                href="/productstrend/launch"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-800 group-hover:gap-2.5 transition-all"
              >
                Launch Now <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Card 3: My Products */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <FiGrid className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">My Products</h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                Manage your own launches. View their upvotes, comments, and analytics.
              </p>
              <Link
                href="/productstrend/my-products"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-800 group-hover:gap-2.5 transition-all"
              >
                View My Products <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* ── Community Stats (Placeholder / future) ── */}
          <div className="mt-12 pt-8 border-t border-slate-200/60 text-center text-sm text-slate-400">
            <span className="inline-flex items-center gap-2">
              <FiUsers className="w-4 h-4" />
              Community driven · Made with ❤️
            </span>
          </div>
        </div>
      </div>
    </>
  );
}