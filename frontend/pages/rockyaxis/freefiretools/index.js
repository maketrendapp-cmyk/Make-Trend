// pages/freefiretools/index.js
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Meta from '../../components/Meta';
import {
  FiSearch,
  FiFilter,
  FiDownload,
  FiStar,
  FiTrendingUp,
  FiClock,
  FiArrowLeft,
  FiChevronDown,
  FiGrid,
  FiList,
  FiX,
  FiZap,
  FiCpu,
  FiSettings,
  FiFile,
  FiTarget,
  FiHeadphones,
  FiBox,
  FiSmartphone,
  FiGlobe,
} from 'react-icons/fi';
import { FaFire, FaAndroid, FaWindows } from 'react-icons/fa';
import toast from 'react-hot-toast';

// ── Mock Data ──
const toolsData = [
  {
    id: 1,
    name: 'Regedit Pro Pack',
    category: 'Regedit',
    icon: '⚙️',
    description: 'Ultimate Windows registry tweaks for max FPS and minimal lag.',
    downloads: '12.4K',
    rating: 4.8,
    downloadsLink: '#',
    featured: true,
    platform: 'Windows',
  },
  {
    id: 2,
    name: 'Headshot Master Config',
    category: 'Headshot Configs',
    icon: '🎯',
    description: 'One‑tap headshot settings that work on all devices and servers.',
    downloads: '9.8K',
    rating: 4.7,
    downloadsLink: '#',
    featured: true,
    platform: 'All',
  },
  {
    id: 3,
    name: 'Sensi Pro APK v3.2',
    category: 'Sensi APKs',
    icon: '📱',
    description: 'Advanced sensitivity APK for Android – improved aim and control.',
    downloads: '15.2K',
    rating: 4.9,
    downloadsLink: '#',
    featured: true,
    platform: 'Android',
  },
  {
    id: 4,
    name: 'GFX Tool Pro',
    category: 'GFX Tools',
    icon: '🚀',
    description: 'Graphics optimizer for low‑end devices – unlock 60 FPS easily.',
    downloads: '18.6K',
    rating: 4.8,
    downloadsLink: '#',
    featured: false,
    platform: 'Android',
  },
  {
    id: 5,
    name: 'Headshot Config v4.0',
    category: 'Headshot Configs',
    icon: '🔫',
    description: 'Latest headshot config with auto‑aim assistance for all servers.',
    downloads: '7.2K',
    rating: 4.6,
    downloadsLink: '#',
    featured: false,
    platform: 'All',
  },
  {
    id: 6,
    name: 'Audio Booster Pack',
    category: 'Audio',
    icon: '🎧',
    description: 'Custom sound files for better footstep and gunshot detection.',
    downloads: '5.4K',
    rating: 4.5,
    downloadsLink: '#',
    featured: false,
    platform: 'All',
  },
  {
    id: 7,
    name: 'All‑in‑One Pro Bundle',
    category: 'Packs',
    icon: '📦',
    description: 'Complete bundle with Regedit, configs, APK, and audio tweaks.',
    downloads: '3.8K',
    rating: 4.9,
    downloadsLink: '#',
    featured: false,
    platform: 'All',
  },
  {
    id: 8,
    name: 'FPS Booster Regedit',
    category: 'Regedit',
    icon: '⚡',
    description: 'Simple registry file to boost FPS in Free Fire by 20‑30%.',
    downloads: '8.1K',
    rating: 4.4,
    downloadsLink: '#',
    featured: false,
    platform: 'Windows',
  },
  {
    id: 9,
    name: 'Sensi Lite APK',
    category: 'Sensi APKs',
    icon: '📲',
    description: 'Lightweight APK for older Android devices – smooth gameplay.',
    downloads: '6.5K',
    rating: 4.3,
    downloadsLink: '#',
    featured: false,
    platform: 'Android',
  },
  {
    id: 10,
    name: 'Regedit + Config Combo',
    category: 'Packs',
    icon: '🧩',
    description: 'Combined Regedit and headshot config for ultimate performance.',
    downloads: '4.2K',
    rating: 4.7,
    downloadsLink: '#',
    featured: false,
    platform: 'Windows',
  },
  {
    id: 11,
    name: 'GFX Tool Lite',
    category: 'GFX Tools',
    icon: '🖥️',
    description: 'Lightweight graphics tool for low‑end PCs and emulators.',
    downloads: '2.9K',
    rating: 4.2,
    downloadsLink: '#',
    featured: false,
    platform: 'PC',
  },
  {
    id: 12,
    name: 'Headshot Config (Beta)',
    category: 'Headshot Configs',
    icon: '🎯',
    description: 'Experimental headshot config for new server updates.',
    downloads: '1.8K',
    rating: 4.1,
    downloadsLink: '#',
    featured: false,
    platform: 'All',
  },
];

const CATEGORIES = ['All', 'Regedit', 'Headshot Configs', 'Sensi APKs', 'GFX Tools', 'Audio', 'Packs'];
const PLATFORMS = ['All', 'Android', 'iOS', 'Windows', 'PC'];

export default function FreeFireTools() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showFilters, setShowFilters] = useState(false);

  // ── Filter & Sort Logic ──
  const filteredTools = useMemo(() => {
    let result = toolsData;

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (tool) =>
          tool.name.toLowerCase().includes(term) ||
          tool.description.toLowerCase().includes(term) ||
          tool.category.toLowerCase().includes(term)
      );
    }

    // Category
    if (selectedCategory !== 'All') {
      result = result.filter((tool) => tool.category === selectedCategory);
    }

    // Platform
    if (selectedPlatform !== 'All') {
      result = result.filter((tool) => tool.platform === selectedPlatform || tool.platform === 'All');
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => b.downloads.replace('K', '') - a.downloads.replace('K', ''));
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        // In a real app, would sort by date; we'll just use id descending
        result.sort((a, b) => b.id - a.id);
        break;
      case 'featured':
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
      default:
        break;
    }

    return result;
  }, [searchTerm, selectedCategory, selectedPlatform, sortBy]);

  // ── Handlers ──
  const handleDownload = (toolName) => {
    toast.success(`Downloading ${toolName}... (simulated)`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedPlatform('All');
    setSortBy('popular');
  };

  const hasActiveFilters = searchTerm || selectedCategory !== 'All' || selectedPlatform !== 'All' || sortBy !== 'popular';

  return (
    <>
      <Meta
        title="Free Fire Tools – Regedit, Headshot Configs, Sensi APKs & More"
        description="Download the best Free Fire tools: Regedit files, headshot configs, sensi APKs, GFX tools, audio packs, and all‑in‑one bundles. 100% free!"
      />
      <div className="min-h-screen bg-slate-900 text-white">
        {/* ── Header ── */}
        <div className="bg-slate-800/80 border-b border-slate-700 sticky top-0 z-20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/rockyaxis')}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition"
                >
                  <FiArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <FaFire className="text-orange-400" />
                    Free Fire Tools
                  </h1>
                  <p className="text-xs text-slate-400">Discover the best tools, configs & APKs</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search tools..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2.5 rounded-xl border transition ${
                    showFilters || hasActiveFilters
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                      : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  <FiFilter className="w-5 h-5" />
                </button>
                <div className="hidden sm:flex bg-slate-700 rounded-xl p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition ${
                      viewMode === 'grid' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FiGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition ${
                      viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FiList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Filters (expandable) ── */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Category:</span>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          selectedCategory === cat
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Platform:</span>
                    {PLATFORMS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedPlatform(p)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                          selectedPlatform === p
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                    >
                      <option value="popular">Popular</option>
                      <option value="rating">Top Rated</option>
                      <option value="newest">Newest</option>
                      <option value="featured">Featured</option>
                    </select>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <FiX className="w-3 h-3" /> Clear all
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Results Count ── */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-sm text-slate-400">
            Showing <span className="text-white font-medium">{filteredTools.length}</span> tools
            {hasActiveFilters && (
              <span className="text-xs ml-2 text-slate-500">
                (filters active)
              </span>
            )}
          </p>
        </div>

        {/* ── Tool Feed ── */}
        <div className="max-w-7xl mx-auto px-4 pb-12">
          {filteredTools.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-white">No tools found</h3>
              <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
              <button
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition"
              >
                Clear Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onDownload={handleDownload} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTools.map((tool) => (
                <ToolListItem key={tool.id} tool={tool} onDownload={handleDownload} />
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <footer className="border-t border-slate-700/50 py-6 px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <FaFire className="w-3 h-3 text-orange-400" />
              <span>Rocky Axis • Free Fire Tools</span>
            </div>
            <div className="flex items-center gap-6">
              <button onClick={() => router.push('/rockyaxis')} className="hover:text-white transition">
                Back to Rocky Axis
              </button>
              <button onClick={() => router.push('/')} className="hover:text-white transition">
                Home
              </button>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

// ── Grid Card Component ──
function ToolCard({ tool, onDownload }) {
  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-5 hover:border-purple-500/50 transition hover:bg-slate-800 flex flex-col h-full group">
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl">{tool.icon}</div>
        {tool.featured && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full border border-yellow-500/30">
            <FiStar className="w-3 h-3" /> Featured
          </span>
        )}
      </div>
      <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition line-clamp-1">
        {tool.name}
      </h3>
      <p className="text-xs text-slate-400 mt-1 line-clamp-2 flex-1">{tool.description}</p>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <FiDownload className="w-3 h-3" /> {tool.downloads}
        </span>
        <span className="flex items-center gap-1">
          <FiStar className="w-3 h-3 text-yellow-400" /> {tool.rating}
        </span>
        <span className="ml-auto px-2 py-0.5 bg-slate-700 rounded-full text-[10px] text-slate-400">
          {tool.platform}
        </span>
      </div>
      <button
        onClick={() => onDownload(tool.name)}
        className="mt-3 w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
      >
        <FiDownload className="w-4 h-4" /> Download
      </button>
    </div>
  );
}

// ── List Item Component ──
function ToolListItem({ tool, onDownload }) {
  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-4 hover:border-purple-500/50 transition hover:bg-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-4 group">
      <div className="text-3xl">{tool.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base font-bold text-white group-hover:text-purple-400 transition">
            {tool.name}
          </h3>
          {tool.featured && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full border border-yellow-500/30">
              <FiStar className="w-3 h-3" /> Featured
            </span>
          )}
          <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">
            {tool.category}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{tool.description}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <FiDownload className="w-3 h-3" /> {tool.downloads}
          </span>
          <span className="flex items-center gap-1">
            <FiStar className="w-3 h-3 text-yellow-400" /> {tool.rating}
          </span>
          <span>{tool.platform}</span>
        </div>
      </div>
      <button
        onClick={() => onDownload(tool.name)}
        className="w-full sm:w-auto px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
      >
        <FiDownload className="w-4 h-4" /> Download
      </button>
    </div>
  );
}