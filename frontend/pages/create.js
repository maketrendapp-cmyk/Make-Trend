// pages/create.js
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Meta from '../components/Meta';

// Backend URL – use environment variable or fallback
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function Create() {
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ===== FILTER STATE =====
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ===== CATEGORIES & PLATFORMS (extracted from templates) =====
  const categories = useMemo(() => {
    const cats = new Set();
    templates.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return ['All', ...Array.from(cats)];
  }, [templates]);

  const platforms = useMemo(() => {
    const plats = new Set();
    templates.forEach(t => {
      if (t.platform) plats.add(t.platform);
    });
    return ['All', ...Array.from(plats)];
  }, [templates]);

  // ===== FILTERED TEMPLATES =====
  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    // Search filter (title, description, hashtags, category, platform)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(t => {
        const title = (t.title || '').toLowerCase();
        const description = (t.description || '').toLowerCase();
        const hashtags = (t.hashtags || []).join(' ').toLowerCase();
        const category = (t.category || '').toLowerCase();
        const platform = (t.platform || '').toLowerCase();
        return title.includes(query) ||
               description.includes(query) ||
               hashtags.includes(query) ||
               category.includes(query) ||
               platform.includes(query);
      });
    }

    // Category filter
    if (selectedCategory && selectedCategory !== 'All') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Platform filter
    if (selectedPlatform && selectedPlatform !== 'All') {
      filtered = filtered.filter(t => t.platform === selectedPlatform);
    }

    return filtered;
  }, [templates, searchQuery, selectedCategory, selectedPlatform]);

  // ===== FETCH TEMPLATES =====
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/templates`);
        if (!res.ok) {
          if (res.status === 500) {
            const text = await res.text();
            console.warn('Backend responded with 500:', text);
            setTemplates([]);
            setLoading(false);
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.success) {
          setTemplates(data.templates);
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
  }, []);

  // ===== HANDLERS =====
  const handleTemplateSelect = (slug) => {
    router.push(`/createcampaign/${slug}`);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedPlatform('');
  };

  // ===== PLATFORM BADGE COLORS =====
  const platformColors = {
    tiktok: 'bg-black/80 text-white border-pink-500',
    instagram: 'bg-gradient-to-br from-purple-600 to-pink-500 text-white',
    youtube: 'bg-red-600 text-white',
    facebook: 'bg-blue-700 text-white',
    all: 'bg-gray-600 text-white',
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <>
        <Meta title="Choose a Template" description="Select a template to start your campaign." />
        <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading templates...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <>
        <Meta title="Error" description="Could not load templates." />
        <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              Retry
            </button>
          </div>
        </main>
      </>
    );
  }

  // ===== EMPTY STATE (No Templates) =====
  if (templates.length === 0) {
    return (
      <>
        <Meta title="No Templates Available" description="No templates yet." />
        <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No templates found</h2>
            <p className="text-gray-500">Check back later or contact the administrator.</p>
          </div>
        </main>
      </>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <>
      <Meta 
        title="Choose a Template" 
        description="Select a template to start your viral campaign." 
      />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* ===== HEADER ===== */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">✨ Choose a Template</h1>
          <p className="text-gray-500 mt-1">Select a template to customize and launch your campaign.</p>
        </div>

        {/* ===== SEARCH + FILTERS ===== */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates by title, description, hashtags..."
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2.5 border border-border rounded-xl hover:bg-gray-50 transition flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {(selectedCategory || selectedPlatform) && (
                <span className="bg-primary text-white text-xs rounded-full px-2 py-0.5">
                  {(selectedCategory ? 1 : 0) + (selectedPlatform ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-xl border border-border">
              <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  <option value="">All Categories</option>
                  {categories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="text-xs font-medium text-gray-500 block mb-1">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  <option value="">All Platforms</option>
                  {platforms.filter(p => p !== 'All').map(plat => (
                    <option key={plat} value={plat}>{plat.charAt(0).toUpperCase() + plat.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 self-end pb-0.5">
                {(searchQuery || selectedCategory || selectedPlatform) && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-red-500 hover:text-red-700 transition"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="text-sm text-gray-400">
            Showing <span className="font-medium text-gray-600">{filteredTemplates.length}</span> of{' '}
            <span className="font-medium text-gray-600">{templates.length}</span> templates
          </div>
        </div>

        {/* ===== TEMPLATE GRID ===== */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-border">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No templates match</h3>
            <p className="text-gray-500 text-sm">Try adjusting your search or filters.</p>
            <button
              onClick={clearFilters}
              className="mt-3 px-4 py-1.5 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20 transition"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template.slug)}
                className="group bg-white rounded-xl border border-border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
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
                    <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">
                      🎨
                    </div>
                  )}
                  {/* Highlight Badge */}
                  {template.isHighlight && (
                    <div className="absolute top-3 left-3 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      ⭐ Featured
                    </div>
                  )}
                  {/* Platform Badge */}
                  <div className="absolute bottom-3 left-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-lg ${platformColors[template.platform] || platformColors.all}`}>
                      {template.platform ? template.platform.toUpperCase() : 'ALL'}
                    </span>
                  </div>
                  {/* Usage Count */}
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span>👥</span> {template.usageCount || 0}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2 flex-1">
                      {template.title}
                    </h3>
                    {template.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {template.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2 flex-1">
                    {template.description || 'No description provided.'}
                  </p>
                  {/* Hashtags */}
                  {template.hashtags && template.hashtags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.hashtags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-xs bg-primary/5 text-primary/70 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                      {template.hashtags.length > 3 && (
                        <span className="text-xs text-gray-400">+{template.hashtags.length - 3}</span>
                      )}
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-border">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTemplateSelect(template.slug);
                      }}
                      className="w-full text-center text-sm font-medium text-primary hover:text-primary/80 transition"
                    >
                      Use this template →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}