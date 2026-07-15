
// pages/create.js
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

// --- SVG Icons ---
const Icons = {
  Search: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
  ),
  Filter: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
  ),
  Sparkles: () => (
    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
  ),
  Users: () => (
    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
  ),
  Gift: () => (
    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
  ),
  ImagePlaceholder: () => (
    <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
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

  // ── Fetch templates ──
  useEffect(() => {
    const fetchTemplates = async () => {
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
    };
    fetchTemplates();
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    };
  }, [highlightSlug]);

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

  // Updated brand colors for platforms to look more professional
  const platformColors = {
    tiktok: 'bg-[#000000] text-white',
    instagram: 'bg-gradient-to-tr from-[#FFDC80] via-[#F56040] to-[#C13584] text-white',
    youtube: 'bg-[#FF0000] text-white',
    facebook: 'bg-[#1877F2] text-white',
    all: 'bg-slate-700 text-white',
  };

  // ── Error state ──
  if (error) {
    return (
      <>
        <Meta title="Error" />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-6">😕</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Something went wrong</h2>
          <p className="text-gray-500 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 px-8 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all shadow-sm active:scale-95"
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
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-6">📭</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">No templates found</h2>
          <p className="text-gray-500">We couldn't find any templates. Please check back later.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Meta title="Choose a Template" description="Select a template to launch your campaign." />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 pb-24">
        
        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Choose a Template
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-2 max-w-2xl">
            Browse our collection of high-converting templates to launch your next campaign in seconds.
          </p>
        </div>

        {/* ── Search & Filters ── */}
        <div className="mb-10 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-primary transition-colors">
                <Icons.Search />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, platform, or hashtag..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-5 py-3 border rounded-2xl text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-sm ${
                showFilters || selectedCategory || selectedPlatform 
                  ? 'bg-primary/5 border-primary/30 text-primary' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icons.Filter />
              Filters
              {(selectedCategory || selectedPlatform) && (
                <span className="bg-primary text-white text-[11px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center ml-1">
                  {(selectedCategory ? 1 : 0) + (selectedPlatform ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="w-full sm:flex-1 relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              
              <div className="w-full sm:flex-1 relative">
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer"
                >
                  <option value="">All Platforms</option>
                  {platforms.filter(p => p !== 'All').map(plat => (
                    <option key={plat} value={plat}>{plat.charAt(0).toUpperCase() + plat.slice(1)}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              {(searchQuery || selectedCategory || selectedPlatform) && (
                <button 
                  onClick={clearFilters} 
                  className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors whitespace-nowrap"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500 px-1 pt-1">
            <p>Showing <span className="font-semibold text-gray-900">{filteredRegular.length}</span> templates</p>
          </div>
        </div>

        {/* ── Featured Templates Carousel ── */}
        {featuredTemplates.length > 0 && !searchQuery && !selectedCategory && !selectedPlatform && (
          <div className="mb-14">
            <div className="flex items-center gap-2 mb-4 px-1">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              <h2 className="text-lg font-bold text-gray-900">Featured Templates</h2>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-sm group">
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
              >
                {featuredTemplates.map((template) => (
                  <div key={template.id} className="w-full flex-shrink-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Featured Image */}
                      <div className="w-full md:w-3/5 aspect-video md:aspect-auto md:min-h-[320px] bg-gray-100 relative overflow-hidden">
                        {template.image ? (
                          <img
                            src={template.image}
                            alt={template.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Icons.ImagePlaceholder /></div>
                        )}
                        {/* Overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:bg-gradient-to-r md:from-black/10 md:to-transparent"></div>
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className="bg-yellow-400 text-yellow-950 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                            ⭐ Featured
                          </span>
                          {template.plan === 'pro' && (
                            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                              PRO
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Featured Details */}
                      <div className="w-full md:w-2/5 p-6 md:p-8 lg:p-10 flex flex-col justify-center bg-white">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {template.platform && (
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${platformColors[template.platform] || 'bg-slate-700 text-white'}`}>
                              {template.platform}
                            </span>
                          )}
                          {template.category && (
                            <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                              {template.category}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-3">
                          {template.title}
                        </h3>
                        <p className="text-gray-500 text-sm mb-6 line-clamp-3">
                          {template.description || 'No description available for this template. Launch it to see more details.'}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 mb-8">
                          {template.reward && (
                            <span className="flex items-center text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl text-sm font-semibold border border-amber-100">
                              <Icons.Gift /> {template.reward}
                            </span>
                          )}
                          <span className="flex items-center text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl text-sm font-medium border border-slate-100">
                            <Icons.Users /> {template.usageCount || 0} Uses
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                          <button
                            onClick={() => handleUseTemplate(template.slug)}
                            className="flex-1 flex items-center justify-center bg-primary text-white py-3 px-4 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98]"
                          >
                            <Icons.Sparkles /> Use Template
                          </button>
                          <button
                            onClick={() => handlePreview(template.slug)}
                            className="sm:w-auto flex items-center justify-center bg-white border-2 border-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-[0.98]"
                          >
                            <Icons.Eye /> Preview
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Carousel Indicators */}
              {featuredTemplates.length > 1 && (
                <div className="absolute bottom-4 md:bottom-6 left-0 right-0 md:left-auto md:right-8 flex justify-center md:justify-end gap-2 px-4 z-10">
                  {featuredTemplates.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => goToSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === carouselIndex ? 'bg-primary w-8' : 'bg-white/60 md:bg-gray-300 w-2 hover:bg-white md:hover:bg-gray-400'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Regular Templates Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
                <div className="w-full aspect-[4/3] bg-gray-200" />
                <div className="p-5 space-y-4">
                  <div className="flex justify-between">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                    <div className="h-5 bg-gray-200 rounded-full w-16" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-4/5" />
                  </div>
                  <div className="pt-4 grid grid-cols-2 gap-3">
                    <div className="h-10 bg-gray-200 rounded-xl" />
                    <div className="h-10 bg-gray-200 rounded-xl" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRegular.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <div className="text-gray-300 mb-4 flex justify-center">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No matches found</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">We couldn't find any templates matching your current search and filters.</p>
            <button onClick={clearFilters} className="px-6 py-2.5 bg-primary/10 text-primary font-semibold rounded-xl text-sm hover:bg-primary/20 transition-colors">
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRegular.map((template) => {
              const isHighlighted = highlightedId === template.id;
              return (
                <div
                  key={template.id}
                  id={`template-${template.id}`}
                  className={`group flex flex-col bg-white rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${
                    isHighlighted
                      ? 'border-primary shadow-primary/10 scale-[1.02] ring-4 ring-primary/20'
                      : 'border-gray-100 hover:border-gray-200 hover:-translate-y-1'
                  }`}
                >
                  {/* Card Image */}
                  <div className="w-full aspect-[4/3] bg-gray-50 relative overflow-hidden">
                    {template.image ? (
                      <img
                        src={template.image}
                        alt={template.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Icons.ImagePlaceholder /></div>
                    )}
                    
                    {/* Floating Badges */}
                    <div className="absolute top-3 inset-x-3 flex justify-between items-start">
                      <div className="flex flex-col gap-2">
                        {template.plan === 'pro' && (
                          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm self-start">
                            PRO
                          </span>
                        )}
                        {template.category && (
                          <span className="bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm self-start">
                            {template.category}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wider ${platformColors[template.platform] || 'bg-slate-700 text-white'}`}>
                        {template.platform ? template.platform : 'ALL'}
                      </span>
                    </div>

                    {/* Gradient Overlay for bottom text */}
                    <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="mb-2">
                      <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                        {template.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 min-h-[40px]">
                        {template.description || 'No description provided.'}
                      </p>
                    </div>
                    
                    {/* Meta stats */}
                    <div className="flex items-center justify-between mt-3 mb-4">
                      {template.reward ? (
                         <div className="text-xs font-semibold text-amber-600 flex items-center bg-amber-50 px-2 py-1 rounded-lg">
                           <Icons.Gift /> {template.reward}
                         </div>
                      ) : (
                         <div className="text-xs font-medium text-gray-400">Standard</div>
                      )}
                      
                      <div className="text-xs font-medium text-slate-500 flex items-center bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
                        <Icons.Users /> {template.usageCount || 0}
                      </div>
                    </div>

                    {/* Hashtags */}
                    {template.hashtags && template.hashtags.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-1.5 mt-auto">
                        {template.hashtags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                            {tag}
                          </span>
                        ))}
                        {template.hashtags.length > 3 && (
                          <span className="text-[10px] font-medium text-gray-400 self-center ml-1">
                            +{template.hashtags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-auto pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handlePreview(template.slug)}
                        className="flex items-center justify-center text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 py-2.5 rounded-xl transition-colors"
                      >
                        <Icons.Eye /> Preview
                      </button>
                      <button
                        onClick={() => handleUseTemplate(template.slug)}
                        className="flex items-center justify-center text-sm font-semibold text-white bg-primary hover:bg-primary/90 py-2.5 rounded-xl transition-all shadow-sm active:scale-95"
                      >
                        <Icons.Sparkles /> Use
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