// pages/groweachother/index.js
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import {
  FiHeart,
  FiUsers,
  FiPlusCircle,
  FiCheckCircle,
  FiArrowRight,
  FiUser,
  FiGithub,
  FiYoutube,
  FiInstagram,
  FiTwitter,
  FiFacebook,
  FiTrendingUp,
  FiRefreshCw,
} from 'react-icons/fi';

export default function GrowTogetherLanding() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // ── Always go to the feed, regardless of login status ──
  const handleGetStarted = () => {
    router.push('/groweachother/grow-feed');
  };

  return (
    <>
      <Meta
        title="Grow Together – Sub4Sub & Follow4Follow"
        description="Exchange social growth with real people. No coins, no rewards – just fair, mutual help."
      />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden py-12 sm:py-20 px-4 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-indigo-600/5 to-transparent" />
          <div className="absolute -top-20 -right-20 w-56 h-56 sm:w-72 sm:h-72 bg-purple-300/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-56 h-56 sm:w-72 sm:h-72 bg-indigo-300/20 rounded-full blur-3xl" />

          <div className="max-w-3xl mx-auto relative">
            <div className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium border border-purple-200 mb-5">
              <FiHeart className="w-3.5 h-3.5" />
              <span>Sub4Sub • Follow4Follow • Like4Like</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
              Grow Together
            </h1>
            <p className="text-base sm:text-xl text-gray-600 mt-3 max-w-xl mx-auto leading-relaxed px-2">
              Help others grow their social presence – and they’ll help you back. No coins, no rewards, just real human exchange.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 px-4 sm:px-0">
              <button
                onClick={handleGetStarted}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm sm:text-base rounded-xl shadow-md hover:shadow-lg transition active:scale-95"
              >
                Get Started – Free
                <FiArrowRight className="w-4 h-4" />
              </button>
              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-medium text-sm sm:text-base rounded-xl hover:bg-gray-200 transition"
                >
                  Sign In
                </Link>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <FiCheckCircle className="w-4 h-4 text-green-500" /> No coins
              </span>
              <span className="flex items-center gap-1.5">
                <FiCheckCircle className="w-4 h-4 text-green-500" /> No rewards
              </span>
              <span className="flex items-center gap-1.5">
                <FiCheckCircle className="w-4 h-4 text-green-500" /> 100% fair
              </span>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="max-w-5xl mx-auto px-4 py-10 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition group">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-4">
                <FiUsers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">1. Browse the Feed</h3>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
                See public tasks from other users – subscribers, followers, likes, or comments.
              </p>
              <Link
                href="/groweachother/grow-feed"
                className="inline-flex items-center gap-1 mt-3 text-purple-600 font-medium hover:underline text-xs sm:text-sm"
              >
                View Feed <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition group">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <FiPlusCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">2. Add Your Task</h3>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
                Create your social tasks – choose platform, URL, and what action you need.
              </p>
              <Link
                href={isAuthenticated ? '/groweachother/my-tasks' : '/login?redirect=/groweachother/my-tasks'}
                className="inline-flex items-center gap-1 mt-3 text-purple-600 font-medium hover:underline text-xs sm:text-sm"
              >
                Manage Tasks <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center hover:shadow-md transition group">
              <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                <FiCheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1.5">3. Exchange & Grow</h3>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
                Help someone, and they help you back. Track all your exchanges easily.
              </p>
              <Link
                href={isAuthenticated ? '/groweachother/my-exchanges' : '/login?redirect=/groweachother/my-exchanges'}
                className="inline-flex items-center gap-1 mt-3 text-purple-600 font-medium hover:underline text-xs sm:text-sm"
              >
                View Exchanges <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Steps ── */}
        <section className="bg-white border-t border-gray-100 py-12 sm:py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8 sm:mb-12">
              Simple Steps to Grow Together
            </h2>
            <div className="space-y-6 sm:space-y-8">
              {[
                {
                  step: 1,
                  title: 'Add Your Social Task',
                  desc: 'Go to My Tasks and add your social account – e.g., YouTube channel with task “Subscribe”.',
                },
                {
                  step: 2,
                  title: 'Find Someone to Help',
                  desc: 'Browse the Grow Feed and click Help To Grow on any task. Choose which of your tasks you want them to help with.',
                },
                {
                  step: 3,
                  title: 'Complete Your Part',
                  desc: 'Open the exchange, visit the other user’s channel, perform the action, then press Done.',
                },
                {
                  step: 4,
                  title: 'Wait & Complete',
                  desc: 'The other user completes their part. When both are done, the exchange is marked Completed.',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 sm:gap-5 items-start">
                  <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-base sm:text-lg font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-gray-500 text-xs sm:text-sm leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Platforms ── */}
        <section className="py-10 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">Supported Platforms</h2>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2"><FiYoutube className="w-5 h-5 text-red-600" /> YouTube</div>
              <div className="flex items-center gap-2"><FiInstagram className="w-5 h-5 text-pink-600" /> Instagram</div>
              <div className="flex items-center gap-2"><FiTwitter className="w-5 h-5 text-blue-400" /> Twitter</div>
              <div className="flex items-center gap-2"><FiFacebook className="w-5 h-5 text-blue-700" /> Facebook</div>
              <div className="flex items-center gap-2"><FiGithub className="w-5 h-5 text-gray-800" /> GitHub</div>
              <div className="flex items-center gap-2 text-gray-400">+ more</div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-r from-purple-600 to-indigo-600 py-12 sm:py-16 px-4 text-center text-white">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Ready to Grow Together?
            </h2>
            <p className="text-purple-100 text-sm sm:text-base mb-6 px-2">
              Join the community and start exchanging real social growth today.
            </p>
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-purple-700 font-bold text-sm sm:text-base rounded-xl shadow-md hover:shadow-lg transition active:scale-95"
            >
              Get Started – Free
              <FiArrowRight className="w-4 h-4" />
            </button>
            {!isAuthenticated && (
              <p className="mt-4 text-xs sm:text-sm text-purple-200">
                Already have an account?{' '}
                <Link href="/login" className="underline font-medium hover:text-white transition">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}