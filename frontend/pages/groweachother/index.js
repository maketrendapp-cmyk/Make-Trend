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

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/groweachother/grow-feed');
    } else {
      router.push('/login?redirect=/groweachother/grow-feed');
    }
  };

  return (
    <>
      <Meta
        title="Grow Together – Sub4Sub & Follow4Follow"
        description="Exchange social growth with real people. No coins, no rewards – just fair, mutual help."
      />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">

        {/* ── Hero ── */}
        <section className="relative overflow-hidden py-20 px-4 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-indigo-600/5 to-transparent" />
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-purple-300/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-indigo-300/20 rounded-full blur-3xl" />

          <div className="max-w-4xl mx-auto relative">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium border border-purple-200 mb-6">
              <FiHeart className="w-4 h-4" />
              <span>Sub4Sub • Follow4Follow • Like4Like</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
              Grow Together
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mt-4 max-w-2xl mx-auto leading-relaxed">
              Help others grow their social presence – and they’ll help you back. No coins, no rewards, just real human exchange.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleGetStarted}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-purple-200/50 transition hover:scale-[1.02] active:scale-[0.98]"
              >
                {isAuthenticated ? 'Go to Feed' : 'Get Started – Free'}
                <FiArrowRight className="w-5 h-5" />
              </button>
              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gray-100 text-gray-700 font-medium rounded-2xl hover:bg-gray-200 transition"
                >
                  Sign In
                </Link>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <FiCheckCircle className="w-4 h-4 text-green-500" /> No coins
              </span>
              <span className="flex items-center gap-1.5">
                <FiCheckCircle className="w-4 h-4 text-green-500" /> No rewards
              </span>
              <span className="flex items-center gap-1.5">
                <FiCheckCircle className="w-4 h-4 text-green-500" /> 100% fair exchange
              </span>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center hover:shadow-md transition group">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition">
                <FiUsers className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">1. Browse the Feed</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                See public tasks from other users – they need subscribers, followers, likes, or comments.
              </p>
              <Link
                href={isAuthenticated ? '/groweachother/grow-feed' : '/login?redirect=/groweachother/grow-feed'}
                className="inline-flex items-center gap-1 mt-4 text-purple-600 font-medium hover:underline text-sm"
              >
                View Feed <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center hover:shadow-md transition group">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition">
                <FiPlusCircle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">2. Add Your Task</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Create your own social tasks – choose platform, URL, and what action you need (Subscribe, Follow, etc.).
              </p>
              <Link
                href={isAuthenticated ? '/groweachother/my-tasks' : '/login?redirect=/groweachother/my-tasks'}
                className="inline-flex items-center gap-1 mt-4 text-purple-600 font-medium hover:underline text-sm"
              >
                Manage Tasks <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center hover:shadow-md transition group">
              <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition">
                <FiCheckCircle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">3. Exchange & Grow</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Help someone, and they help you back. Track all your exchanges and complete them together.
              </p>
              <Link
                href={isAuthenticated ? '/groweachother/my-exchanges' : '/login?redirect=/groweachother/my-exchanges'}
                className="inline-flex items-center gap-1 mt-4 text-purple-600 font-medium hover:underline text-sm"
              >
                View Exchanges <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Steps ── */}
        <section className="bg-white border-t border-gray-100 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Simple Steps to Grow Together
            </h2>
            <div className="space-y-8">
              {[
                {
                  step: 1,
                  title: 'Add Your Social Task',
                  desc: 'Go to My Tasks and add your social account – e.g., YouTube channel with task “Subscribe”. You can add as many tasks as you like.',
                },
                {
                  step: 2,
                  title: 'Find Someone to Help',
                  desc: 'Browse the Grow Feed and click Help To Grow on any task. Choose which of your tasks you want them to help with in return.',
                },
                {
                  step: 3,
                  title: 'Complete Your Part',
                  desc: 'Open the exchange, visit the other user’s channel, perform the action (subscribe/follow), then press Done.',
                },
                {
                  step: 4,
                  title: 'Wait & Complete',
                  desc: 'The other user completes their part. When both are done, the exchange is marked Completed. Everyone grows!',
                },
              ].map((item) => (
                <div key={item.step} className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Platforms ── */}
        <section className="py-12 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Supported Platforms</h2>
            <div className="flex flex-wrap items-center justify-center gap-6 text-gray-500">
              <div className="flex items-center gap-2"><FiYoutube className="w-6 h-6 text-red-600" /> YouTube</div>
              <div className="flex items-center gap-2"><FiInstagram className="w-6 h-6 text-pink-600" /> Instagram</div>
              <div className="flex items-center gap-2"><FiTwitter className="w-6 h-6 text-blue-400" /> Twitter</div>
              <div className="flex items-center gap-2"><FiFacebook className="w-6 h-6 text-blue-700" /> Facebook</div>
              <div className="flex items-center gap-2"><FiGithub className="w-6 h-6 text-gray-800" /> GitHub</div>
              <div className="flex items-center gap-2 text-gray-400">+ more</div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-gradient-to-r from-purple-600 to-indigo-600 py-16 px-4 text-center text-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Grow Together?
            </h2>
            <p className="text-purple-100 text-lg mb-8">
              Join the community and start exchanging real social growth today.
            </p>
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-700 font-bold rounded-2xl shadow-lg hover:shadow-xl transition hover:scale-[1.02] active:scale-[0.98]"
            >
              {isAuthenticated ? 'Go to Feed' : 'Get Started – Free'}
              <FiArrowRight className="w-5 h-5" />
            </button>
            {!isAuthenticated && (
              <p className="mt-4 text-sm text-purple-200">
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