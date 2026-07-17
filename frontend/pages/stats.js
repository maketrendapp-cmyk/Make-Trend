// pages/stats.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import AuthScreen from '../components/AuthScreen';
import Meta from '../components/Meta';
import { auth } from '../services/firebase';
import {
  FiBarChart2,
  FiEye,
  FiUnlock,
  FiShare2,
  FiCheckCircle,
  FiAward,
  FiPlusCircle,
  FiEdit2,
  FiTrash2,
  FiClock,
  FiLink,
  FiLogIn,
  FiArrowRight,
} from 'react-icons/fi';

export default function Stats() {
  const router = useRouter();
  const { 
    user, 
    isAuthenticated, 
    needsCompletion, 
    loading, 
    refreshUser, 
    campaigns: contextCampaigns, 
    stats: contextStats,
    dataLoaded 
  } = useAuth();
  
  const [campaigns, setCampaigns] = useState(contextCampaigns || []);
  const [stats, setStats] = useState(contextStats || {
    totalCampaigns: 0,
    totalViews: 0,
    totalUnlocks: 0,
    totalShares: 0,
    totalCompletions: 0,
    successfulCampaigns: 0,
  });
  const [statsLoading, setStatsLoading] = useState(!dataLoaded);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastCreatedAt, setLastCreatedAt] = useState(null);
  const [lastId, setLastId] = useState(null);

  // ── Edit modal states ──
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    shareCount: 0,
    tasks: [],
    finalUrl: '',
    features: { shareCount: false, tasks: false, finalUrl: false },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedCampaignId, setCopiedCampaignId] = useState(null);

  // ── IntersectionObserver ref ──
  const loaderRef = useRef(null);

  // ===== DATE FORMATTER =====
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      let date;
      if (timestamp.seconds !== undefined) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp._seconds !== undefined) {
        date = new Date(timestamp._seconds * 1000);
      } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  // ===== FETCH CAMPAIGNS (with pagination) =====
  const fetchCampaigns = useCallback(async (isInitial = false) => {
    if (!isInitial && !hasMore) return;
    if (loadingMore) return;
    setLoadingMore(true);

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) { setLoadingMore(false); return; }
      const token = await firebaseUser.getIdToken();
      let url = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com'}/api/campaigns?limit=25`;
      if (!isInitial && lastCreatedAt && lastId) {
        url += `&lastCreatedAt=${lastCreatedAt}&lastId=${lastId}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      if (data.success) {
        if (isInitial) {
          setCampaigns(data.campaigns || []);
        } else {
          setCampaigns(prev => [...prev, ...(data.campaigns || [])]);
        }
        setHasMore(data.hasMore || false);
        if (data.lastCreatedAt && data.lastId) {
          setLastCreatedAt(data.lastCreatedAt);
          setLastId(data.lastId);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('❌ fetchCampaigns error:', error.message);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, lastCreatedAt, lastId, loadingMore]);

  // ===== LOAD INITIAL DATA – use context if available, otherwise fetch =====
  useEffect(() => {
    if (!isAuthenticated || needsCompletion) {
      setStatsLoading(false);
      return;
    }

    // ✅ If data is already loaded from context, use it and SKIP fetching
    if (dataLoaded && contextCampaigns && contextCampaigns.length > 0) {
      setCampaigns(contextCampaigns);
      if (contextStats) {
        setStats(contextStats);
      }
      setStatsLoading(false);
      setHasMore(true);
      setLastCreatedAt(null);
      setLastId(null);
      return; // 🔥 IMPORTANT: Stop here, don't fetch!
    }

    // ✅ If data is loaded but user has no campaigns
    if (dataLoaded && contextCampaigns && contextCampaigns.length === 0) {
      setStatsLoading(false);
      return;
    }

    // ✅ Only fetch if data is not loaded yet (first visit)
    setStatsLoading(true);
    setHasMore(true);
    setLastCreatedAt(null);
    setLastId(null);
    fetchCampaigns(true).finally(() => setStatsLoading(false));
  }, [isAuthenticated, needsCompletion, dataLoaded, contextCampaigns, contextStats]);

  // ===== INFINITE SCROLL OBSERVER =====
  useEffect(() => {
    if (loadingMore || !hasMore || statsLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !statsLoading) {
          fetchCampaigns(false);
        }
      },
      { threshold: 0.1 }
    );
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    return () => observer.disconnect();
  }, [hasMore, loadingMore, statsLoading, fetchCampaigns]);

  // ===== HANDLERS =====
  const handleCreateCampaign = () => router.push('/create');

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setEditForm({
      title: campaign.title || '',
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
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) { alert('You must be logged in'); return; }
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com'}/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(campaigns.filter((c) => c.id !== campaignId));
        setMessage('✅ Campaign deleted successfully!');
        setTimeout(() => setMessage(''), 3000);
        setHasMore(true);
        setLastCreatedAt(null);
        setLastId(null);
        await fetchCampaigns(true);
      } else {
        alert(data.error || 'Failed to delete campaign');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Network error. Please try again.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setMessage('❌ You must be logged in');
        setIsSubmitting(false);
        return;
      }
      const token = await firebaseUser.getIdToken();
      const payload = {
        title: editForm.title,
        shareCount: editForm.features.shareCount ? editForm.shareCount : 0,
        tasks: editForm.features.tasks ? editForm.tasks : [],
        finalUrl: editForm.features.finalUrl ? editForm.finalUrl : '',
        features: editForm.features,
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com'}/api/campaigns/${editingCampaign.id}`, {
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
        setHasMore(true);
        setLastCreatedAt(null);
        setLastId(null);
        await fetchCampaigns(true);
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

  const addTaskInEdit = () => {
    if (editForm.tasks.length >= 100) {
      setMessage('Maximum 100 tasks allowed');
      return;
    }
    setEditForm((prev) => ({
      ...prev,
      tasks: [...prev.tasks, { text: '', url: '' }],
    }));
  };

  const removeTaskInEdit = (index) => {
    if (editForm.tasks.length <= 1) {
      setMessage('At least one task is required if tasks are enabled');
      return;
    }
    setEditForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
  };

  const updateTaskInEdit = (index, field, value) => {
    const updated = [...editForm.tasks];
    updated[index][field] = value;
    setEditForm((prev) => ({ ...prev, tasks: updated }));
  };

  // ============================================================
  // UNAUTHENTICATED – Show Login Prompt
  // ============================================================
  if (!isAuthenticated && !loading) {
    return (
      <>
        <Meta title="Dashboard" description="Track your campaign performance." />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiBarChart2 className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Track Your Stats</h2>
            <p className="text-gray-500 text-sm mb-6">
              Sign in to view your campaign analytics, track performance, and manage your campaigns.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push('/login')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <FiLogIn className="w-5 h-5" />
                Sign In
              </button>
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
              >
                <FiArrowRight className="w-5 h-5" />
                Browse Templates
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-purple-600 hover:underline font-medium"
              >
                Create one
              </button>
            </p>
          </div>
        </div>
      </>
    );
  }

  // ============================================================
  // NEEDS PROFILE COMPLETION
  // ============================================================
  if (needsCompletion) {
    return (
      <>
        <Meta title="Complete Profile" description="Complete your profile." />
        <AuthScreen onSuccess={refreshUser} />
      </>
    );
  }

  // ============================================================
  // SKELETON LOADING (only if auth loading)
  // ============================================================
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="h-8 w-8 bg-gray-200 rounded-full mb-3" />
              <div className="h-7 w-12 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div className="flex-1">
                  <div className="h-5 w-48 bg-gray-200 rounded mb-1" />
                  <div className="flex gap-2">
                    <div className="h-3 w-16 bg-gray-200 rounded" />
                    <div className="h-3 w-12 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-16 bg-gray-200 rounded" />
                  <div className="h-8 w-16 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
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
      <Meta title="Dashboard" description="Manage your campaigns and track performance." />
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Overview of all your campaigns</p>
          </div>
          <button
            onClick={handleCreateCampaign}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md text-sm whitespace-nowrap"
          >
            <FiPlusCircle className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {/* ── STATS CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Campaigns', value: stats.totalCampaigns, icon: FiBarChart2, color: 'blue' },
            { label: 'Total Unlocks', value: stats.totalUnlocks, icon: FiUnlock, color: 'purple' },
            { label: 'Total Views', value: stats.totalViews, icon: FiEye, color: 'green' },
            { label: 'Total Shares', value: stats.totalShares, icon: FiShare2, color: 'orange' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Success Stats ── */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100/60">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 text-green-700">
                <FiCheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.successfulCampaigns}</p>
                <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Completed Campaigns</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-100/60">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700">
                <FiAward className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-indigo-700">{stats.totalCompletions}</p>
                <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Total Completions</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── CAMPAIGN LIST (infinite scroll) ── */}
        <div className="space-y-4">
          {campaigns.length === 0 && !statsLoading ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-gray-100">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-500 text-sm">You haven't created any campaigns yet.</p>
              <button
                onClick={handleCreateCampaign}
                className="mt-4 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all duration-200 text-sm"
              >
                Create Your First Campaign
              </button>
            </div>
          ) : (
            <>
              {campaigns.map((camp) => {
                const isSuccessful = camp.shareCount > 0 && camp.shares >= camp.shareCount;
                return (
                  <div
                    key={camp.id}
                    className="bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-200 p-5 relative overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      isSuccessful ? 'bg-green-500' : camp.status === 'active' ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {camp.title || 'Untitled Campaign'}
                          </p>
                          <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${
                            camp.status === 'active' ? 'bg-blue-100 text-blue-700' :
                            camp.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {camp.status || 'Active'}
                          </span>
                          {isSuccessful && (
                            <span className="text-[10px] font-medium bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full">
                              ✅ Success
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <FiUnlock className="w-3 h-3" />
                            <span className="font-medium text-gray-700">{camp.unlockCount || 0}</span> unlocks
                          </span>
                          <span className="flex items-center gap-1">
                            <FiEye className="w-3 h-3" />
                            <span className="font-medium text-gray-700">{camp.views || 0}</span> views
                          </span>
                          <span className="flex items-center gap-1">
                            <FiShare2 className="w-3 h-3" />
                            <span className="font-medium text-gray-700">{camp.shares || 0}</span> shares
                          </span>
                          <span className="flex items-center gap-1">
                            <FiCheckCircle className="w-3 h-3" />
                            <span className="font-medium text-gray-700">{camp.completions || 0}</span> completions
                          </span>
                          <span className="flex items-center gap-1 text-gray-400">
                            <FiClock className="w-3 h-3" />
                            {formatDate(camp.createdAt)}
                          </span>
                        </div>

                        {camp.features && Object.values(camp.features).some(Boolean) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {camp.features.shareCount && (
                              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Shares</span>
                            )}
                            {camp.features.tasks && (
                              <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">Tasks</span>
                            )}
                            {camp.features.finalUrl && (
                              <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded">Redirect</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            const shareUrl = `${window.location.origin}/${camp.templateSlug || 'campaign'}/${camp.id}`;
                            navigator.clipboard.writeText(shareUrl);
                            setCopiedCampaignId(camp.id);
                            setTimeout(() => setCopiedCampaignId(null), 2000);
                          }}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-all duration-200 text-xs sm:text-sm"
                        >
                          <FiLink className="w-3.5 h-3.5" /> {copiedCampaignId === camp.id ? 'Copied!' : 'Copy URL'}
                        </button>
                        <button
                          onClick={() => handleEditCampaign(camp)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 text-xs sm:text-sm"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-all duration-200 text-xs sm:text-sm"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ── Loader for infinite scroll ── */}
              {hasMore && (
                <div ref={loaderRef} className="py-4 text-center">
                  {loadingMore ? (
                    <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                      <svg className="animate-spin h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24">
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

      {/* ── EDIT MODAL (unchanged) ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Edit Campaign</h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {message && (
                <div className={`p-3 rounded-xl text-sm ${
                  message.includes('✅') ? 'bg-green-50 border border-green-200 text-green-700' :
                  'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {message}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                  placeholder="Campaign title"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Share Count</label>
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
                    <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-purple-200 rounded-full peer peer-checked:bg-purple-600 transition-all duration-200"></div>
                    <span className="absolute left-1 top-1 w-3.5 h-3.5 bg-white rounded-full transition-all duration-200 peer-checked:translate-x-4"></span>
                  </label>
                </div>
                {editForm.features.shareCount && (
                  <input
                    type="number"
                    value={editForm.shareCount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, shareCount: Number(e.target.value) }))}
                    min="1"
                    max="9999"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                    placeholder="Number of shares required"
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Tasks</label>
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
                    <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-purple-200 rounded-full peer peer-checked:bg-purple-600 transition-all duration-200"></div>
                    <span className="absolute left-1 top-1 w-3.5 h-3.5 bg-white rounded-full transition-all duration-200 peer-checked:translate-x-4"></span>
                  </label>
                </div>
                {editForm.features.tasks && (
                  <div className="space-y-3">
                    {editForm.tasks.map((task, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <input
                          value={task.text}
                          onChange={(e) => updateTaskInEdit(index, 'text', e.target.value)}
                          placeholder="Task text"
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                        />
                        <input
                          value={task.url}
                          onChange={(e) => updateTaskInEdit(index, 'url', e.target.value)}
                          placeholder="Task URL"
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                        />
                        <button
                          type="button"
                          onClick={() => removeTaskInEdit(index)}
                          className="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition"
                        >
                          Remove
                        </button>
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Final Redirect URL</label>
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
                    <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-purple-200 rounded-full peer peer-checked:bg-purple-600 transition-all duration-200"></div>
                    <span className="absolute left-1 top-1 w-3.5 h-3.5 bg-white rounded-full transition-all duration-200 peer-checked:translate-x-4"></span>
                  </label>
                </div>
                {editForm.features.finalUrl && (
                  <input
                    type="url"
                    value={editForm.finalUrl}
                    onChange={(e) => setEditForm(prev => ({ ...prev, finalUrl: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                    placeholder="https://your-site.com/thank-you"
                  />
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-all duration-200 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}