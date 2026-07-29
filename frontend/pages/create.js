
// pages/create.js
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import Meta from '../components/Meta';
import { useTemplates, useFeaturedTemplates } from '../lib/queries';

// ── Category Icons ──
const categoryIcons = {
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

// ── Platform Colors ──
const platformColors = {
  tiktok: 'bg-black text-white',
  instagram: 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white',
  youtube: 'bg-[#FF0000] text-white',
  facebook: 'bg-[#1877F2] text-white',
  twitter: 'bg-[#1DA1F2] text-white',
  default: 'bg-slate-700 text-white',
};

export default function Create({ initialTemplates, initialFeaturedTemplates }) {
  const router = useRouter();
  const { slug: highlightSlug, search: initialSearch, category: initialCategory, platform: initialPlatform } = router.query;
  const queryClient = useQueryClient();

  // ── Hydrate React Query cache ──
  useEffect(() => {
    queryClient.setQueryData(['templates'], initialTemplates);
    queryClient.setQueryData(['featuredTemplates'], initialFeaturedTemplates);
  }, [initialTemplates, initialFeaturedTemplates, queryClient]);

  // ── State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Sync search from URL (Runs once when router is ready) ──
  useEffect(() => {
    if (!router.isReady) return;
    if (initialSearch !== undefined) setSearchQuery(initialSearch);
    if (initialCategory) setSelectedCategory(initialCategory);
    if (initialPlatform) setSelectedPlatform(initialPlatform);
  }, [router.isReady, initialSearch, initialCategory, initialPlatform]);

  // ── React Query data ──
  const activeFilters = useMemo(() => {
    const filters = {};
    if (selectedCategory) filters.category = selectedCategory;
    if (selectedPlatform) filters.platform = selectedPlatform;
    return filters;
  }, [selectedCategory, selectedPlatform]);

  const { data: templates = [], isLoading: templatesLoading } = useTemplates(activeFilters, initialTemplates);
  const { data: featuredTemplates = [], isLoading: featuredLoading } = useFeaturedTemplates(activeFilters, initialFeaturedTemplates);

  const hasInitialData = (initialTemplates && initialTemplates.length > 0) || 
                         (initialFeaturedTemplates && initialFeaturedTemplates.length > 0);
  const isLoading = (templatesLoading || featuredLoading) && !hasInitialData;

  const highlightTimeoutRef = useRef(null);
  const carouselIntervalRef = useRef(null);

  const hasFilters = Boolean(searchQuery.trim() || selectedCategory || selectedPlatform);

  // ── Update URL silently when filters change ──
  useEffect(() => {
    if (!router.isReady) return;
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedPlatform) params.set('platform', selectedPlatform);
    if (highlightSlug) params.set('slug', highlightSlug);
    
    const newUrl = params.toString() ? `/create?${params.toString()}` : '/create';
    
    // Only replace if the path actually changed to prevent infinite loops
    if (router.asPath.split('?')[0] === '/create' && router.asPath !== newUrl) {
      router.replace(newUrl, undefined, { shallow: true });
    }
  }, [searchQuery, selectedCategory, selectedPlatform, highlightSlug, router.isReady, router.asPath]);

  // ── Apply search & filters locally ──
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

  // ── Determine if slug is featured ──
  const isSlugFeatured = useMemo(() => {
    if (!highlightSlug) return false;
    return templates.some(t => t.slug === highlightSlug && t.isHighlight);
  }, [highlightSlug, templates]);

  // ── Should show carousel? ──
  const showCarousel = !hasFilters && !isSlugFeatured && featuredFiltered.length > 1;

  // ── Carousel auto-slide ──
  useEffect(() => {
    if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    carouselIntervalRef.current = null;

    if (showCarousel) {
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex(prev => (prev + 1) % featuredFiltered.length);
      }, 3500);
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
        }, 3500);
      }
    }
  }, [featuredFiltered.length, showCarousel]);

  // ── Dynamic filter options ──
  const availableCategories = useMemo(() => {
    const cats = new Set();
    const source = selectedPlatform
      ? templates.filter(t => t.platform === selectedPlatform)
      : templates;
    source.forEach(t => { if (t.category) cats.add(t.category); });
    return ['All', ...Array.from(cats)];
  }, [templates, selectedPlatform]);

  const availablePlatforms = useMemo(() => {
    const plats = new Set();
    const source = selectedCategory
      ? templates.filter(t => t.category === selectedCategory)
      : templates;
    source.forEach(t => { if (t.platform) plats.add(t.platform); });
    return ['All', ...Array.from(plats)];
  }, [templates, selectedCategory]);

  // ── Handle slug highlight & Scroll ──
  useEffect(() => {
    // Only attempt scroll if we have a slug, and templates are fully loaded into memory
    if (!highlightSlug || isLoading || templates.length === 0) return;

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
  }, [highlightSlug, templates, isLoading]);

  useEffect(() => {
    if (highlightedId) {
      // Small timeout ensures the DOM has fully painted the template card
      setTimeout(() => {
        const el = document.getElementById(`template-${highlightedId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightedId]);

  // ── Handlers ──
  const handlePreview = useCallback((slug) => {
    router.push(`/${slug}`);
  }, [router]);

  const handleUseTemplate = useCallback((slug) => {
    router.push(`/createcampaign?slug=${slug}`);
  }, [router]);

  const handleCopyLink = (slug) => {
    const url = `${window.location.origin}/create?slug=${slug}`;
    navigator.clipboard.writeText(url);
    alert('🔗 Link copied to clipboard!');
  };

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedPlatform('');
    setIsFilterOpen(false);
  }, []);

  const removeCategory = useCallback(() => {
    setSelectedCategory('');
  }, []);

  const removePlatform = useCallback(() => {
    setSelectedPlatform('');
  }, []);

  const getCategoryIcon = (cat) => {
    return categoryIcons[cat?.toLowerCase()] || categoryIcons.default;
  };

  const getPlatformColor = (platform) => {
    return platformColors[platform?.toLowerCase()] || platformColors.default;
  };

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

  // ── SEO ──
  const pageTitle = useMemo(() => {
    if (selectedCategory && selectedCategory !== 'All') return `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Templates – Make Trend`;
    if (selectedPlatform && selectedPlatform !== 'All') return `${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} Templates – Make Trend`;
    if (searchQuery) return `"${searchQuery}" Templates – Make Trend`;
    return 'Browse Campaign Templates – Make Trend';
  }, [selectedCategory, selectedPlatform, searchQuery]);

  const pageDescription = useMemo(() => {
    if (selectedCategory && selectedCategory !== 'All') return `Explore the best ${selectedCategory} templates to launch viral campaigns. Customize, launch, and grow your audience.`;
    if (selectedPlatform && selectedPlatform !== 'All') return `Explore ${selectedPlatform} templates to launch viral campaigns. Customize, launch, and grow your audience.`;
    if (searchQuery) return `Search results for "${searchQuery}". Find the perfect template to launch your campaign.`;
    return 'Explore a curated collection of viral campaign templates. Customize, launch, and start growing your audience in minutes.';
  }, [selectedCategory, selectedPlatform, searchQuery]);

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
      "description": template.description || 'Launch your campaign with this template.',
    })),
  };

  const activeFilterCount = (selectedCategory ? 1 : 0) + (selectedPlatform ? 1 : 0);

  return (
    <>
      <Meta 
        title={pageTitle} 
        description={pageDescription} 
        extraKeywords={templateNames}
        canonical={`${siteUrl}/create${searchQuery ? `?search=${searchQuery}` : ''}${selectedCategory ? `&category=${selectedCategory}` : ''}${selectedPlatform ? `&platform=${selectedPlatform}` : ''}`}
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 pb-28 bg-slate-50/40 min-h-screen">

        {/* ─── PROFESSIONAL COMPACT BANNER ─── */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 sm:p-5 mb-5 text-white shadow-md">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl leading-none">🚀</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">Get Started</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold mb-1 truncate">Create Your Campaign</h2>
              <p className="text-xs sm:text-sm text-indigo-100 line-clamp-2">
                Select a template, set tasks, add a redirect URL, and launch instantly!
              </p>
            </div>
            {/* Steps pills wrap neatly on mobile */}
            <div className="flex flex-wrap items-center gap-1.5 lg:gap-2 flex-shrink-0 w-full lg:w-auto mt-1 lg:mt-0">
              <span className="bg-white/10 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold whitespace-nowrap border border-white/5">📋 Choose</span>
              <span className="text-white/40 text-xs hidden sm:inline">→</span>
              <span className="bg-white/10 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold whitespace-nowrap border border-white/5">⚙️ Tasks</span>
              <span className="text-white/40 text-xs hidden sm:inline">→</span>
              <span className="bg-white/10 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold whitespace-nowrap border border-white/5">🔗 Launch</span>
            </div>
          </div>
        </div>

        {/* ─── Search & Advanced Filters ── */}
        <div className="mb-5 space-y-3">
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
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-slate-400 font-semibold shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-0.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-3 py-2.5 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                isFilterOpen || selectedCategory || selectedPlatform
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {hasFilters && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition shadow-sm"
                title="Clear all filters"
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Active Filter Chips ── */}
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedCategory && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 border border-purple-200 text-purple-700 rounded-full text-[11px] font-bold shadow-sm">
                  {getCategoryIcon(selectedCategory)} {selectedCategory}
                  <button onClick={removeCategory} className="hover:text-purple-900 ml-0.5 bg-purple-200/50 rounded-full p-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </span>
              )}
              {selectedPlatform && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-black/10 text-[11px] font-bold shadow-sm ${getPlatformColor(selectedPlatform)}`}>
                  {selectedPlatform}
                  <button onClick={removePlatform} className="hover:opacity-70 ml-0.5 bg-black/10 rounded-full p-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[11px] font-bold shadow-sm">
                  🔍 "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-slate-900 ml-0.5 bg-slate-200/50 rounded-full p-0.5"><svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </span>
              )}
            </div>
          )}

          {/* ── Filter Dropdown ── */}
          {isFilterOpen && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4 animate-fadeIn relative z-20">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Advanced Filters</h3>
                <button onClick={() => setIsFilterOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Filter By Category</label>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          if (cat === 'All' || selectedCategory === cat) setSelectedCategory('');
                          else setSelectedCategory(cat);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize border ${
                          (cat === 'All' && !selectedCategory) || selectedCategory === cat
                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        {cat === 'All' ? 'All Categories' : `${getCategoryIcon(cat)} ${cat}`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Filter By Platform</label>
                  <div className="flex flex-wrap gap-2">
                    {availablePlatforms.map((plat) => (
                      <button
                        key={plat}
                        onClick={() => {
                          if (plat === 'All' || selectedPlatform === plat) setSelectedPlatform('');
                          else setSelectedPlatform(plat);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize border ${
                          (plat === 'All' && !selectedPlatform) || selectedPlatform === plat
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {plat === 'All' ? 'All Platforms' : plat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Featured Templates Section ── */}
        {featuredFiltered.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-1.5 mb-3 px-1">
              <span className="text-amber-500 text-sm drop-shadow-sm">★</span>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-600">
                {hasFilters || isSlugFeatured ? 'Featured Results' : 'Featured Spotlight'}
              </h2>
              {showCarousel && (
                <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded-md font-extrabold ml-2 flex items-center">
                  Auto-play
                </span>
              )}
            </div>

            {showCarousel ? (
              <div id="featured-carousel" className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-md group">
                <div
                  className="flex transition-transform duration-700 ease-in-out h-full"
                  style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                >
                  {featuredFiltered.map((template) => (
                    <div key={template.id} className="w-full flex-shrink-0">
                      <div className="flex flex-col md:flex-row h-full">
                        <div className="w-full md:w-1/2 lg:w-[55%] aspect-video md:aspect-auto md:min-h-[300px] bg-slate-100 overflow-hidden relative shrink-0">
                          {template.image ? (
                            <Image
                              src={template.image}
                              alt={template.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 55vw"
                              priority={carouselIndex === 0}
                              loading={carouselIndex === 0 ? 'eager' : 'lazy'}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                              <span className="text-xs font-bold tracking-wider uppercase">No Preview Image</span>
                            </div>
                          )}
                          <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                            <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-md border border-amber-300">
                              ⭐ Featured
                            </span>
                          </div>
                        </div>

                        <div className="p-5 md:p-6 lg:p-8 bg-white flex flex-col justify-center flex-1">
                          
                          {/* Unified Tag Row for Featured */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            {template.platform && (
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-sm ${getPlatformColor(template.platform)}`}>
                                {template.platform}
                              </span>
                            )}
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md shadow-sm border ${template.plan === 'pro' || template.isPro ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                              {template.plan === 'pro' || template.isPro ? '👑 PRO' : '✅ FREE'}
                            </span>
                            {template.reward && (
                              <span className="text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
                                🎁 {template.reward}
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg md:text-xl lg:text-2xl font-black leading-tight text-slate-900 mb-2">
                            {template.title}
                          </h3>
                          <p className="text-slate-500 text-xs md:text-sm line-clamp-2 md:line-clamp-3 mb-4 leading-relaxed">
                            {template.description || 'Premium campaign layout built to maximize your engagement and user conversion.'}
                          </p>

                          <div className="grid grid-cols-2 gap-3 mt-auto">
                            <button
                              onClick={() => handlePreview(template.slug)}
                              className="flex items-center justify-center gap-1.5 text-xs md:text-sm font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl py-3 transition active:scale-95"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              Preview
                            </button>
                            <button
                              onClick={() => handleUseTemplate(template.slug)}
                              className="flex items-center justify-center gap-1.5 text-xs md:text-sm font-black text-white bg-primary hover:bg-primary-600 rounded-xl py-3 transition shadow-md shadow-primary/20 active:scale-95"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                              Use Template
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {featuredFiltered.length > 1 && (
                  <>
                    <button
                      onClick={() => goToSlide((carouselIndex - 1 + featuredFiltered.length) % featuredFiltered.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-white/90 hover:bg-white shadow-lg backdrop-blur-md border border-slate-200 transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Previous slide"
                    >
                      <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => goToSlide((carouselIndex + 1) % featuredFiltered.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-white/90 hover:bg-white shadow-lg backdrop-blur-md border border-slate-200 transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Next slide"
                    >
                      <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/20 backdrop-blur-md px-2.5 py-1.5 rounded-full">
                      {featuredFiltered.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => goToSlide(idx)}
                          className={`h-1.5 rounded-full transition-all ${idx === carouselIndex ? 'bg-white w-5' : 'bg-white/50 w-1.5'}`}
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
                    getPlatformColor={getPlatformColor}
                    isFeatured
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Normal Templates Header ── */}
        <div className="flex items-center justify-between mb-3 px-1 border-t border-slate-200/60 pt-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-600">
            {hasFilters || isSlugFeatured ? 'Search Results' : 'Explore All Templates'}
          </h2>
          <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
            {regularTemplates.length} Available
          </span>
        </div>

        {/* ── Regular Templates Grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-pulse">
                <div className="w-full aspect-video bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="h-9 bg-slate-200 rounded-xl" />
                    <div className="h-9 bg-slate-200 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : regularTemplates.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm px-4 max-w-lg mx-auto">
            <span className="text-4xl mb-3 block">🔍</span>
            <h3 className="text-base font-bold text-slate-900 mb-1">No templates match</h3>
            <p className="text-xs text-slate-500 mb-4">Try adjusting or clearing your filters to see more templates.</p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-5 py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-sm hover:bg-primary/20 transition-colors shadow-sm"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isHighlighted={highlightedId === template.id}
                onPreview={handlePreview}
                onUse={handleUseTemplate}
                onCopy={handleCopyLink}
                getPlatformColor={getPlatformColor}
                isFeatured={false}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

// ── Reusable Template Card ──
function TemplateCard({ template, isHighlighted, onPreview, onUse, onCopy, getPlatformColor, isFeatured }) {
  return (
    <div
      id={`template-${template.id}`}
      className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-lg hover:-translate-y-1 ${
        isHighlighted
          ? 'border-primary ring-4 ring-primary/20'
          : isFeatured
          ? 'border-amber-200 hover:border-amber-400'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="w-full aspect-video bg-slate-100 relative overflow-hidden">
        {template.image ? (
          <Image
            src={template.image}
            alt={template.title}
            fill
            className="object-cover group-hover:scale-105 transition duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            loading="lazy"
            quality={80}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <span className="text-[10px] font-bold tracking-wider uppercase">No Image</span>
          </div>
        )}
        <div className="absolute top-2.5 inset-x-2.5 flex justify-between items-start pointer-events-none z-20">
          <div className="flex flex-col gap-1">
            {isFeatured && (
              <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-2 py-0.5 rounded-md shadow-md border border-amber-300">
                ⭐ Featured
              </span>
            )}
          </div>
          {template.platform && (
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-md ${getPlatformColor(template.platform)}`}>
              {template.platform}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors">
              {template.title}
            </h3>
          </div>
          <p className="text-slate-500 text-[11px] mb-3 line-clamp-2 leading-relaxed">
            {template.description || 'Customizable campaign layout built to match viral social trends.'}
          </p>

          {/* Unified Tags Row (Hashtags, Plan, Reward) */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="flex flex-wrap gap-1.5">
              {template.hashtags && template.hashtags.length > 0 ? (
                template.hashtags.slice(0, 1).map((tag, i) => (
                  <span key={i} className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                  #Trending
                </span>
              )}
            </div>

            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${template.plan === 'pro' || template.isPro ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              {template.plan === 'pro' || template.isPro ? '👑 PRO' : '✅ FREE'}
            </span>

            {template.reward && (
              <span className="text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                🎁 {template.reward}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              👥 {template.usageCount || 0} Uses
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(template.slug);
              }}
              className="text-slate-400 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200"
              title="Copy link to this template"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2.5">
          <Link
            href={`/${template.slug}`}
            className="flex items-center justify-center gap-1.5 text-[11px] font-black text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2.5 transition active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            Preview
          </Link>
          <button
            onClick={() => onUse(template.slug)}
            className="flex items-center justify-center gap-1.5 text-[11px] font-black text-white bg-primary hover:bg-primary-600 rounded-xl py-2.5 transition shadow-sm active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            Use
          </button>
        </div>
      </div>
    </div>
  );
}

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
