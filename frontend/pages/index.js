// pages/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';
import {
  FiRocket,
  FiTrendingUp,
  FiUsers,
  FiChevronRight,
} from 'react-icons/fi';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

// ── Safe fallback for categories ──
const getCategoryEmoji = (cat) => {
  const emojis = {
    giveaway: '🎁',
    simcard: '📱',
    contest: '🏆',
    growth: '📈',
    engagement: '💬',
    followers: '👥',
    views: '👁️',
    likes: '❤️',
    tiktok: '🎵',
    instagram: '📸',
    youtube: '▶️',
    default: '✨',
  };
  return emojis[cat?.toLowerCase()] || emojis.default;
};

const platformBadgeStyles = {
  tiktok: 'bg-black text-white',
  instagram: 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white',
  youtube: 'bg-[#FF0000] text-white',
  facebook: 'bg-[#1877F2] text-white',
  all: 'bg-slate-800 text-white',
};

export default function Home() {
  const router = useRouter();
  const [featuredTemplates, setFeaturedTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch featured templates ──
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await fetch(`${API_BASE}/templates?highlight=true&limit=20`);
        if (!res.ok) throw new Error('Failed to fetch featured templates');
        const data = await res.json();
        if (data.success) {
          setFeaturedTemplates(data.templates || []);
        }
      } catch (err) {
        console.error('Featured fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleUseTemplate = (slug) => {
    router.push(`/createcampaign?slug=${slug}`);
  };

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

        {/* ── Featured Templates (Simple Grid – No Carousel) ── */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">⭐ Featured Templates</h2>
                <p className="text-slate-500 text-sm mt-0.5">Hand‑picked templates to get you started</p>
              </div>
              <button
                onClick={() => router.push('/create')}
                className="text-sm font-semibold text-purple-600 hover:underline flex items-center gap-1"
              >
                View all <FiChevronRight className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
                    <div className="w-full aspect-video bg-slate-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-2/3" />
                      <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="h-8 bg-slate-200 rounded-lg" />
                        <div className="h-8 bg-slate-200 rounded-lg" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : featuredTemplates.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500">No featured templates available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredTemplates.map((template) => (
                  <div
                    key={template.id || `template-${Math.random()}`}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
                  >
                    <div className="w-full aspect-video bg-slate-100 overflow-hidden relative">
                      {template.image ? (
                        <img
                          src={template.image}
                          alt={template.title || 'Template'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">🎨</div>
                      )}
                      <div className="absolute top-2 left-2 flex gap-1 z-10">
                        <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                          ⭐ Featured
                        </span>
                      </div>
                      {template.platform && (
                        <div className="absolute top-2 right-2">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm ${platformBadgeStyles[template.platform] || 'bg-slate-800 text-white'}`}>
                            {template.platform}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex-grow flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded flex items-center">
                            👥 {template.usageCount || 0} uses
                          </span>
                          {template.category && (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {getCategoryEmoji(template.category)} {template.category}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                          {template.title || 'Untitled Template'}
                        </h3>
                        <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-2 leading-relaxed">
                          {template.description || 'Customizable layout built to match social trends.'}
                        </p>
                        {template.reward && (
                          <div className="mt-1 text-[10px] font-extrabold text-amber-600 flex items-center gap-0.5 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-lg w-fit">
                            🎁 {template.reward}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex gap-2">
                        <button
                          onClick={() => router.push(`/${template.slug}`)}
                          className="flex-1 flex items-center justify-center gap-1 text-[11px] font-black text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 transition active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          Preview
                        </button>
                        <button
                          onClick={() => handleUseTemplate(template.slug)}
                          className="flex-1 flex items-center justify-center gap-1 text-[11px] font-black text-white bg-purple-600 hover:bg-purple-700 rounded-xl py-2 transition shadow-sm active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                          Use
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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