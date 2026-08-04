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
import { motion, AnimatePresence } from 'framer-motion';

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

  // Safely flatten and DEDUPLICATE campaigns to prevent React "stuck key" bugs
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

  // ── Filtered & Sorted Campaigns (BUG-FREE LOGIC) ──
  const filteredCampaigns = useMemo(() => {
    let result = [...allCampaigns];

    // 1. Search (Safely handle missing fields)
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(c => {
        const titleMatch = (c.title || '').toLowerCase().includes(term);
        const descMatch = (c.description || '').toLowerCase().includes(term);
        const rewardMatch = (c.reward || '').toLowerCase().includes(term);
        return titleMatch || descMatch || rewardMatch;
      });
    }

    // 2. Status filter (Safely handle missing status defaulting to 'active')
    if (statusFilter !== 'all') {
      result = result.filter(c => {
        const cStatus = (c.status || 'active').toLowerCase();
        return cStatus === statusFilter.toLowerCase();
      });
    }

    // 3. Feature filter
    if (featureFilter !== 'all') {
      result = result.filter(c => {
        const features = c.features || {};
        if (featureFilter === 'share') return !!features.shareCount;
        if (featureFilter === 'tasks') return !!features.tasks;
        if (featureFilter === 'finalUrl') return !!features.finalUrl;
        return true;
      });
    }

    // 4. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest': {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        }
        case 'oldest': {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tA - tB;
        }
        case 'views': return (b.views || 0) - (a.views || 0);
        case 'unlocks': return (b.unlockCount || 0) - (a.unlockCount || 0);
        case 'shares': return (b.shares || 0) - (a.shares || 0);
        case 'completions': return (b.completions || 0) - (a.completions || 0);
        default: return 0;
      }
    });

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
        <Meta title="Dashboard | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50 via-gray-50 to-white">
          <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
              <FiBarChart2 className="w-12 h-12 text-white -rotate-3" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Track Your Stats</h2>
            <p className="text-gray-500 text-sm mb-6 font-medium">Sign in to manage your campaigns and see analytics.</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <FiLogIn className="w-5 h-5" /> Sign In to Dashboard
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
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-pulse bg-gray-50 min-h-screen">
        <div className="h-10 w-64 bg-gray-200 rounded-xl mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="h-10 w-10 bg-gray-200 rounded-full mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm h-32" />
          ))}
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <>
      <Meta title="Dashboard | Make Trend" />
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50 via-gray-50 to-white pb-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          
          {/* ── Premium Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8 bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="p-2.5 bg-purple-100 text-purple-600 rounded-2xl">
                  <FiBarChart2 className="w-7 h-7" />
                </div>
                Performance
              </h1>
              <p className="text-gray-500 text-sm font-medium mt-2">Track, manage, and scale your active campaigns</p>
            </div>
            <button
              onClick={handleCreateCampaign}
              className="relative z-10 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all active:scale-[0.98] sm:w-auto w-full"
            >
              <FiPlusCircle className="w-5 h-5" />
              New Campaign
            </button>
          </div>

          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-8">
            {[
              { label: 'Total Campaigns', value: stats?.totalCampaigns ?? 0, icon: FiGrid, color: 'text-blue-600', bg: 'bg-blue-50', border: 'hover:border-blue-200' },
              { label: 'Total Unlocks', value: stats?.totalUnlocks ?? 0, icon: FiUnlock, color: 'text-purple-600', bg: 'bg-purple-50', border: 'hover:border-purple-200' },
              { label: 'Total Views', value: stats?.totalViews ?? 0, icon: FiEye, color: 'text-green-600', bg: 'bg-green-50', border: 'hover:border-green-200' },
              { label: 'Total Shares', value: stats?.totalShares ?? 0, icon: FiShare2, color: 'text-orange-600', bg: 'bg-orange-50', border: 'hover:border-orange-200' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className={`bg-white/80 backdrop-blur-xl rounded-[1.5rem] p-5 border border-gray-200/60 shadow-sm ${stat.border} transition-all duration-300 group`}
              >
                <div className="flex items-center gap-4 mb-2">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <p className="text-3xl font-black text-gray-900 tracking-tight">{stat.value}</p>
                </div>
                <p className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* ── Advanced Search & Filter Bar ── */}
          <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-[1.5rem] shadow-sm border border-gray-200/60 mb-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search campaigns..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                  isFilterOpen || activeFilterCount > 0 ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FiFilter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 bg-purple-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
                <FiChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all border border-red-100"
                >
                  <FiX className="w-4 h-4" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Collapsible Filter Panel ── */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: '-1rem' }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white p-5 sm:p-6 rounded-[1.5rem] shadow-sm border border-gray-200/60 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-0 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">🟢 Active</option>
                      <option value="paused">🟡 Paused</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Required Action</label>
                    <select
                      value={featureFilter}
                      onChange={(e) => setFeatureFilter(e.target.value)}
                      className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all cursor-pointer"
                    >
                      <option value="all">Any Feature</option>
                      <option value="share">📤 Needs Sharing</option>
                      <option value="tasks">📋 Needs Tasks</option>
                      <option value="finalUrl">🔗 Has Redirect</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sort Order</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all cursor-pointer"
                    >
                      <option value="newest">📅 Newest First</option>
                      <option value="oldest">📅 Oldest First</option>
                      <option value="views">👁️ Most Views</option>
                      <option value="unlocks">🔓 Most Unlocks</option>
                      <option value="shares">📤 Most Shares</option>
                      <option value="completions">✅ Most Completions</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Campaign List ── */}
          <div className="space-y-4 relative z-10">
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-20 px-4 bg-white/80 backdrop-blur-md rounded-[2rem] border border-gray-200/60 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                  <FiSearch className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No campaigns found</h3>
                <p className="text-gray-500 text-sm mb-6 font-medium max-w-md mx-auto">
                  {searchTerm || statusFilter !== 'all' || featureFilter !== 'all'
                    ? "We couldn't find anything matching your filters. Try adjusting them."
                    : "You haven't created any campaigns yet. Build your first one to start tracking!"}
                </p>
                <button
                  onClick={handleCreateCampaign}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  <FiPlusCircle className="w-5 h-5" /> Create Campaign
                </button>
              </div>
            ) : (
              <>
                {filteredCampaigns.map((camp, index) => {
                  const cStatus = (camp.status || 'active').toLowerCase();
                  const isSuccessful = camp.shareCount > 0 && camp.shares >= camp.shareCount;
                  
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={camp.id}
                      className="bg-white rounded-3xl border border-gray-200/60 shadow-sm hover:shadow-lg transition-all duration-300 p-5 sm:p-6 relative overflow-hidden group"
                    >
                      {/* Left color bar indicating status */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${isSuccessful ? 'bg-green-500' : cStatus === 'active' ? 'bg-purple-500' : 'bg-yellow-400'}`} />

                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 pl-2">
                        
                        {/* Title & Badges */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                            <h3 className="font-extrabold text-gray-900 text-lg sm:text-xl truncate">
                              {camp.title || 'Untitled Campaign'}
                            </h3>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${cStatus === 'active' ? 'bg-purple-50 text-purple-700 border border-purple-200/50' : 'bg-yellow-50 text-yellow-700 border border-yellow-200/50'}`}>
                              {cStatus}
                            </span>
                            {isSuccessful && (
                              <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2.5 py-1 rounded-md uppercase tracking-wider border border-green-200/50 flex items-center gap-1">
                                <FiCheckCircle /> Success
                              </span>
                            )}
                          </div>
                          
                          {camp.description && (
                            <p className="text-sm text-gray-500 line-clamp-1 mb-3 font-medium">
                              {camp.description}
                            </p>
                          )}

                          {/* Quick Stats Row */}
                          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-600 bg-gray-50/80 px-4 py-2.5 rounded-xl border border-gray-100">
                            <span className="flex items-center gap-1.5"><FiUnlock className="w-4 h-4 text-purple-500" /> <span className="text-gray-900">{camp.unlockCount || 0}</span> Unlocks</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="flex items-center gap-1.5"><FiEye className="w-4 h-4 text-blue-500" /> <span className="text-gray-900">{camp.views || 0}</span> Views</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="flex items-center gap-1.5"><FiShare2 className="w-4 h-4 text-orange-500" /> <span className="text-gray-900">{camp.shares || 0}</span> Shares</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="flex items-center gap-1.5 text-gray-400"><FiCalendar className="w-4 h-4" /> {formatDate(camp.createdAt)}</span>
                          </div>

                          {/* Feature Badges */}
                          {camp.features && Object.values(camp.features).some(Boolean) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {camp.features.shareCount && <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md flex items-center gap-1"><FiShare2/> Shares Req</span>}
                              {camp.features.tasks && <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md flex items-center gap-1"><FiList/> Tasks Req</span>}
                              {camp.features.finalUrl && <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md flex items-center gap-1"><FiLink/> URL Redirect</span>}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-row md:flex-col gap-2 flex-shrink-0 w-full md:w-auto">
                          <button
                            onClick={() => copyCampaignUrl(camp)}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors text-xs sm:text-sm border border-blue-200/50"
                          >
                            {copiedCampaignId === camp.id ? <FiCheck className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                            {copiedCampaignId === camp.id ? 'Copied' : 'Link'}
                          </button>
                          <button
                            onClick={() => handleEditCampaign(camp)}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors text-xs sm:text-sm border border-gray-200"
                          >
                            <FiEdit2 className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(camp.id)}
                            className="flex-none inline-flex items-center justify-center px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors border border-red-200/50"
                            aria-label="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}

                {/* Infinite Scroll Loader */}
                {hasNextPage && (
                  <div ref={loaderRef} className="py-8 text-center">
                    {isFetchingNextPage ? (
                      <div className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-white rounded-full shadow-sm border border-gray-100 text-sm font-bold text-purple-600">
                        <svg className="animate-spin h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Loading more...
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-gray-400">Scroll to load more</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── EDIT MODAL (Premium SaaS Design) ── */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
            >
              {/* Sticky Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-5 flex items-center justify-between z-10">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <FiEdit2 className="text-purple-600" /> Edit Campaign
                </h2>
                <button onClick={closeModal} className="p-2.5 bg-gray-50 rounded-full hover:bg-gray-100 transition text-gray-500 border border-gray-200/50">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleEditSubmit} className="p-6 space-y-6 overflow-y-auto">
                {message && (
                  <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${message.includes('✅') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {message.includes('✅') ? <FiCheckCircle className="w-5 h-5"/> : <FiAlertCircle className="w-5 h-5"/>}
                    {message}
                  </div>
                )}

                {/* Campaign Details Section */}
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FiList className="text-gray-500" /> Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Campaign Title *</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition"
                        placeholder="My Awesome Campaign"
                        maxLength="100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        rows="2"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition resize-y"
                        placeholder="Briefly describe what this is..."
                        maxLength="500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Reward Name</label>
                      <input
                        type="text"
                        value={editForm.reward}
                        onChange={(e) => setEditForm(prev => ({ ...prev, reward: e.target.value }))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition"
                        placeholder="e.g. Free eBook"
                      />
                    </div>
                  </div>
                </div>

                {/* Features toggles */}
                <div className="space-y-4">
                  {/* Share Count Toggle */}
                  <div className={`p-5 rounded-2xl border transition-all ${editForm.features.shareCount ? 'bg-blue-50/30 border-blue-200' : 'bg-gray-50/50 border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <FiShare2 className={editForm.features.shareCount ? 'text-blue-500' : 'text-gray-400'} /> Share Requirement
                        </h3>
                        <p className="text-xs font-medium text-gray-500 mt-1">Force users to share your link</p>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
                        <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></span>
                      </label>
                    </div>
                    {editForm.features.shareCount && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-blue-100">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Number of Shares Needed</label>
                        <input
                          type="number"
                          value={editForm.shareCount}
                          onChange={(e) => setEditForm(prev => ({ ...prev, shareCount: Number(e.target.value) }))}
                          min="1" max="9999"
                          className="w-full sm:w-1/2 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition"
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Tasks Toggle */}
                  <div className={`p-5 rounded-2xl border transition-all ${editForm.features.tasks ? 'bg-purple-50/30 border-purple-200' : 'bg-gray-50/50 border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <FiCheckCircle className={editForm.features.tasks ? 'text-purple-500' : 'text-gray-400'} /> Custom Tasks
                        </h3>
                        <p className="text-xs font-medium text-gray-500 mt-1">Add links users must visit/follow</p>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-purple-600 transition-colors"></div>
                        <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></span>
                      </label>
                    </div>
                    {editForm.features.tasks && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-purple-100 space-y-3">
                        {editForm.tasks.map((task, index) => (
                          <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm relative">
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Task {index+1} Title</label>
                              <input
                                value={task.text}
                                onChange={(e) => updateTaskInEdit(index, 'text', e.target.value)}
                                placeholder="Subscribe to YouTube"
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:border-purple-500 focus:outline-none"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Target URL</label>
                              <input
                                value={task.url}
                                onChange={(e) => updateTaskInEdit(index, 'url', e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:border-purple-500 focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTaskInEdit(index)}
                              className="self-end sm:mb-1 p-2.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"
                              title="Remove Task"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        ))}
                        {editForm.tasks.length < 100 && (
                          <button
                            type="button"
                            onClick={addTaskInEdit}
                            className="w-full py-3 border-2 border-dashed border-purple-200 rounded-xl text-sm font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 transition"
                          >
                            + Add Another Task
                          </button>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Final URL Toggle */}
                  <div className={`p-5 rounded-2xl border transition-all ${editForm.features.finalUrl ? 'bg-green-50/30 border-green-200' : 'bg-gray-50/50 border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <FiLink className={editForm.features.finalUrl ? 'text-green-500' : 'text-gray-400'} /> Final Redirect URL
                        </h3>
                        <p className="text-xs font-medium text-gray-500 mt-1">Send users here upon completion</p>
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
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                        <span className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></span>
                      </label>
                    </div>
                    {editForm.features.finalUrl && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-green-100">
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Destination URL</label>
                        <input
                          type="url"
                          value={editForm.finalUrl}
                          onChange={(e) => setEditForm(prev => ({ ...prev, finalUrl: e.target.value }))}
                          placeholder="https://yoursite.com/download"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-500/10 transition"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Sticky Footer Buttons */}
                <div className="sticky bottom-0 -mx-6 -mb-6 bg-white/95 backdrop-blur-md p-5 border-t border-gray-100 flex gap-3 z-10 rounded-b-3xl">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <><FaSpinner className="animate-spin" /> Saving...</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}