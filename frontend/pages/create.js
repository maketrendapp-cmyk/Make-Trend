
// pages/index.js
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import Head from 'next/head';
import Image from 'next/image';
import Meta from '../components/Meta';
import { useFeaturedTemplates } from '../lib/queries';
import {
  FiZap,
  FiTrendingUp,
  FiUsers,
  FiChevronRight,
  FiChevronLeft,
  FiSearch,
  FiArrowRight,
  FiEdit,
  FiShare2,
} from 'react-icons/fi';
import { FaRocket } from 'react-icons/fa';

// ── Custom hooks ──
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

// ── Emoji mapping for categories ──
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

export default function Home({ initialFeaturedTemplates }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── Hydrate React Query cache with pre‑fetched data ──
  useEffect(() => {
    queryClient.setQueryData(['featuredTemplates'], initialFeaturedTemplates);
  }, [initialFeaturedTemplates, queryClient]);

  // ── React Query data ──
  const { data: featuredTemplates, isLoading: featuredLoading } = useFeaturedTemplates({}, initialFeaturedTemplates);

  const hasInitialData = initialFeaturedTemplates && initialFeaturedTemplates.length > 0;
  const isLoading = featuredLoading && !hasInitialData;

  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const carouselIntervalRef = useRef(null);
  const touchStartXRef = useRef(0);

  // ── Fade‑up hooks ──
  const heroFade = useFadeUp(0.1);
  const statsFade = useFadeUp(0.1);
  const carouselFade = useFadeUp(0.1);
  const ctaFade = useFadeUp(0.1);

  // ── Stats ──
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

  // ── Carousel auto‑slide ──
  useEffect(() => {
    if (featuredTemplates?.length > 1 && !isHovering) {
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % featuredTemplates.length);
      }, 4000);
    }
    return () => {
      if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    };
  }, [featuredTemplates?.length, isHovering]);

  const goToSlide = useCallback((index) => {
    setCarouselIndex(index);
  }, []);

  const nextSlide = useCallback(() => {
    if (!featuredTemplates?.length) return;
    setCarouselIndex((prev) => (prev + 1) % featuredTemplates.length);
  }, [featuredTemplates?.length]);

  const prevSlide = useCallback(() => {
    if (!featuredTemplates?.length) return;
    setCarouselIndex((prev) => (prev - 1 + featuredTemplates.length) % featuredTemplates.length);
  }, [featuredTemplates?.length]);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  };

  const handleUseTemplate = (slug) => {
    router.push(`/createcampaign?slug=${slug}`);
  };

  // ── Search handler ──
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/create?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/create');
    }
  };

  // ── Render carousel with Next.js Image optimization ──
  const renderCarousel = () => {
    if (isLoading) {
      return (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 animate-pulse">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-72 h-48 sm:h-auto bg-slate-200 rounded-xl" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
          </div>
        </div>
      );
    }

    if (!featuredTemplates || featuredTemplates.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500">No featured templates available.</p>
        </div>
      );
    }

    return (
      <div
        className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-md group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
        >
          {featuredTemplates.map((template, index) => (
            <div key={template.id} className="w-full flex-shrink-0">
              <div className="p-5 sm:p-8">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="w-full sm:w-72 aspect-video sm:aspect-square bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm relative">
                    {template.image ? (
                      <Image
                        src={template.image}
                        alt={template.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 288px"
                        priority={index === 0}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        quality={85}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">🎨</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between w-full">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {template.platform && (
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                              platformBadgeStyles[template.platform] || 'bg-slate-800 text-white'
                            }`}
                          >
                            {template.platform}
                          </span>
                        )}
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                          👥 {template.usageCount || 0} Uses
                        </span>
                        {template.category && (
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                            {getCategoryEmoji(template.category)} {template.category}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{template.title}</h3>
                      <p className="text-slate-500 text-xs sm:text-sm mt-2 line-clamp-2 leading-relaxed">
                        {template.description || 'Launch your campaign with this template.'}
                      </p>
                      {template.reward && (
                        <div className="mt-3 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl w-fit flex items-center gap-1.5 shadow-sm">
                          🎁 {template.reward}
                        </div>
                      )}
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => router.push(`/${template.slug}`)}
                        className="flex items-center justify-center gap-1.5 text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl py-2.5 transition active:scale-95"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Preview
                      </button>
                      <button
                        onClick={() => handleUseTemplate(template.slug)}
                        className="flex items-center justify-center gap-1.5 text-xs font-black text-white bg-purple-600 hover:bg-purple-700 rounded-xl py-2.5 transition shadow-sm active:scale-95 shadow-purple-600/20"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        Use Template
                      </button>
                    </div>
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
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg backdrop-blur-md border border-slate-200 transition-all z-10 text-slate-800 hover:scale-105"
              aria-label="Previous"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg backdrop-blur-md border border-slate-200 transition-all z-10 text-slate-800 hover:scale-105"
              aria-label="Next"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full z-10">
              {featuredTemplates.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToSlide(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === carouselIndex ? 'bg-white w-5' : 'bg-white/50 w-1.5'
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

  const formatNumber = (value, label) => {
    if (label === 'Total Shares') return (value / 1000).toFixed(1) + 'K';
    return value + '+';
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://maketrend.app';
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Make Trend",
    "url": siteUrl,
    "description": "Create viral share‑to‑unlock campaigns, grow your audience, and track real‑time analytics – all with free, professionally designed templates.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${siteUrl}/create?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      <Meta
        title="Viral Campaign Maker Platform for Creators"
        description="Create share‑to‑unlock campaigns, grow your audience, and track real‑time analytics – all with free, professionally designed templates."
        url="/"
        image="https://maketrend.app/og-image.png"
        type="website"
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50/80">
        
        {/* ── Hero ── */}
        <section
          ref={heroFade.ref}
          className={`relative overflow-hidden px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 transition-all duration-700 ${
            heroFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute top-10 left-10 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto text-center relative z-10">
            <div className="inline-block mb-4 px-4 py-1.5 bg-purple-100 text-purple-700 text-xs font-extrabold rounded-full tracking-wider uppercase shadow-sm">
              🚀 Launch viral campaigns in minutes
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
              Create & Share{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
                Trending Campaigns
              </span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Choose a template, customise it, share your unique link, and watch your metrics climb – all in under 2 minutes.
            </p>

            {/* ── Search Bar ── */}
            <div className="max-w-xl mx-auto mt-8">
              <form onSubmit={handleSearch} className="flex items-center bg-white border border-slate-200 rounded-full shadow-md hover:shadow-lg transition focus-within:ring-4 focus-within:ring-purple-600/10 focus-within:border-purple-600">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates, rewards..."
                  className="flex-1 bg-transparent px-6 py-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-full mr-1.5 transition text-sm shadow-sm"
                >
                  <FiSearch className="w-4 h-4" /> Search
                </button>
              </form>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => router.push('/create')}
                className="px-7 py-3 bg-purple-600 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg hover:bg-purple-700 transition-all flex items-center gap-2 text-sm"
              >
                Browse All Templates <FiChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push('/about')}
                className="px-7 py-3 bg-white border border-slate-200 text-slate-700 font-extrabold rounded-xl hover:bg-slate-50 transition-all shadow-sm text-sm"
              >
                Learn More
              </button>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section
          ref={statsFade.ref}
          className={`border-y border-slate-200/60 bg-white/50 backdrop-blur-sm py-8 transition-all duration-700 ${
            statsFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {stats.map((stat, index) => {
              const { count, ref } = counters[index];
              const displayValue = formatNumber(count, stat.label);
              return (
                <div key={index} ref={ref} className="group">
                  <p className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent transition-all duration-500 group-hover:scale-105">
                    {displayValue}
                  </p>
                  <p className="text-xs text-slate-500 font-extrabold uppercase tracking-wider mt-1">
                    {stat.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Featured Carousel ── */}
        <section
          ref={carouselFade.ref}
          className={`py-16 px-4 transition-all duration-700 ${
            carouselFade.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                  <span>⭐ Featured Templates</span>
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Hand‑picked professional templates to get you started</p>
              </div>
              <button
                onClick={() => router.push('/create')}
                className="text-xs sm:text-sm font-bold text-purple-600 hover:underline flex items-center gap-1"
              >
                View all <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
            {renderCarousel()}
          </div>
        </section>

        {/* ── How It Works ── */}
        <section className="py-16 px-4 bg-white/80 border-y border-slate-100">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-black text-slate-900 text-center mb-2">How It Works</h2>
            <p className="text-slate-500 text-center text-sm max-w-xl mx-auto mb-10">
              Launch your first campaign in three simple steps.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600 text-xl shadow-inner">
                  <FaRocket className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-900 mb-1">1. Choose a Template</h3>
                <p className="text-slate-500 text-xs leading-relaxed">Pick from our library of professionally designed viral templates.</p>
              </div>
              <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600 text-xl shadow-inner">
                  <FiEdit className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-900 mb-1">2. Customise & Launch</h3>
                <p className="text-slate-500 text-xs leading-relaxed">Customise the title, description, reward, and required tasks.</p>
              </div>
              <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600 text-xl shadow-inner">
                  <FiShare2 className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-900 mb-1">3. Share & Grow</h3>
                <p className="text-slate-500 text-xs leading-relaxed">Share your unique link and watch your audience expand instantly.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Why Make Trend ── */}
        <section className="py-16 px-4 bg-gray-50/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-black text-slate-900 text-center mb-2">Why Make Trend?</h2>
            <p className="text-slate-500 text-center text-sm max-w-xl mx-auto mb-10">
              Everything you need to launch, track, and scale your campaigns in one dashboard.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-600 text-xl">
                  <FiZap />
                </div>
                <h3 className="font-extrabold text-slate-900 mb-1">Lightning Fast</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Optimized server-side rendering and pre-cached queries for instant load speeds.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-600 text-xl">
                  <FiTrendingUp />
                </div>
                <h3 className="font-extrabold text-slate-900 mb-1">Real‑Time Analytics</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Track views, shares, unlocks, and lead conversions as they happen live.
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm hover:shadow-md transition">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-600 text-xl">
                  <FiUsers />
                </div>
                <h3 className="font-extrabold text-slate-900 mb-1">Audience Growth</h3>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Built‑in referral tracking and social sharing tools to skyrocket your reach.
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
            <h2 className="text-2xl sm:text-3xl font-black">Ready to Make Your Trend?</h2>
            <p className="mt-2 text-purple-100 text-xs sm:text-sm max-w-xl mx-auto">
              Join creators who are already launching successful share-to-unlock campaigns with Make Trend.
            </p>
            <button
              onClick={() => router.push('/create')}
              className="mt-6 px-8 py-3.5 bg-white text-purple-700 font-extrabold rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all inline-flex items-center gap-2 text-sm"
            >
              Get Started for Free <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-slate-200/60 py-6 px-4 bg-white/50">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
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

// ── Pre‑fetch featured templates at build time ──
export async function getStaticProps() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
  
  const res = await fetch(`${BACKEND_URL}/api/templates?highlight=true&limit=10`);
  const data = await res.json();
  const featuredTemplates = data.templates || [];

  return {
    props: {
      initialFeaturedTemplates: featuredTemplates,
    },
    revalidate: 60,
  };
}