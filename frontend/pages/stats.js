// pages/stats.js
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { useStats, useCampaigns, useInvalidateQueries } from '../lib/queries';
import AuthScreen from '../components/AuthScreen';
import Meta from '../components/Meta';
import { auth } from '../services/firebase';
import {
  FiBarChart2, FiEye, FiUnlock, FiShare2, FiCheckCircle,
  FiAward, FiPlusCircle, FiEdit2, FiTrash2, FiClock,
  FiLink, FiLogIn, FiArrowRight, FiSearch, FiFilter,
  FiX, FiChevronDown, FiCalendar, FiTrendingUp, FiUsers,
  FiGrid, FiList, FiCopy, FiCheck
} from 'react-icons/fi';
import { FaRocket, FaChartLine } from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

export default function Stats() {
  const router = useRouter();
  const { user, isAuthenticated, needsCompletion, loading, refreshUser } = useAuth();
  const { invalidateCampaigns, invalidateStats } = useInvalidateQueries();

  // ── React Query ──
  const { data: stats, isLoading: statsLoading } = useStats(isAuthenticated);
  const {
    data: campaignPages,
    isLoading: campaignsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useCampaigns(isAuthenticated);

  // Deduplicate campaigns to prevent React key bugs
  const allCampaigns = useMemo(() => {
    const rawCampaigns = campaignPages?.pages?.flatMap(page => page.campaigns) || [];
    const uniqueMap = new Map();
    rawCampaigns.forEach(c => {
      if (c && c.id) uniqueMap.set(c.id, c);
    });
    return Array.from(uniqueMap.values());
  }, [campaignPages]);

  // ── Filter / Search / Sort State ──
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [featureFilter, setFeatureFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Count active filters (excluding sort)
  const activeFilterCount = [statusFilter, featureFilter].filter(f => f !== 'all').length + (searchTerm.trim() ? 1 : 0);

  // ── Filtered & Sorted Campaigns (FIXED BUG-FREE LOGIC) ──
  const filteredCampaigns = useMemo(() => {
    let result = [...allCampaigns];

    // Search
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(c =>
        (c.title?.toLowerCase().includes(term)) ||
        (c.description?.toLowerCase().includes(term)) ||
        (c.reward?.toLowerCase().includes(term))
      );
    }

    // Status filter (Fallback to 'active' if status is missing)
    if (statusFilter !== 'all') {
      result = result.filter(c => {
        const status = (c.status || 'active').toLowerCase();
        return status === statusFilter.toLowerCase();
      });
    }

    // Feature filter
    if (featureFilter !== 'all') {
      result = result.filter(c => {
        const features = c.features || {};
        if (featureFilter === 'share') return !!features.shareCount;
        if (featureFilter === 'tasks') return !!features.tasks;
        if (featureFilter === 'finalUrl') return !!features.finalUrl;
        return true;
      });
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        break;
      case 'oldest':
        result.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return aTime - bTime;
        });
        break;
      case 'views':
        result.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'unlocks':
        result.sort((a, b) => (b.unlockCount || 0) - (a.unlockCount || 0));
        break;
      case 'shares':
        result.sort((a, b) => (b.shares || 0) - (a.shares || 0));
        break;
      case 'completions':
        result.sort((a, b) => (b.completions || 0) - (a.completions || 0));
        break;
      default:
        break;
    }

    return result;
  }, [allCampaigns, searchTerm, statusFilter, featureFilter, sortBy]);

  // ── Clear All Filters ──
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setFeatureFilter('all');
    setSortBy('newest');
  };

  // ── Edit Modal State ──
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    reward: '',
    shareCount: 0,
    tasks: [],
    finalUrl: '',
    features: { shareCount: false, tasks: false, finalUrl: false },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedCampaignId, setCopiedCampaignId] = useState(null);

  // ── Infinite Scroll Loader ──
  const loaderRef = useRef(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || campaignsLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, campaignsLoading, fetchNextPage]);

  // ── Date Formatter ──
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      let date;
      if (typeof timestamp.toDate === 'function') date = timestamp.toDate();
      else if (timestamp.seconds !== undefined) date = new Date(timestamp.seconds * 1000);
      else if (timestamp._seconds !== undefined) date = new Date(timestamp._seconds * 1000);
      else if (typeof timestamp === 'string' || typeof timestamp === 'number') date = new Date(timestamp);
      else if (timestamp instanceof Date) date = timestamp;
      else date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return 'N/A'; }
  };

  // ── Handlers ──
  const handleCreateCampaign = () => router.push('/create');

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setEditForm({
      title: campaign.title || '',
      description: campaign.description || '',
      reward: campaign.reward || 'Exclusive Reward',
      shareCount: campaign.shareCount || 0,
      tasks: campaign.tasks || [],
      finalUrl: campaign.finalUrl || '',
      features: campaign.features || { shareCount: false, tasks: false, finalUrl: false },
    });
    setShowEditModal(true);
    setMessage('');
    document.body.style.overflow = 'hidden';
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Delete this campaign? This action cannot be undone.')) return;
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) { alert('You must be logged in'); return; }
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✅ Campaign deleted successfully!');
        setTimeout(() => setMessage(''), 3000);
        await invalidateCampaigns();
        await invalidateStats();
      } else {
        alert(data.error || 'Failed to delete campaign');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Network error. Please try again.');
    }
  };

  // ── Edit Modal Functions ──
  const addTaskInEdit = () => {
    if (editForm.tasks.length >= 100) {
      setMessage('Maximum 100 tasks allowed');
      return;
    }
    setEditForm(prev => ({
      ...prev,
      tasks: [...prev.tasks, { text: '', url: '' }],
    }));
  };

  const removeTaskInEdit = (index) => {
    if (editForm.tasks.length <= 1) {
      setMessage('At least one task is required if tasks are enabled');
      return;
    }
    setEditForm(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  };

  const updateTaskInEdit = (index, field, value) => {
    const updated = [...editForm.tasks];
    updated[index][field] = value;
    setEditForm(prev => ({ ...prev, tasks: updated }));
  };

  const isValidUrl = (url) => {
    try { new URL(url); return true; } catch { return false; }
  };

  const validateEditForm = () => {
    const { title, description, reward, shareCount, tasks, finalUrl, features } = editForm;
    if (!title || title.trim().length < 1) {
      setMessage('Please enter a campaign title');
      return false;
    }
    if (title.length > 100) {
      setMessage('Campaign title must be less than 100 characters');
      return false;
    }
    if (description && description.length > 500) {
      setMessage('Description must be less than 500 characters');
      return false;
    }
    if (!features.shareCount && !features.tasks && !features.finalUrl) {
      setMessage('Please enable at least one feature: Share Count, Tasks, or Final URL');
      return false;
    }
    if (features.shareCount) {
      const num = Number(shareCount);
      if (!Number.isInteger(num) || num < 1 || num > 9999) {
        setMessage('Share count must be a whole number between 1 and 9999');
        return false;
      }
    }
    if (features.tasks) {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        if (!task.text || task.text.length < 1 || task.text.length > 250) {
          setMessage(`Task ${i + 1}: Text must be between 1-250 characters`);
          return false;
        }
        if (!task.url || !isValidUrl(task.url)) {
          setMessage(`Task ${i + 1}: Please enter a valid URL`);
          return false;
        }
      }
    }
    if (features.finalUrl && finalUrl && !isValidUrl(finalUrl)) {
      setMessage('Please enter a valid final redirect URL');
      return false;
    }
    return true;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;
    setIsSubmitting(true);
    setMessage('');

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) { setMessage('❌ You must be logged in'); setIsSubmitting(false); return; }
      const token = await firebaseUser.getIdToken();
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        reward: editForm.reward.trim(),
        shareCount: editForm.features.shareCount ? editForm.shareCount : 0,
        tasks: editForm.features.tasks ? editForm.tasks : [],
        finalUrl: editForm.features.finalUrl ? editForm.finalUrl : '',
        features: editForm.features,
      };
      const res = await fetch(`${API_BASE}/campaigns/${editingCampaign.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✅ Campaign updated successfully!');
        await invalidateCampaigns();
        await invalidateStats();
        setTimeout(() => {
          setShowEditModal(false);
          document.body.style.overflow = 'unset';
          setMessage('');
        }, 1500);
      } else {
        setMessage(data.error || 'Failed to update campaign');
      }
    } catch (err) {
      console.error('Update error:', err);
      setMessage('Network error. Please try again.');
    }
    setIsSubmitting(false);
  };

  const closeModal = () => {
    setShowEditModal(false);
    document.body.style.overflow = 'unset';
    setMessage('');
  };

  // ── Copy URL ──
  const copyCampaignUrl = (campaign) => {
    const url = `${window.location.origin}/${campaign.templateSlug || 'campaign'}/${campaign.id}`;
    navigator.clipboard.writeText(url);
    setCopiedCampaignId(campaign.id);
    setTimeout(() => setCopiedCampaignId(null), 2000);
  };

  // ============================================================
  // RENDER: UNAUTHENTICATED / NEEDS COMPLETION / LOADING
  // ============================================================
  if (!isAuthenticated && !loading) {
    return (
      <>
        <Meta title="Dashboard" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <FiBarChart2 className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Track Your Stats</h2>
            <p className="text-gray-500 text-sm mb-6">Sign in to manage your campaigns and see analytics.</p>
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition"
            >
              <FiLogIn /> Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  if (needsCompletion) {
    return <AuthScreen onSuccess={refreshUser} />;
  }

  if (loading || statsLoading || campaignsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="h-8 w-8 bg-gray-200 rounded-full mb-3" />
              <div className="h-7 w-12 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm h-24" />
          ))}
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER (Original Layout & Structure)
  // ============================================================
  return (
    <>
      <Meta title="Dashboard | Make Trend" />
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-3xl p-6 shadow-sm border border-purple-100/50">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 flex items-center gap-3">
              <FiBarChart2 className="text-purple-600" />
              Dashboard
            </h1>
            <p className="text-gray-500 text-sm">Manage and track your campaigns</p>
          </div>
          <button
            onClick={handleCreateCampaign}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition text-sm whitespace-nowrap"
          >
            <FiPlusCircle className="w-5 h-5" />
            New Campaign
          </button>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Campaigns', value: stats?.totalCampaigns ?? 0, icon: FiBarChart2, color: 'blue' },
            { label: 'Total Unlocks', value: stats?.totalUnlocks ?? 0, icon: FiUnlock, color: 'purple' },
            { label: 'Total Views', value: stats?.totalViews ?? 0, icon: FiEye, color: 'green' },
            { label: 'Total Shares', value: stats?.totalShares ?? 0, icon: FiShare2, color: 'orange' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-3xl font-extrabold text-gray-900">{stat.value}</p>
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Success Stats ── */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100/60 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-green-100 text-green-700">
                <FiCheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{stats?.successfulCampaigns ?? 0}</p>
                <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Completed</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-100/60 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700">
                <FiAward className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-700">{stats?.totalCompletions ?? 0}</p>
                <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Completions</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filter & Search Bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, description, or reward..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                isFilterOpen ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <FiFilter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-purple-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <FiChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition"
              >
                <FiX className="w-4 h-4" /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* ── Filter Panel ── */}
        {isFilterOpen && (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slideDown">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Feature</label>
              <select
                value={featureFilter}
                onChange={(e) => setFeatureFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="all">All</option>
                <option value="share">Share Count</option>
                <option value="tasks">Tasks</option>
                <option value="finalUrl">Final URL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="views">Most Views</option>
                <option value="unlocks">Most Unlocks</option>
                <option value="shares">Most Shares</option>
                <option value="completions">Most Completions</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Campaign List ── */}
        <div className="space-y-4">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No campaigns found</h3>
              <p className="text-gray-500 text-sm mb-6">
                {searchTerm || statusFilter !== 'all' || featureFilter !== 'all'
                  ? 'Try adjusting your filters or search term.'
                  : 'Start your first campaign and watch your metrics grow.'}
              </p>
              <button
                onClick={handleCreateCampaign}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition"
              >
                <FiPlusCircle /> Create Campaign
              </button>
            </div>
          ) : (
            <>
              {filteredCampaigns.map((camp, index) => {
                const cStatus = (camp.status || 'active').toLowerCase();
                const isSuccessful = camp.shareCount > 0 && camp.shares >= camp.shareCount;
                return (
                  <div
                    key={camp.id}
                    className="bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-xl transition-all duration-300 p-5 relative overflow-hidden animate-fadeInUp"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* Status Bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isSuccessful ? 'bg-gradient-to-b from-green-400 to-emerald-500' : cStatus === 'active' ? 'bg-gradient-to-b from-blue-400 to-indigo-500' : 'bg-gray-300'}`} />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                            {camp.title || 'Untitled'}
                          </p>
                          <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${cStatus === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {cStatus}
                          </span>
                          {isSuccessful && (
                            <span className="text-[10px] font-medium bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full">
                              ✅ Success
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><FiUnlock className="w-3 h-3" /> <span className="font-medium text-gray-700">{camp.unlockCount || 0}</span> unlocks</span>
                          <span className="flex items-center gap-1"><FiEye className="w-3 h-3" /> <span className="font-medium text-gray-700">{camp.views || 0}</span> views</span>
                          <span className="flex items-center gap-1"><FiShare2 className="w-3 h-3" /> <span className="font-medium text-gray-700">{camp.shares || 0}</span> shares</span>
                          <span className="flex items-center gap-1"><FiCheckCircle className="w-3 h-3" /> <span className="font-medium text-gray-700">{camp.completions || 0}</span> completions</span>
                          <span className="flex items-center gap-1 text-gray-400"><FiClock className="w-3 h-3" /> {formatDate(camp.createdAt)}</span>
                        </div>

                        {/* Feature badges */}
                        {camp.features && Object.values(camp.features).some(Boolean) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {camp.features.shareCount && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Shares</span>}
                            {camp.features.tasks && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">Tasks</span>}
                            {camp.features.finalUrl && <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">Redirect</span>}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => copyCampaignUrl(camp)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition text-xs sm:text-sm"
                        >
                          {copiedCampaignId === camp.id ? <FiCheck className="w-3.5 h-3.5" /> : <FiCopy className="w-3.5 h-3.5" />}
                          {copiedCampaignId === camp.id ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          onClick={() => handleEditCampaign(camp)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-xs sm:text-sm"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition text-xs sm:text-sm"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Infinite Scroll Loader */}
              {hasNextPage && (
                <div ref={loaderRef} className="py-6 text-center">
                  {isFetchingNextPage ? (
                    <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                      <svg className="animate-spin h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading more...
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Scroll to load more</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── EDIT MODAL ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-xl font-bold text-gray-900">Edit Campaign</h2>
              <button onClick={closeModal} className="p-2 rounded-full hover:bg-gray-100 transition">
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              {message && (
                <div className={`p-4 rounded-xl text-sm ${message.includes('✅') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {message}
                </div>
              )}

              {/* Campaign Details */}
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📝 Campaign Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="Campaign title"
                      maxLength="100"
                    />
                    <p className="text-xs text-gray-400 mt-1">{editForm.title.length}/100</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      rows="2"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition resize-y"
                      placeholder="Describe your campaign..."
                      maxLength="500"
                    />
                    <p className="text-xs text-gray-400 mt-1">{editForm.description.length}/500</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">🎁 Reward</label>
                    <input
                      type="text"
                      value={editForm.reward}
                      onChange={(e) => setEditForm(prev => ({ ...prev, reward: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                      placeholder="e.g., Exclusive Gift Card"
                    />
                  </div>
                </div>
              </div>

              {/* Share Count */}
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">📢 Share Count</h3>
                    <p className="text-xs text-gray-500">Require users to share your campaign</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.features.shareCount}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        features: { ...prev.features, shareCount: e.target.checked }
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-purple-200 rounded-full peer peer-checked:bg-purple-600 transition"></div>
                    <span className="absolute left-1 top-1 w-3.5 h-3.5 bg-white rounded-full transition peer-checked:translate-x-4"></span>
                  </label>
                </div>
                {editForm.features.shareCount && (
                  <div className="mt-3 animate-slideDown">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Shares Required</label>
                    <input
                      type="number"
                      value={editForm.shareCount}
                      onChange={(e) => setEditForm(prev => ({ ...prev, shareCount: Number(e.target.value) }))}
                      min="1"
                      max="9999"
                      className="w-full max-w-xs border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                    />
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">📋 Tasks</h3>
                    <p className="text-xs text-gray-500">Add tasks users must complete</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.features.tasks}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        features: { ...prev.features, tasks: e.target.checked }
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-purple-200 rounded-full peer peer-checked:bg-purple-600 transition"></div>
                    <span className="absolute left-1 top-1 w-3.5 h-3.5 bg-white rounded-full transition peer-checked:translate-x-4"></span>
                  </label>
                </div>
                {editForm.features.tasks && (
                  <div className="mt-3 space-y-3 animate-slideDown">
                    {editForm.tasks.map((task, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-gray-200">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Task {index+1} Text</label>
                          <input
                            value={task.text}
                            onChange={(e) => updateTaskInEdit(index, 'text', e.target.value)}
                            placeholder="e.g., Follow @username"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                            maxLength="250"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Task URL</label>
                          <input
                            value={task.url}
                            onChange={(e) => updateTaskInEdit(index, 'url', e.target.value)}
                            placeholder="https://..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                          />
                        </div>
                        <div className="flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() => removeTaskInEdit(index)}
                            className="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {editForm.tasks.length < 100 && (
                      <button
                        type="button"
                        onClick={addTaskInEdit}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:text-purple-600 hover:border-purple-400 transition"
                      >
                        + Add Task
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Final URL */}
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">🔗 Final Redirect URL</h3>
                    <p className="text-xs text-gray-500">Redirect users after completion</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.features.finalUrl}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        features: { ...prev.features, finalUrl: e.target.checked }
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-purple-200 rounded-full peer peer-checked:bg-purple-600 transition"></div>
                    <span className="absolute left-1 top-1 w-3.5 h-3.5 bg-white rounded-full transition peer-checked:translate-x-4"></span>
                  </label>
                </div>
                {editForm.features.finalUrl && (
                  <div className="mt-3 animate-slideDown">
                    <input
                      type="url"
                      value={editForm.finalUrl}
                      onChange={(e) => setEditForm(prev => ({ ...prev, finalUrl: e.target.value }))}
                      placeholder="https://your-site.com/thank-you"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                    />
                  </div>
                )}
              </div>

              {/* Read-only Stats */}
              <div className="bg-gray-100/50 p-5 rounded-2xl border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">📊 Campaign Stats (Auto-tracked)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-xs text-gray-400">Views</p>
                    <p className="text-lg font-bold text-gray-800">{editingCampaign?.views || 0}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-xs text-gray-400">Unlocks</p>
                    <p className="text-lg font-bold text-gray-800">{editingCampaign?.unlockCount || 0}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-xs text-gray-400">Shares</p>
                    <p className="text-lg font-bold text-gray-800">{editingCampaign?.shares || 0}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-xs text-gray-400">Completions</p>
                    <p className="text-lg font-bold text-gray-800">{editingCampaign?.completions || 0}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">
                  These are automatically tracked from user interactions and cannot be edited.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:shadow-lg transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeInUp { animation: fadeInUp 0.4s ease-out forwards; }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
      `}</style>
    </>
  );
}
