// pages/create.js
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import Meta from '../components/Meta';
import { useTemplates, useFeaturedTemplates } from '../lib/queries';

// ── Emoji mapping for categories ──
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

  // ── Hydrate React Query cache with pre‑fetched data ──
  useEffect(() => {
    queryClient.setQueryData(['templates'], initialTemplates);
    queryClient.setQueryData(['featuredTemplates'], initialFeaturedTemplates);
  }, [initialTemplates, initialFeaturedTemplates, queryClient]);

  // ── React Query data (now from cache, instantly available) ──
  const { data: templates = [], isLoading: templatesLoading } = useTemplates();
  const { data: featuredTemplates = [], isLoading: featuredLoading } = useFeaturedTemplates();

  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const highlightTimeoutRef = useRef(null);
  const carouselIntervalRef = useRef(null);

  // ── Sync search from URL ──
  useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  // ── Highlight template from URL slug ──
  useEffect(() => {
    if (highlightSlug && templates.length > 0) {
      const found = templates.find(t => t.slug === highlightSlug);
      if (found) {
        setHighlightedId(found.id);
        highlightTimeoutRef.current = setTimeout(() => setHighlightedId(null), 3000);
      }
    }
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    };
  }, [highlightSlug, templates]);

  useEffect(() => {
    if (highlightedId) {
      const el = document.getElementById(`template-${highlightedId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedId]);

  // ── Apply search & filters to ALL templates ──
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

  // ── Split into regular (non-featured) ──
  const regularTemplates = useMemo(() => {
    return filteredAll.filter(t => !t.isHighlight);
  }, [filteredAll]);

  // ── Filtered featured templates (respects search & filters) ──
  const filteredFeatured = useMemo(() => {
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

  // ── Carousel auto-slide (pauses when filters are active) ──
  useEffect(() => {
    const hasFilters = searchQuery.trim() || selectedCategory || selectedPlatform;
    if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    carouselIntervalRef.current = null;

    if (filteredFeatured.length > 1 && !hasFilters) {
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex(prev => (prev + 1) % filteredFeatured.length);
      }, 2000);
    } else {
      setCarouselIndex(0);
    }
    return () => {
      if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    };
  }, [filteredFeatured.length, searchQuery, selectedCategory, selectedPlatform]);

  const goToSlide = useCallback((index) => {
    setCarouselIndex(index);
    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
      const hasFilters = searchQuery.trim() || selectedCategory || selectedPlatform;
      if (filteredFeatured.length > 1 && !hasFilters) {
        carouselIntervalRef.current = setInterval(() => {
          setCarouselIndex(prev => (prev + 1) % filteredFeatured.length);
        }, 2000);
      }
    }
  }, [filteredFeatured.length, searchQuery, selectedCategory, selectedPlatform]);

  // ── Filters dropdown options ──
  const categories = useMemo(() => {
    const cats = new Set();
    templates.forEach(t => { if (t.category) cats.add(t.category); });
    return ['All', ...Array.from(cats)];
  }, [templates]);

  const platforms = useMemo(() => {
    const plats = new Set();
    templates.forEach(t => { if (t.platform) plats.add(t.platform); });
    return ['All', ...Array.from(plats)];
  }, [templates]);

  const handlePreview = useCallback((slug) => {
    router.push(`/${slug}`);
  }, [router]);

  const handleUseTemplate = useCallback((slug) => {
    router.push(`/createcampaign?slug=${slug}`);
  }, [router]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedPlatform('');
    setShowFilters(false);
  }, []);

  const platformBadgeStyles = {
    tiktok: 'bg-black text-white hover:bg-neutral-900',
    instagram: 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white',
    youtube: 'bg-[#FF0000] text-white hover:bg-red-700',
    facebook: 'bg-[#1877F2] text-white hover:bg-blue-700',
    all: 'bg-slate-800 text-white',
  };

  const handleQuickFilter = (category) => {
    if (category === 'All') {
      setSelectedCategory('');
    } else {
      setSelectedCategory(category);
    }
  };

  const getCategoryEmoji = (cat) => {
    return categoryEmojis[cat?.toLowerCase()] || categoryEmojis.default;
  };

  const isLoading = templatesLoading || featuredLoading;

  if (!isLoading && templates.length === 0) {
    return (
      <>
        <Meta title="No Templates" />
        <main className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📭</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">No templates found</h2>
          <p className="text-slate-500 text-xs">Please explore our features later.</p>
        </main>
      </>
    );
  }

  // ── Build keyword list from template titles for SEO ──
  const templateNames = templates.map(t => t.title).slice(0, 10);

  return (
    <>
     <Meta
  title="Browse Campaign Templates – Make Trend"
  description="Explore a curated collection of viral campaign templates. Customize, launch, and start growing your audience in minutes."
  extraKeywords={templateNames}
/>
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 pb-28 bg-slate-50/40 min-h-screen">

        {/* ── Search & Quick Filters ── */}
        <div className="mb-5 space-y-2.5">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates, rewards..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-slate-400 font-semibold"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm ${
                showFilters || selectedCategory || selectedPlatform
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span className="hidden sm:inline">Filters</span>
              {(selectedCategory || selectedPlatform) && (
                <span className="bg-primary text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {(selectedCategory ? 1 : 0) + (selectedPlatform ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* ── Dynamic Quick Filter Pills ── */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleQuickFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap transition-all capitalize ${
                  (cat === 'All' && !selectedCategory) || selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {cat === 'All' ? '🔥 All' : `${getCategoryEmoji(cat)} ${cat}`}
              </button>
            ))}
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-100 rounded-xl border border-slate-200">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-2 pr-6 py-1.5 text-[11px] font-bold text-slate-700 focus:border-primary focus:outline-none"
              >
                <option value="">Categories (All)</option>
                {categories.filter(c => c !== 'All').map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg pl-2 pr-6 py-1.5 text-[11px] font-bold text-slate-700 focus:border-primary focus:outline-none"
              >
                <option value="">Platforms (All)</option>
                {platforms.filter(p => p !== 'All').map(plat => (
                  <option key={plat} value={plat}>{plat.charAt(0).toUpperCase() + plat.slice(1)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Featured Templates Spotlight ── */}
        {filteredFeatured.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-1 mb-2 px-0.5">
              <span className="text-amber-500 text-sm">★</span>
              <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                {searchQuery || selectedCategory || selectedPlatform ? 'Featured Results' : 'Featured Template'}
              </h2>
              {!searchQuery && !selectedCategory && !selectedPlatform && (
                <span className="text-[9px] bg-primary/10 text-primary px-1 rounded-full font-extrabold ml-2 flex items-center">
                  Auto-play
                </span>
              )}
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
              >
                {filteredFeatured.map((template) => (
                  <div key={template.id} className="w-full flex-shrink-0">
                    <div className="flex flex-col">
                      <div className="w-full aspect-video bg-slate-100 overflow-hidden relative">
                        {template.image ? (
                          <img
                            src={template.image}
                            alt={template.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <span className="text-[10px] font-bold tracking-wider uppercase">No Image</span>
                          </div>
                        )}
                        <div className="absolute top-2.5 left-2.5 flex gap-1 z-10">
                          <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            ⭐ Featured
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-white">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {template.platform && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${platformBadgeStyles[template.platform] || 'bg-slate-800 text-white'}`}>
                              {template.platform}
                            </span>
                          )}
                          <span className="bg-slate-50 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center">
                            👥 {template.usageCount || 0} Uses
                          </span>
                        </div>

                        <h3 className="text-sm font-black leading-tight text-slate-950 mb-0.5">
                          {template.title}
                        </h3>
                        <p className="text-slate-500 text-[11px] line-clamp-1 mb-2 leading-snug">
                          {template.description || 'Launch your campaign with this template.'}
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handlePreview(template.slug)}
                            className="flex items-center justify-center gap-1 text-[11px] font-black text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 transition active:scale-95"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUseTemplate(template.slug)}
                            className="flex items-center justify-center gap-1 text-[11px] font-black text-white bg-primary hover:opacity-95 rounded-xl py-2 transition shadow-sm active:scale-95"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                            Use
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Prev / Next Buttons ── */}
              {filteredFeatured.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => goToSlide((carouselIndex - 1 + filteredFeatured.length) % filteredFeatured.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-md backdrop-blur-sm border border-slate-200 transition-all"
                    aria-label="Previous slide"
                  >
                    <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => goToSlide((carouselIndex + 1) % filteredFeatured.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-md backdrop-blur-sm border border-slate-200 transition-all"
                    aria-label="Next slide"
                  >
                    <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* ── Dots ── */}
              {filteredFeatured.length > 1 && (
                <div className="absolute bottom-24 right-3 flex gap-1 z-20">
                  {filteredFeatured.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => goToSlide(idx)}
                      className={`h-1 rounded-full transition-all ${
                        idx === carouselIndex ? 'bg-primary w-3' : 'bg-slate-300 w-1'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Normal Templates Header ── */}
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            {searchQuery || selectedCategory || selectedPlatform ? 'Search Results' : 'All Templates'}
          </h2>
          <span className="text-[10px] text-slate-400 font-bold">
            Showing {regularTemplates.length} templates
          </span>
        </div>

        {/* ── Regular Templates Grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
                <div className="w-full aspect-video bg-slate-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="h-6 bg-slate-200 rounded-lg" />
                    <div className="h-6 bg-slate-200 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : regularTemplates.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm px-4">
            <span className="text-2xl mb-1.5 block">🔍</span>
            <h3 className="text-xs font-bold text-slate-900 mb-0.5">No templates match</h3>
            <p className="text-[11px] text-slate-500 mb-3 max-w-xs mx-auto">Try resetting filters to view all templates.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-3.5 py-1.5 bg-primary/10 text-primary font-bold rounded-lg text-xs hover:bg-primary/20 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {regularTemplates.map((template) => {
              const isHighlighted = highlightedId === template.id;
              return (
                <div
                  key={template.id}
                  id={`template-${template.id}`}
                  className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-sm ${
                    isHighlighted ? 'border-primary ring-4 ring-primary/10' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="w-full aspect-video bg-slate-100 relative overflow-hidden">
                    {template.image ? (
                      <img
                        src={template.image}
                        alt={template.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                        <span className="text-[10px] font-bold tracking-wider uppercase">No Image</span>
                      </div>
                    )}

                    <div className="absolute top-2 inset-x-2 flex justify-between items-start pointer-events-none z-20">
                      <div className="flex flex-col gap-0.5">
                        {template.isHighlight && (
                          <span className="bg-amber-400 text-amber-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">
                            ⭐ Featured
                          </span>
                        )}
                      </div>
                      {template.platform && (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm ${platformBadgeStyles[template.platform] || 'bg-slate-800 text-white'}`}>
                          {template.platform}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1.5">
                        <h3 className="font-bold text-slate-950 text-xs leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                          {template.title}
                        </h3>
                      </div>
                      <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-1 leading-relaxed">
                        {template.description || 'Customizable layout built to match social trends.'}
                      </p>

                      <div className="mt-1 flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex flex-wrap gap-1">
                          {template.hashtags && template.hashtags.length > 0 ? (
                            template.hashtags.slice(0, 1).map((tag, i) => (
                              <span key={i} className="text-[9px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                              Standard
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-extrabold text-slate-400 flex items-center">
                          👥 {template.usageCount || 0}
                        </div>
                      </div>

                      {template.reward && (
                        <div className="mt-1 text-[10px] font-extrabold text-amber-600 flex items-center gap-0.5 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-lg w-fit">
                          🎁 {template.reward}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreview(template.slug)}
                        className="flex-1 flex items-center justify-center gap-1 text-[11px] font-black text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 transition active:scale-95"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUseTemplate(template.slug)}
                        className="flex-1 flex items-center justify-center gap-1 text-[11px] font-black text-white bg-primary hover:opacity-95 rounded-xl py-2 transition shadow-sm active:scale-95"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                        Use
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

// ── Pre‑fetch templates at build time ──
export async function getStaticProps() {
  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
  // Fetch all templates
  const res = await fetch(`${apiBase}/api/templates`);
  const data = await res.json();
  const templates = data.templates || [];

  // Fetch featured templates separately
  const featuredRes = await fetch(`${apiBase}/api/templates?highlight=true`);
  const featuredData = await featuredRes.json();
  const featuredTemplates = featuredData.templates || [];

  return {
    props: {
      initialTemplates: templates,
      initialFeaturedTemplates: featuredTemplates,
    },
    revalidate: 60, // ISR – refresh every 60 seconds
  };
}