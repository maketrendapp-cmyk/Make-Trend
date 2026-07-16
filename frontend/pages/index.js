// pages/index.js
import { useRouter } from 'next/router';
import Meta from '../components/Meta';
import {
  FiRocket,
  FiTrendingUp,
  FiUsers,
  FiChevronRight,
} from 'react-icons/fi';

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Meta
        title="Make Trend – Create & Share Viral Campaigns"
        description="Launch share‑to‑unlock campaigns for Instagram, TikTok, YouTube, and more. Grow your audience in minutes."
      />
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50/80">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="max-w-6xl mx-auto text-center">
            <div className="inline-block mb-4 px-4 py-1.5 bg-purple-100 text-purple-700 text-xs font-bold rounded-full tracking-wider uppercase">
              🚀 Launch viral campaigns in minutes
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight">
              Create & Share{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                Trending Campaigns
              </span>
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto">
              Choose a template, customise it, share your unique link, and watch your metrics climb – all in under 2 minutes.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push('/create')}
                className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:bg-purple-700 transition-all flex items-center gap-2"
              >
                Browse Templates <FiChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push('/about')}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
              >
                Learn More
              </button>
            </div>
          </div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* ── Stats ── */}
        <section className="border-y border-slate-200/60 bg-white/50 backdrop-blur-sm py-6">
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-extrabold text-slate-900">500+</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Campaigns Created</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">10K+</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Shares</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">50+</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Templates</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">1.2K+</p>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Users</p>
            </div>
          </div>
        </section>

        {/* ── Why Make Trend ── */}
        <section className="py-16 px-4 bg-white/80">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Why Make Trend?</h2>
            <p className="text-slate-500 text-center max-w-2xl mx-auto mb-10">
              Everything you need to launch, track, and grow your campaigns – all in one place.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-600 text-2xl">
                  <FiRocket />
                </div>
                <h3 className="font-bold text-slate-900">Launch in Minutes</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Choose a template, customise it, and share your campaign in under 2 minutes.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-600 text-2xl">
                  <FiTrendingUp />
                </div>
                <h3 className="font-bold text-slate-900">Real‑Time Analytics</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Track views, shares, unlocks, and completions as they happen.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-600 text-2xl">
                  <FiUsers />
                </div>
                <h3 className="font-bold text-slate-900">Grow Your Audience</h3>
                <p className="text-slate-500 text-sm mt-1">
                  Built‑in referral tracking and social sharing features to expand your reach.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl">
            <h2 className="text-3xl font-bold">Ready to Make Your Trend?</h2>
            <p className="mt-2 text-purple-100 max-w-2xl mx-auto">
              Join thousands of creators who are already launching successful campaigns with Make Trend.
            </p>
            <button
              onClick={() => router.push('/create')}
              className="mt-6 px-8 py-3 bg-white text-purple-700 font-bold rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all inline-flex items-center gap-2"
            >
              Get Started for Free <FiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-slate-200/60 py-6 px-4 bg-white/50">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} Make Trend. All rights reserved.</span>
            <div className="flex gap-4">
              <a href="/terms" className="hover:text-slate-700 transition">Terms</a>
              <a href="/privacy" className="hover:text-slate-700 transition">Privacy</a>
              <a href="/support" className="hover:text-slate-700 transition">Support</a>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}