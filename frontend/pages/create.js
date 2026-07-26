
// pages/create.js
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import Head from 'next/head';
import Meta from '../components/Meta';
import { useTemplates, useFeaturedTemplates } from '../lib/queries';

// ── Category Emojis Mapping ──
const categoryEmojis = {
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

export default function Create({ initialTemplates, initialFeaturedTemplates }) {
  const router = useRouter();
  const { slug: highlightSlug, search: initialSearch } = router.query;
  const queryClient = useQueryClient();

  // ── Hydrate React Query Cache ──
  useEffect(() => {
    queryClient.setQueryData(['templates'], initialTemplates);
    queryClient.setQueryData(['featuredTemplates'], initialFeaturedTemplates);
  }, [initialTemplates, initialFeaturedTemplates, queryClient]);

  // ── Component State ──
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // ── Active Query Filters ──
  const activeFilters = useMemo(() => {
    const filters = {};
    if (selectedCategory) filters.category = selectedCategory;
    if (selectedPlatform) filters.platform = selectedPlatform;
    return filters;
  }, [selectedCategory, selectedPlatform]);

  const { data: templates = [], isLoading: templatesLoading } = useTemplates(activeFilters);
  const { data: featuredTemplates = [], isLoading: featuredLoading } = useFeaturedTemplates(activeFilters);

  const highlightTimeoutRef = useRef(null);
  const carouselIntervalRef = useRef(null);

  const hasFilters = Boolean(searchQuery.trim() || selectedCategory || selectedPlatform);

  // ── Sync URL Search Param ──
  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  // ── Filter Logic for Regular Templates ──
  const filteredAll = useMemo(() => {
    let filtered = [...templates];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.hashtags || []).join(' ').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.platform || '').toLowerCase().includes(q)
      );
    }
    if (selectedCategory && selectedCategory !== 'All') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    if (selectedPlatform && selectedPlatform !== 'All') {
      filtered = filtered.filter(t => t.platform === selectedPlatform);
    }
    return filtered;
  }, [templates, searchQuery, selectedCategory, selectedPlatform]);

  const regularTemplates = useMemo(() => {
    return filteredAll.filter(t => !t.isHighlight);
  }, [filteredAll]);

  // ── Filter Logic for Featured Templates ──
  const featuredFiltered = useMemo(() => {
    let filtered = [...featuredTemplates];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.hashtags || []).join(' ').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.platform || '').toLowerCase().includes(q)
      );
    }
    if (selectedCategory && selectedCategory !== 'All') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    if (selectedPlatform && selectedPlatform !== 'All') {
      filtered = filtered.filter(t => t.platform === selectedPlatform);
    }
    return filtered;
  }, [featuredTemplates, searchQuery, selectedCategory, selectedPlatform]);

  const isSlugFeatured = useMemo(() => {
    if (!highlightSlug) return false;
    return templates.some(t => t.slug === highlightSlug && t.isHighlight);
  }, [highlightSlug, templates]);

  const showCarousel = !hasFilters && !isSlugFeatured && featuredFiltered.length > 1;

  // ── Carousel Auto-Slide Interval ──
  useEffect(() => {
    if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    carouselIntervalRef.current = null;

    if (showCarousel) {
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex(prev => (prev + 1) % featuredFiltered.length);
      }, 4000);
    } else {
      setCarouselIndex(0);
    }

    return () => {
      if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    };
  }, [featuredFiltered.length, showCarousel]);

  const goToSlide = useCallback((index) => {
    setCarouselIndex(index);
    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
      if (showCarousel) {
        carouselIntervalRef.current = setInterval(() => {
          setCarouselIndex(prev => (prev + 1) % featuredFiltered.length);
        }, 4000);
      }
    }
  }, [featuredFiltered.length, showCarousel]);

  // ── Dynamic Filters Extraction ──
  const availableCategories = useMemo(() => {
    const cats = new Set();
    const source = selectedPlatform ? templates.filter(t => t.platform === selectedPlatform) : templates;
    source.forEach(t => { if (t.category) cats.add(t.category); });
    return ['All', ...Array.from(cats)];
  }, [templates, selectedPlatform]);

  const availablePlatforms = useMemo(() => {
    const plats = new Set();
    const source = selectedCategory ? templates.filter(t => t.category === selectedCategory) : templates;
    source.forEach(t => { if (t.platform) plats.add(t.platform); });
    return ['All', ...Array.from(plats)];
  }, [templates, selectedCategory]);

  // ── Slug Highlight Logic ──
  useEffect(() => {
    if (!highlightSlug || templates.length === 0) return;

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    const found = templates.find(t => t.slug === highlightSlug);
    if (!found) return;

    setHighlightedId(found.id);
    highlightTimeoutRef.current = setTimeout(() => setHighlightedId(null), 3500);

    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, [highlightSlug, templates]);

  useEffect(() => {
    if (highlightedId) {
      const el = document.getElementById(`template-${highlightedId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedId]);

  // ── Action Handlers ──
  const handlePreview = useCallback((slug) => {
    router.push(`/${slug}`);
  }, [router]);

  const handleUseTemplate = useCallback((slug) => {
    router.push(`/createcampaign?slug=${slug}`);
  }, [router]);

  const handleCopyLink = (slug) => {
    const url = `${window.location.origin}/create?slug=${slug}`;
    navigator.clipboard.writeText(url);
    alert('🔗 Template link copied to clipboard!');
  };

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedPlatform('');
    setShowFilters(false);
  }, []);

  const platformBadgeStyles = {
    tiktok: 'bg-slate-900 text-white',
    instagram: 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white shadow-sm',
    youtube: 'bg-rose-600 text-white',
    facebook: 'bg-blue-600 text-white',
    all: 'bg-slate-800 text-white',
  };

  const handleQuickFilter = (category) => {
    if (category === 'All') {
      setSelectedCategory('');
    } else {
      setSelectedCategory(category);
    }
  };

  const getCategoryEmoji = (cat) => categoryEmojis[cat?.toLowerCase()] || categoryEmojis.default;

  const isLoading = templatesLoading || featuredLoading;

  // ── SEO Constants ──
  const pageTitle = useMemo(() => {
    if (selectedCategory && selectedCategory !== 'All') return `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Templates – MakeTrend`;
    if (selectedPlatform && selectedPlatform !== 'All') return `${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} Templates – MakeTrend`;
    if (searchQuery) return `"${searchQuery}" Templates – MakeTrend`;
    pages: return 'Browse Campaign Templates – MakeTrend';
  }, [selectedCategory, selectedPlatform, searchQuery]);

  const pageDescription = 'Explore an elite collection of viral campaign templates. Customize, launch, and grow your audience in minutes.';
  const templateNames = templates.map(t => t.title).slice(0, 10);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://maketrend.app';
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": pageTitle,
    "description": pageDescription,
    "itemListElement": templates.map((template, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${siteUrl}/create?slug=${template.slug}`,
      "name": template.title,
      "image": template.image || `${siteUrl}/default-template.png`,
    })),
  };

  return (
    <>
      <Meta title={pageTitle} description={pageDescription} extraKeywords={templateNames} />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 pb-32 bg-slate-50/60 min-h-screen">
        
        {/* ── Page Header Banner ── */}
        <div className="mb-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-purple-200 mb-3 border border-white/10">
              🚀 Campaign Creator Hub
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              Launch High-Converting Campaigns Instantly
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Choose from professionally designed viral templates optimized for engagement, social growth, and giveaways.
            </p>
          </div>
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates, giveaways, rewards..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:border-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-600/10 transition-all shadow-sm placeholder:text-slate-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-5 py-3 border rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                showFilters || selectedCategory || selectedPlatform
                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Advanced Filters</span>
              {(selectedCategory || selectedPlatform) && (
                <span className="bg-purple-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                  {(selectedCategory ? 1 : 0) + (selectedPlatform ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* ── Quick Categories Bar ── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleQuickFilter(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm capitalize ${
                  (cat === 'All' && !selectedCategory) || selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-purple-200 shadow-md scale-[1.02]'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{cat === 'All' ? '🔥' : getCategoryEmoji(cat)}</span>
                <span>{cat === 'All' ? 'All Templates' : cat}</span>
              </button>
            ))}
          </div>

          {/* ── Expandable Advanced Filters ── */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter by Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-purple-600 focus:outline-none"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat === 'All' ? '' : cat}>
                      {cat === 'All' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter by Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-purple-600 focus:outline-none"
                >
                  {availablePlatforms.map(plat => (
                    <option key={plat} value={plat === 'All' ? '' : plat}>
                      {plat === 'All' ? 'All Platforms' : plat.charAt(0).toUpperCase() + plat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Featured Templates Section ── */}
        {featuredFiltered.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {hasFilters || isSlugFeatured ? 'Featured Results' : 'Featured Campaign Spotlight'}
                </h2>
              </div>
              {showCarousel && (
                <span className="text-[10px] font-extrabold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  ✨ Auto-Rotating Spotlight
                </span>
              )}
            </div>

            {showCarousel ? (
              // ── PC & Phone Optimized Carousel ──
              <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-lg">
                <div
                  className="flex transition-transform duration-700 ease-in-out h-full"
                  style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                >
                  {featuredFiltered.map((template) => (
                    <div key={template.id} className="w-full flex-shrink-0">
                      <div className="flex flex-col md:flex-row h-full items-stretch">
                        
                        {/* Image Side */}
                        <div className="w-full md:w-3/5 aspect-video md:aspect-auto md:min-h-[340px] bg-slate-900 overflow-hidden relative shrink-0">
                          {template.image ? (
                            <img
                              src={template.image}
                              alt={template.title}
                              className="w-full h-full object-cover md:absolute md:inset-0 hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                              No Image Available
                            </div>
                          )}
                          <div className="absolute top-4 left-4 z-10 flex gap-2">
                            <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                              ⭐ Featured Spotlight
                            </span>
                          </div>
                        </div>

                        {/* Content Side */}
                        <div className="p-6 sm:p-8 lg:p-10 bg-white flex flex-col justify-between flex-1">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              {template.platform && (
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm ${platformBadgeStyles[template.platform] || 'bg-slate-800 text-white'}`}>
                                  {template.platform}
                                </span>
                              )}
                              <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2.5 py-1 rounded-md flex items-center gap-1">
                                👥 {template.usageCount || 0} Uses
                              </span>
                            </div>

                            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mb-2 leading-snug">
                              {template.title}
                            </h3>
                            <p className="text-slate-500 text-xs sm:text-sm line-clamp-3 leading-relaxed mb-6">
                              {template.description || 'High-converting layout optimized for viral social media engagement and traffic generation.'}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                            <button
                              onClick={() => handlePreview(template.slug)}
                              className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl py-3 transition active:scale-95"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Live Preview
                            </button>
                            <button
                              onClick={() => handleUseTemplate(template.slug)}
                              className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl py-3 transition shadow-lg shadow-purple-600/20 active:scale-95"
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
                  ))}
                </div>

                {/* Carousel Controls */}
                {featuredFiltered.length > 1 && (
                  <>
                    <button
                      onClick={() => goToSlide((carouselIndex - 1 + featuredFiltered.length) % featuredFiltered.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/90 hover:bg-white shadow-lg backdrop-blur-md border border-slate-200 transition-all text-slate-700"
                      aria-label="Previous slide"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => goToSlide((carouselIndex + 1) % featuredFiltered.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/90 hover:bg-white shadow-lg backdrop-blur-md border border-slate-200 transition-all text-slate-700"
                      aria-label="Next slide"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm">
                      {featuredFiltered.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => goToSlide(idx)}
                          className={`h-2 rounded-full transition-all ${idx === carouselIndex ? 'bg-purple-600 w-5' : 'bg-slate-300 w-2'}`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredFiltered.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isHighlighted={highlightedId === template.id}
                    onPreview={handlePreview}
                    onUse={handleUseTemplate}
                    onCopy={handleCopyLink}
                    platformBadgeStyles={platformBadgeStyles}
                    isFeatured
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Regular Templates Header ── */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
            {hasFilters || isSlugFeatured ? 'Search Results' : 'Explore All Templates'}
          </h2>
          <span className="text-xs text-slate-400 font-bold bg-white px-3 py-1 rounded-full border border-slate-200">
            {regularTemplates.length} Available
          </span>
        </div>

        {/* ── Grid Container & Loading States ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
                <div className="w-full aspect-video bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
                  <div className="h-3 bg-slate-200 rounded-lg w-1/2" />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="h-9 bg-slate-200 rounded-xl" />
                    <div className="h-9 bg-slate-200 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : regularTemplates.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm px-6 max-w-lg mx-auto">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
              🔍
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No matching templates found</h3>
            <p className="text-xs text-slate-500 mb-6">Try clearing your search terms or resetting filters to see everything.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-5 py-2.5 bg-purple-600 text-white font-bold rounded-xl text-xs hover:bg-purple-700 transition shadow-md shadow-purple-600/20"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {regularTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isHighlighted={highlightedId === template.id}
                onPreview={handlePreview}
                onUse={handleUseTemplate}
                onCopy={handleCopyLink}
                platformBadgeStyles={platformBadgeStyles}
                isFeatured={false}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

// ── Reusable Template Card Component ──
function TemplateCard({ template, isHighlighted, onPreview, onUse, onCopy, platformBadgeStyles, isFeatured }) {
  return (
    <div
      id={`template-${template.id}`}
      className={`group bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 ${
        isHighlighted
          ? 'border-purple-600 ring-4 ring-purple-600/10'
          : isFeatured
          ? 'border-amber-300 hover:border-amber-400'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Thumbnail Area */}
      <div className="w-full aspect-video bg-slate-100 relative overflow-hidden">
        {template.image ? (
          <img
            src={template.image}
            alt={template.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-wider">
            No Preview Image
          </div>
        )}
        <div className="absolute top-3 inset-x-3 flex justify-between items-start z-10 pointer-events-none">
          {isFeatured ? (
            <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-2 py-0.5 rounded shadow-md">
              ⭐ Featured
            </span>
          ) : <span />}
          {template.platform && (
            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-md ${platformBadgeStyles[template.platform] || 'bg-slate-800 text-white'}`}>
              {template.platform}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-1 group-hover:text-purple-600 transition-colors mb-1">
            {template.title}
          </h3>
          <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-4">
            {template.description || 'Optimized layout built to drive social traffic and campaign conversions.'}
          </p>

          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <div className="flex flex-wrap gap-1">
              {template.hashtags && template.hashtags.length > 0 ? (
                template.hashtags.slice(0, 1).map((tag, i) => (
                  <span key={i} className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                  Standard Layout
                </span>
              )}
            </div>
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              👥 {template.usageCount || 0}
            </div>
          </div>

          {template.reward && (
            <div className="mb-4 flex items-center justify-between gap-1 bg-amber-50/80 border border-amber-200/60 px-2.5 py-1.5 rounded-xl">
              <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                🎁 {template.reward}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(template.slug);
                }}
                className="text-xs text-slate-400 hover:text-purple-600 transition p-1 rounded-lg hover:bg-amber-100/50"
                title="Copy template link"
              >
                🔗
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onPreview(template.slug)}
            className="flex items-center justify-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl py-2.5 transition active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
          <button
            onClick={() => onUse(template.slug)}
            className="flex items-center justify-center gap-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl py-2.5 transition shadow-md shadow-purple-600/20 active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Use Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Static Props Hydration ──
export async function getStaticProps() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
  
  const res = await fetch(`${BACKEND_URL}/api/templates`);
  const data = await res.json();
  const templates = data.templates || [];

  const featuredRes = await fetch(`${BACKEND_URL}/api/templates?highlight=true`);
  const featuredData = await featuredRes.json();
  const featuredTemplates = featuredData.templates || [];

  return {
    props: {
      initialTemplates: templates,
      initialFeaturedTemplates: featuredTemplates,
    },
    revalidate: 60,
  };
}