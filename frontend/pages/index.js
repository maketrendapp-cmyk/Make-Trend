// pages/index.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';
import {
  FiZap,
  FiTrendingUp,
  FiUsers,
  FiChevronRight,
  FiChevronLeft,
} from 'react-icons/fi';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

// ── Custom hook: fade-up on scroll ──
function useFadeUp(threshold = 0.1) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// ── Custom hook: animated counter ──
function useCounter(target, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!startOnView) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!isVisible) return;
    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };
    requestAnimationFrame(step);
  }, [target, duration, isVisible]);

  return { count, ref };
}

// ── Emoji mapping ──
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
  const [error, setError] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const carouselIntervalRef = useRef(null);
  const touchStartXRef = useRef(0);

  // ── Fade‑up hooks for each section ──
  const heroFade = useFadeUp(0.1);
  const statsFade = useFadeUp(0.1);
  const carouselFade = useFadeUp(0.1);
  const featuresFade = useFadeUp(0.1);
  const ctaFade = useFadeUp(0.1);

  // ── Stats targets ──
  const stats = [
    { label: 'Campaigns Created', target: 5000, suffix: '+' },
    { label: 'Total Shares', target: 10000, suffix: 'K+' },
    { label: 'Templates', target: 500, suffix: '+' },
    { label: 'Active Users', target: 1200, suffix: '+' },
  ];

  const counter1 = useCounter(5000);
  const counter2 = useCounter(10000);
  const counter3 = useCounter(500);
  const counter4 = useCounter(1200);
  const counters = [counter1, counter2, counter3, counter4];

  // ── Fetch featured templates ──
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/templates?highlight=true`);
        if (!res.ok) throw new Error('Failed to fetch featured templates');
        const data = await res.json();
        if (data.success) {
          setFeaturedTemplates(data.templates || []);
        } else {
          throw new Error(data.error || 'Invalid response');
        }
      } catch (err) {
        setError(err.message);
        console.error('Featured fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  // ── Carousel auto‑slide (2 seconds) ──
  useEffect(() => {
    if (featuredTemplates.length > 1 && !isHovering) {
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % featuredTemplates.length);
      }, 2000);
    }
    return () => {
      if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    };
  }, [featuredTemplates.length, isHovering]);

  const goToSlide = useCallback((index) => {
    setCarouselIndex(index);
  }, []);

  const nextSlide = useCallback(() => {
    setCarouselIndex((prev) => (prev + 1) % featuredTemplates.length);
  }, [featuredTemplates.length]);

  const prevSlide = useCallback(() => {
    setCarouselIndex((prev) => (prev - 1 + featuredTemplates.length) % featuredTemplates.length);
  }, [featuredTemplates.length]);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  const handleUseTemplate = (slug) => {
    router.push(`/createcampaign?slug=${slug}`);
  };

  // ── Render carousel ──
  const renderCarousel = () => {
    if (loading) {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
          <div className="w-full aspect-video bg-slate-200" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
            <div className="flex gap-2 mt-2">
              <div className="h-8 w-16 bg-slate-200 rounded" />
              <div className="h-8 w-16 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-red-200">
          <p className="text-red-500">Failed to load featured templates: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      );
    }

    if (featuredTemplates.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500">No featured templates available yet.</p>
        </div>
      );
    }

    return (
      <div
        className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
        >
          {featuredTemplates.map((template) => (
            <div key={template.id} className="w-full flex-shrink-0">
              <div className="flex flex-col sm:flex-row p-4 sm:p-6 gap-4 sm:gap-6">
                <div className="w-full sm:w-56 h-48 sm:h-auto bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                  {template.image ? (
                    <img
                      src={template.image}
                      alt={template.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-slate-300">🎨</div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {template.platform && (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                            platformBadgeStyles[template.platform] || 'bg-slate-800 text-white'
                          }`}
                        >
                          {template.platform}
                        </span>
                      )}
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded flex items-center">
                        👥 {template.usageCount || 0} uses
                      </span>
                      {template.category && (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {getCategoryEmoji(template.category)} {template.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">{template.title}</h3>
                    <p className="text-slate-500 text-sm mt-1 line-clamp-2">
                      {template.description || 'Launch your campaign with this template.'}
                    </p>
                    {template.reward && (
                      <div className="mt-2 text-xs font-bold text-amber-600 flex items-center gap-0.5 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg w-fit">
                        🎁 {template.reward}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push(`/${template.slug}`)}
                      className="px-4 py-1.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200 transition"
                    >
                      👁️ Preview
                    </button>
                    <button
                      onClick={() => handleUseTemplate(template.slug)}
                      className="px-4 py-1.5 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition shadow-sm"
                    >
                      ✨ Use Template
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {featuredTemplates.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-white transition-all z-10"
              aria-label="Previous"
            >
              <FiChevronLeft className="w-5 h-5 text-slate-700" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-white transition-all z-10"
              aria-label="Next"
            >
              <FiChevronRight className="w-5 h-5 text-slate-700" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              {featuredTemplates.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === carouselIndex ? 'bg-purple-600 w-6' : 'bg-slate-300 w-2'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <Meta
        title="Make Trend – Create & Share Viral Campaigns"
        description="Launch share‑to‑unlock campaigns for Instagram, TikTok, YouTube, and more. Grow your audience in minutes."
      />
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50/80">
        {/* ── Hero ── */}
        <section
          ref={heroFade.ref}
          className={`relative overflow-hidden px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 transition-all duration-700 ${
            heroFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
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

        {/* ── Stats with Animated Counters ── */}
        <section
          ref={statsFade.ref}
          className={`border-y border-slate-200/60 bg-white/50 backdrop-blur-sm py-6 transition-all duration-700 ${
            statsFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {stats.map((stat, index) => {
              const { count, ref } = counters[index];
              const displayValue = stat.label === 'Total Shares' ? (count / 1000).toFixed(1) + 'K' : count + stat.suffix;
              return (
                <div key={index} ref={ref} className="transition-opacity duration-500">
                  <p className="text-2xl font-extrabold text-slate-900">{displayValue}</p>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Featured Templates Carousel ── */}
        <section
          ref={carouselFade.ref}
          className={`py-16 px-4 transition-all duration-700 ${
            carouselFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span>⭐ Featured Templates</span>
                </h2>
                <p className="text-slate-500 text-sm mt-0.5">Hand‑picked templates to get you started</p>
              </div>
              <button
                onClick={() => router.push('/create')}
                className="text-sm font-semibold text-purple-600 hover:underline flex items-center gap-1"
              >
                View all <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
            {renderCarousel()}
          </div>
        </section>

        {/* ── Why Make Trend ── */}
        <section
          ref={featuresFade.ref}
          className={`py-16 px-4 bg-white/80 transition-all duration-700 ${
            featuresFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Why Make Trend?</h2>
            <p className="text-slate-500 text-center max-w-2xl mx-auto mb-10">
              Everything you need to launch, track, and grow your campaigns – all in one place.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-600 text-2xl">
                  <FiZap />
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
        <section
          ref={ctaFade.ref}
          className={`py-16 px-4 transition-all duration-700 ${
            ctaFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
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