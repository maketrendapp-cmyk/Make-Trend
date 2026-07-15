// pages/create.js
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function Create() {
  const router = useRouter();
  const { slug: highlightSlug } = router.query;

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        const res = await fetch(`${API_BASE}/templates`);
        if (!res.ok) {
          if (res.status === 500) {
            console.warn('Backend error');
            setTemplates([]);
            setLoading(false);
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.success) {
          setTemplates(data.templates || []);
          if (highlightSlug) {
            const found = data.templates.find(t => t.slug === highlightSlug);
            if (found) {
              setHighlightedId(found.id);
              highlightTimeoutRef.current = setTimeout(() => {
                setHighlightedId(null);
              }, 3000);
            }
          }
        } else {
          setError(data.error || 'Failed to fetch templates');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Could not load templates. Please try again later.');
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

  // ── Scroll to highlighted template ──
  useEffect(() => {
    if (highlightedId) {
      const el = document.getElementById(`template-${highlightedId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedId]);

  // ── Auto-slide carousel ──
  const highlightedTemplates = useMemo(() => templates.filter(t => t.isHighlight === true), [templates]);

  useEffect(() => {
    if (highlightedTemplates.length > 1) {
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % highlightedTemplates.length);
      }, 4000);
    }
    return () => {
      if (carouselIntervalRef.current) clearInterval(carouselIntervalRef.current);
    };
  }, [highlightedTemplates.length]);

  const goToSlide = (index) => {
    setCarouselIndex(index);
    // Reset timer to avoid jumping immediately after manual interaction
    if (carouselIntervalRef.current) {
      clearInterval(carouselIntervalRef.current);
      carouselIntervalRef.current = setInterval(() => {
        setCarouselIndex((prev) => (prev + 1) % highlightedTemplates.length);
      }, 4000);
    }
  };

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

  const regularTemplates = useMemo(() => templates.filter(t => !t.isHighlight), [templates]);

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
  }, []);

  const platformColors = {
    tiktok: 'bg-black/80 text-white',
    instagram: 'bg-gradient-to-br from-purple-600 to-pink-500 text-white',
    youtube: 'bg-red-600 text-white',
    facebook: 'bg-blue-700 text-white',
    all: 'bg-gray-600 text-white',
  };

  // ── Error state ──
  if (error) {
    return (
      <>
        <Meta title="Error" />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition">
            Retry
          </button>
        </main>
      </>
    );
  }

  // ── Empty state ──
  if (!loading && templates.length === 0) {
    return (
      <>
        <Meta title="No Templates" />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No templates found</h2>
          <p className="text-gray-500">Check back later or contact the administrator.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Meta title="Choose a Template" description="Select a template to launch your campaign." />
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">✨ Choose a Template</h1>
          <p className="text-gray-500 text-sm mt-0.5">Select a template to customize and launch your campaign</p>
        </div>

        {/* ── Search & Filters ── */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-gray-50 transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {(selectedCategory || selectedPlatform) && (
                <span className="bg-primary text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {(selectedCategory ? 1 : 0) + (selectedPlatform ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-2.5 p-3 bg-gray-50 rounded-xl border border-border">
              <div className="flex-1 min-w-[140px]">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  <option value="">All Categories</option>
                  {categories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[140px]">
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  <option value="">All Platforms</option>
                  {platforms.filter(p => p !== 'All').map(plat => (
                    <option key={plat} value={plat}>{plat.charAt(0).toUpperCase() + plat.slice(1)}</option>
                  ))}
                </select>
              </div>
              {(searchQuery || selectedCategory || selectedPlatform) && (
                <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 transition whitespace-nowrap">
                  Clear all
                </button>
              )}
            </div>
          )}

          <div className="text-xs text-gray-400">
            Showing <span className="font-medium text-gray-600">{filteredRegular.length}</span> of{' '}
            <span className="font-medium text-gray-600">{regularTemplates.length}</span> templates
          </div>
        </div>

        {/* ── Featured Templates Carousel ── */}
        {highlightedTemplates.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <span>⭐ Featured Templates</span>
              <span className="text-xs font-normal text-gray-400">(auto‑play)</span>
            </h2>

            {/* Carousel Container */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 shadow-sm">
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
              >
                {highlightedTemplates.map((template) => (
                  <div key={template.id} className="w-full flex-shrink-0 p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                      {/* Image */}
                      <div className="w-full sm:w-56 h-56 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0 shadow-md">
                        {template.image ? (
                          <img
                            src={template.image}
                            alt={template.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">🎨</div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <h3 className="text-2xl font-bold text-gray-900">{template.title}</h3>
                          {template.plan === 'pro' && (
                            <span className="bg-purple-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">PRO</span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">{template.description || 'No description available.'}</p>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                          {template.reward && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-amber-200">
                              🎁 {template.reward}
                            </span>
                          )}
                          {template.category && (
                            <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-medium">
                              {template.category}
                            </span>
                          )}
                          {template.platform && (
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm ${platformColors[template.platform] || 'bg-gray-600 text-white'}`}>
                              {template.platform.toUpperCase()}
                            </span>
                          )}
                          <span className="bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                            👥 {template.usageCount || 0}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-3 justify-center sm:justify-start">
                          <button
                            onClick={() => handlePreview(template.slug)}
                            className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
                          >
                            👁️ Preview
                          </button>
                          <button
                            onClick={() => handleUseTemplate(template.slug)}
                            className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition shadow-sm"
                          >
                            ✨ Use This Template
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dots */}
              {highlightedTemplates.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                  {highlightedTemplates.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => goToSlide(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        idx === carouselIndex ? 'bg-primary w-6' : 'bg-gray-300 hover:bg-gray-400'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="flex gap-2 mt-3">
                    <div className="h-8 bg-gray-200 rounded w-1/2" />
                    <div className="h-8 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRegular.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-border">
            <div className="text-4xl mb-2">🔍</div>
            <h3 className="text-base font-semibold text-gray-900 mb-0.5">No templates match</h3>
            <p className="text-gray-500 text-sm">Try adjusting your search or filters.</p>
            <button onClick={clearFilters} className="mt-2 px-4 py-1.5 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20 transition">
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRegular.map((template) => {
              const isHighlighted = highlightedId === template.id;
              return (
                <div
                  key={template.id}
                  id={`template-${template.id}`}
                  className={`group bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden ${
                    isHighlighted
                      ? 'border-2 border-primary shadow-xl shadow-primary/20 scale-[1.02] ring-4 ring-primary/30'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  {/* Image */}
                  <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    {template.image ? (
                      <img
                        src={template.image}
                        alt={template.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">🎨</div>
                    )}
                    {template.isHighlight && (
                      <div className="absolute top-2 left-2 bg-yellow-400 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                        ⭐ Featured
                      </div>
                    )}
                    {template.plan && template.plan !== 'free' && (
                      <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                        {template.plan.toUpperCase()}
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg ${platformColors[template.platform] || 'bg-gray-600 text-white'}`}>
                        {template.platform ? template.platform.toUpperCase() : 'ALL'}
                      </span>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span>👥</span> {template.usageCount || 0}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">
                        {template.title}
                      </h3>
                      {template.category && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {template.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {template.description || 'No description provided.'}
                    </p>
                    {template.hashtags && template.hashtags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.hashtags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-[10px] bg-primary/5 text-primary/70 px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                        {template.hashtags.length > 3 && (
                          <span className="text-[10px] text-gray-400">+{template.hashtags.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handlePreview(template.slug)}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 py-1.5 rounded-lg transition"
                      >
                        👁️ Preview
                      </button>
                      <button
                        onClick={() => handleUseTemplate(template.slug)}
                        className="text-xs font-medium text-white bg-primary hover:bg-primary/90 py-1.5 rounded-lg transition"
                      >
                        ✨ Use
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