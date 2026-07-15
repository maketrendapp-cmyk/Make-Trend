```react
// pages/create.js
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

// --- Premium Custom Vector Icons ---
const Icons = {
  Search: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Gift: () => (
    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 0h4l-2 3H10l-2-3h4zm-7 3h14v10a2 2 0 01-2 2H5a2 2 0 01-2-2V11z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-3.5 h-3.5 text-primary mr-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ImagePlaceholder: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
      <svg className="w-8 h-8 mb-1 opacity-55" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span className="text-[10px] font-bold tracking-wider uppercase">Loading Preview</span>
    </div>
  )
};

export default function Create() {
  const router = useRouter();
  const { slug: highlightSlug } = router.query;

  // ── State ──
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const highlightTimeoutRef = useRef(null);
  const carouselIntervalRef = useRef(null);

  // ── Memoized Fetch Function (Avoids full page refreshes on Retries) ──
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/templates`);
      if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
        if (highlightSlug) {
          const found = data.templates.find(t => t.slug === highlightSlug);
          if (found) {
            setHighlightedId(found.id);
            highlightTimeoutRef.current = setTimeout(() => setHighlightedId(null), 3000);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to fetch templates');
      }
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [highlightSlug]);

  // ── Fetch templates on mount or deep link change ──
  useEffect(() => {
    fetchTemplates();
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    };
  }, [fetchTemplates]);

  useEffect(() => {
    if (highlightedId) {
      const el = document.getElementById(`template-${highlightedId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedId]);

  const { featuredTemplates, regularTemplates } = useMemo(() => {
    const featured = templates.filter(t => t.isHighlight === true);
    const regular = templates.filter(t => !t.isHighlight);
    return { featuredTemplates: featured, regularTemplates: regular };
  }, [templates]);

  // ── Carousel auto‑slide ──
  useEffect(() => {
    if (featuredTemplates.length > 1) {
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex(prev => (prev + 1) % featuredTemplates.length);
      }, 5000);
    }
    return () => {
      if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    };
  }, [featuredTemplates.length]);

  const goToSlide = useCallback((index) => {
    setCarouselIndex(index);
    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex(prev => (prev + 1) % featuredTemplates.length);
      }, 5000);
    }
  }, [featuredTemplates.length]);

  // ── Filters ──
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

  const filteredRegular = useMemo(() => {
    let filtered = [...regularTemplates];
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
  }, [regularTemplates, searchQuery, selectedCategory, selectedPlatform]);

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

  if (error) {
    return (
      <>
        <Meta title="Error" />
        <main className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Failed to load templates</h2>
          <p className="text-slate-500 text-xs mb-5">{error}</p>
          <button
            type="button"
            onClick={fetchTemplates}
            className="w-full py-2.5 bg-primary text-white rounded-xl font-bold shadow-md shadow-primary/25 hover:bg-primary/95 transition active:scale-95"
          >
            Try Again
          </button>
        </main>
      </>
    );
  }

  if (!loading && templates.length === 0) {
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

  return (
    <>
      <Meta title="Choose a Template" description="Select a template to launch your campaign." />
      <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 pb-28 bg-slate-50/40 min-h-screen">
        
        {/* ── Modern Condensed Header ── */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <span className="bg-primary/10 text-primary p-1 rounded-lg">✨</span>
              Make Trend
            </h1>
          </div>
          <button 
            type="button"
            onClick={() => router.push('/logout')}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            Logout
          </button>
        </div>

        {/* ── Search, Quick Filters & Controls ── */}
        <div className="mb-5 space-y-2.5">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Icons.Search />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates, rewards, platforms..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-slate-400 font-semibold"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-[0_1px_5px_rgba(0,0,0,0.02)] ${
                showFilters || selectedCategory || selectedPlatform 
                  ? 'bg-primary/10 border-primary/20 text-primary' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icons.Filter />
              <span className="hidden sm:inline">Filters</span>
              {(selectedCategory || selectedPlatform) && (
                <span className="bg-primary text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {(selectedCategory ? 1 : 0) + (selectedPlatform ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Quick Filter Pill Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              type="button"
              onClick={() => handleQuickFilter('All')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap transition-all ${
                !selectedCategory 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-white text-slate-600 border border-slate-200/50 hover:border-slate-300'
              }`}
            >
              🔥 All
            </button>
            {categories.filter(c => c !== 'All' && c).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleQuickFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap transition-all capitalize ${
                  selectedCategory === cat 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-white text-slate-600 border border-slate-200/50 hover:border-slate-300'
                }`}
              >
                {cat === 'giveaway' ? '🎁' : cat === 'simcard' ? '🚀' : '✨'} {cat}
              </button>
            ))}
          </div>

          {/* Expanded Dropdown Filters */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-100 rounded-xl border border-slate-200/40">
              <div className="relative">
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
              </div>
              
              <div className="relative">
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
            </div>
          </div>
        </div>

        {/* ── Featured Templates Spotlight (Fit-Optimized Carousel) ── */}
        {featuredTemplates.length > 0 && !searchQuery && !selectedCategory && !selectedPlatform && (
          <div className="mb-6">
            <div className="flex items-center gap-1 mb-2 px-0.5">
              <span className="text-amber-500 text-sm">★</span>
              <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Featured Template</h2>
              <span className="text-[9px] bg-primary/10 text-primary px-1 rounded-full font-extrabold ml-2 flex items-center">
                <Icons.Clock /> Auto‑play
              </span>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div
                className="flex transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
              >
                {featuredTemplates.map((template) => (
                  <div key={template.id} className="w-full flex-shrink-0">
                    <div className="flex flex-col">
                      
                      {/* Image Frame (Double-Layer Fit Solution) */}
                      <div className="w-full aspect-[16/10] sm:aspect-[21/9] relative bg-slate-950 overflow-hidden">
                        
                        {/* Layer 1: Blurred Backdrop (Fills container perfectly) */}
                        {template.image && (
                          <div className="absolute inset-0 select-none pointer-events-none scale-110 filter blur-xl opacity-40">
                            <img src={template.image} className="w-full h-full object-cover" alt="" />
                          </div>
                        )}

                        {/* Layer 2: Main Image (Fully Fit with object-contain to prevent cutting off text) */}
                        {template.image ? (
                          <img
                            src={template.image}
                            alt={template.title}
                            className="relative w-full h-full object-contain z-10 mx-auto"
                          />
                        ) : (
                          <Icons.ImagePlaceholder />
                        )}

                        {/* Badges Overlaid Directly Inside the Frame */}
                        <div className="absolute top-2.5 left-2.5 flex gap-1 z-20">
                          <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            ⭐ Featured
                          </span>
                          {template.plan === 'pro' && (
                            <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                              PRO
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Condensed Meta & Details Block */}
                      <div className="p-3 bg-white">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1 bg-white">
                          {template.platform && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${platformBadgeStyles[template.platform] || 'bg-slate-800 text-white'}`}>
                              {template.platform}
                            </span>
                          )}
                          {template.category && (
                            <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                              {template.category}
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
                          {template.description || 'Launch your custom campaign with this template.'}
                        </p>

                        {/* Symmetrical Dual Buttons - Matches normal card layout sizing */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handlePreview(template.slug)}
                            className="flex items-center justify-center gap-1 text-[11px] font-black text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 transition active:scale-95"
                          >
                            <Icons.Eye /> Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUseTemplate(template.slug)}
                            className="flex items-center justify-center gap-1 text-[11px] font-black text-white bg-primary hover:opacity-95 rounded-xl py-2 transition shadow-sm active:scale-95"
                          >
                            <Icons.Sparkles /> Use Template
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>

              {/* Slider Dots */}
              {featuredTemplates.length > 1 && (
                <div className="absolute bottom-28 right-3 flex gap-1 z-20">
                  {featuredTemplates.map((_, idx) => (
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
            Showing {filteredRegular.length} templates
          </span>
        </div>

        {/* ── Regular Templates Grid (Optimized Density & Fitted Images) ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200/40 shadow-sm overflow-hidden animate-pulse">
                <div className="w-full aspect-[16/10] bg-slate-200" />
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
        ) : filteredRegular.length === 0 ? (
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
            {filteredRegular.map((template) => {
              const isHighlighted = highlightedId === template.id;
              return (
                <div
                  key={template.id}
                  id={`template-${template.id}`}
                  className={`group bg-white rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.015)] ${
                    isHighlighted
                      ? 'border-primary ring-4 ring-primary/10 scale-[1.01]'
                      : 'border-slate-200/60 hover:border-slate-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]'
                  }`}
                >
                  
                  {/* Fitted Image Frame (No cropped banners) */}
                  <div className="w-full aspect-[16/10] bg-slate-950 relative overflow-hidden">
                    
                    {/* Layer 1: Blurred Backdrop */}
                    {template.image && (
                      <div className="absolute inset-0 select-none pointer-events-none scale-110 filter blur-xl opacity-40">
                        <img src={template.image} className="w-full h-full object-cover" alt="" />
                      </div>
                    )}

                    {/* Layer 2: Main Fitted Image */}
                    {template.image ? (
                      <img
                        src={template.image}
                        alt={template.title}
                        className="relative w-full h-full object-contain z-10 mx-auto"
                        loading="lazy"
                      />
                    ) : (
                      <Icons.ImagePlaceholder />
                    )}
                    
                    {/* Floating Corner Badges */}
                    <div className="absolute top-2 inset-x-2 flex justify-between items-start pointer-events-none z-20">
                      <div className="flex flex-col gap-0.5">
                        {template.isHighlight && (
                          <span className="bg-amber-400 text-amber-950 text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">
                            ⭐ Featured
                          </span>
                        )}
                        {template.plan === 'pro' && (
                          <span className="bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">
                            PRO
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

                  {/* Information & Actions Row (Compact) */}
                  <div className="p-3 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1.5 bg-white">
                        <h3 className="font-bold text-slate-950 text-xs leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                          {template.title}
                        </h3>
                        {template.category && (
                          <span className="text-[8px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded uppercase font-black tracking-wider shrink-0">
                            {template.category}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-1 leading-relaxed">
                        {template.description || 'Customizable layout built to match social trends.'}
                      </p>

                      {/* Info Pills */}
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
                          {template.hashtags && template.hashtags.length > 1 && (
                            <span className="text-[9px] font-bold text-slate-400 self-center">
                              +{template.hashtags.length - 1}
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] font-extrabold text-slate-400 flex items-center">
                          👥 {template.usageCount || 0} Uses
                        </div>
                      </div>

                      {template.reward && (
                        <div className="mt-1 text-[10px] font-extrabold text-amber-600 flex items-center gap-0.5 bg-amber-50 border border-amber-100/60 px-1.5 py-0.5 rounded-lg w-fit">
                          <Icons.Gift /> {template.reward}
                        </div>
                      )}
                    </div>

                    {/* Symmetrical Dual Actions (Exactly matches Featured button sizes!) */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handlePreview(template.slug)}
                        className="flex-1 flex items-center justify-center gap-1 text-[11px] font-black text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-2 transition active:scale-95"
                      >
                        <Icons.Eye /> Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUseTemplate(template.slug)}
                        className="flex-1 flex items-center justify-center gap-1 text-[11px] font-black text-white bg-primary hover:opacity-95 rounded-xl py-2 transition shadow-sm active:scale-95"
                      >
                        <Icons.Sparkles /> Use Template
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

```
