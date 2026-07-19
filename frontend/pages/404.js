// pages/404.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { useProfile } from '../lib/queries';
import Meta from '../components/Meta';
import { FiHome, FiArrowLeft, FiSearch, FiAlertCircle } from 'react-icons/fi';
import { useEffect, useState } from 'react';

export default function Custom404() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
const { data: profile, isLoading: profileLoading } = useProfile(isAuthenticated);
  const [mounted, setMounted] = useState(false);

  // ── Get username for welcome message ──
  const username = profile?.username || user?.username || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show a skeleton while profile is loading (but only if mounted)
  if (!mounted) return null;

  return (
    <>
      <Meta
        title="Page Not Found | Make Trend"
        description="The page you're looking for doesn't exist. Return to Make Trend and continue exploring."
        url="https://maketrend.vercel.app/404"
      />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl border border-gray-100/60 p-8 sm:p-10 text-center">

          {/* ── 404 Icon ── */}
          <div className="relative inline-block mb-6">
            <div className="w-28 h-28 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto">
              <FiAlertCircle className="w-14 h-14 text-purple-600" />
            </div>
            <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-sm font-bold rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
              404
            </div>
          </div>

          {/* ── Welcome Message ── */}
          <div className="mb-4 inline-flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-full px-4 py-1.5 text-sm text-purple-700">
            <span>👋 Welcome,</span>
            <span className="font-bold">
              {profileLoading ? (
                <span className="inline-block w-20 h-4 bg-purple-200 rounded animate-pulse" />
              ) : (
                `@${username}`
              )}
            </span>
          </div>

          {/* ── Title ── */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Oops! Page Not Found
          </h1>

          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            The page you're looking for doesn't exist or has been moved. 
            Let's get you back on track.
          </p>

          {/* ── Search Box ── */}
          <div className="relative mb-6">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search for templates..."
              className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  router.push(`/create?search=${encodeURIComponent(e.target.value.trim())}`);
                }
              }}
            />
            <p className="text-xs text-gray-400 mt-1 text-left">Press Enter to search</p>
          </div>

          {/* ── Action Buttons ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/" className="flex-1">
              <button className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 shadow-md hover:-translate-y-0.5">
                <FiHome className="w-5 h-5" />
                Go Home
              </button>
            </Link>
            <button
              onClick={() => router.back()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200 hover:shadow-md"
            >
              <FiArrowLeft className="w-5 h-5" />
              Go Back
            </button>
          </div>

          {/* ── Quick Links ── */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400 mb-3">Quick Links</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/create">
                <span className="text-xs text-purple-600 hover:underline">Browse Templates</span>
              </Link>
              <span className="text-gray-300">•</span>
              <Link href="/about">
                <span className="text-xs text-purple-600 hover:underline">About</span>
              </Link>
              <span className="text-gray-300">•</span>
              <Link href="/support">
                <span className="text-xs text-purple-600 hover:underline">Support</span>
              </Link>
              <span className="text-gray-300">•</span>
              <Link href={user ? '/profile' : '/login'}>
                <span className="text-xs text-purple-600 hover:underline">
                  {user ? 'Profile' : 'Login'}
                </span>
              </Link>
            </div>
          </div>

          {/* ── Footer Note ── */}
          <p className="mt-6 text-[10px] text-gray-400">
            © {new Date().getFullYear()} Make Trend. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}