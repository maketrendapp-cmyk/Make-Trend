// pages/stats.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import AuthScreen from '../components/AuthScreen';
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function Stats() {
  const router = useRouter();
  const { user, isAuthenticated, needsCompletion, loading, refreshUser } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
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

  useEffect(() => {
    if (isAuthenticated && !needsCompletion) {
      fetchCampaigns();
    } else {
      setStatsLoading(false);
    }
  }, [isAuthenticated, needsCompletion]);

  const fetchCampaigns = async () => {
    try {
      setStatsLoading(true);
      const res = await fetch(`${API_BASE}/campaigns`);
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    router.push('/create');
  };

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
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(campaigns.filter(c => c.id !== campaignId));
        setMessage('✅ Campaign deleted successfully!');
        setTimeout(() => setMessage(''), 3000);
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
      const token = await user.getIdToken();
      const payload = {
        title: editForm.title,
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
        await fetchCampaigns();
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

  // ===== ADD/REMOVE TASK IN EDIT MODAL =====
  const addTaskInEdit = () => {
    if (editForm.tasks.length >= 100) {
      setMessage('Maximum 100 tasks allowed');
      return;
    }
    setEditForm(prev => ({
      ...prev,
      tasks: [...prev.tasks, { text: '', url: '' }]
    }));
  };

  const removeTaskInEdit = (index) => {
    if (editForm.tasks.length <= 1) {
      setMessage('At least one task is required if tasks are enabled');
      return;
    }
    setEditForm(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  };

  const updateTaskInEdit = (index, field, value) => {
    const updated = [...editForm.tasks];
    updated[index][field] = value;
    setEditForm(prev => ({ ...prev, tasks: updated }));
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-pulse">
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-border">
              <div className="h-8 w-8 bg-gray-200 rounded mb-2" />
              <div className="h-7 w-12 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col sm:flex-row justify-between gap-3 py-4 border-b border-border last:border-0">
              <div>
                <div className="h-5 w-48 bg-gray-200 rounded mb-1" />
                <div className="flex gap-2">
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                  <div className="h-3 w-12 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-8 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="Stats" description="Track your campaign performance." />
        <AuthScreen onSuccess={refreshUser} />
      </>
    );
  }

  if (needsCompletion) {
    return (
      <>
        <Meta title="Complete Profile" description="Complete your profile." />
        <AuthScreen onSuccess={refreshUser} />
      </>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  return (
    <>
      <Meta title="Dashboard" description="Manage your campaigns and track performance." />
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">📊 Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage your campaigns and track performance</p>
          </div>
          <button
            onClick={handleCreateCampaign}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md text-sm whitespace-nowrap"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Total Campaigns', value: user?.stats?.totalCampaigns || campaigns.length, icon: '📊' },
            { label: 'Total Unlocks', value: user?.stats?.totalUnlocks || 0, icon: '🚀' },
            { label: 'Total Views', value: user?.stats?.totalViews || 0, icon: '👁️' },
            { label: 'Active Campaigns', value: activeCampaigns, icon: '🎯' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-border hover:shadow-md transition-all duration-200">
              <div className="text-2xl sm:text-3xl mb-1">{stat.icon}</div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs sm:text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Campaign List */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-border p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Your Campaigns</h3>
            <span className="text-xs text-gray-400">{campaigns.length} total</span>
          </div>

          {statsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col sm:flex-row justify-between gap-3 py-3 border-b border-border last:border-0 animate-pulse">
                  <div className="flex-1">
                    <div className="h-5 w-3/4 bg-gray-200 rounded mb-1" />
                    <div className="flex flex-wrap gap-2">
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                      <div className="h-3 w-12 bg-gray-200 rounded" />
                      <div className="h-3 w-20 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-16 bg-gray-200 rounded" />
                    <div className="h-8 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-gray-500 text-sm">You haven't created any campaigns yet.</p>
              <button
                onClick={handleCreateCampaign}
                className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all duration-200 text-sm"
              >
                Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {campaigns.map((camp) => (
                <div key={camp.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 sm:py-4 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                      {camp.title || 'Untitled Campaign'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-xs text-gray-500">
                        {camp.platform || 'General'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                        camp.status === 'active' ? 'bg-green-100 text-green-700' :
                        camp.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {camp.status || 'Active'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-xs text-primary font-medium">
                        {camp.unlockCount || 0} unlocks
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-xs text-gray-400">
                        {formatDate(camp.createdAt)}
                      </span>
                    </div>
                    {camp.features && (
                      <div className="flex flex-wrap gap-1 mt-1">
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
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <button
                      onClick={() => handleEditCampaign(camp)}
                      className="inline-flex items-center justify-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 text-xs sm:text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(camp.id)}
                      className="inline-flex items-center justify-center px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-all duration-200 text-xs sm:text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ===== EDIT MODAL ===== */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-[slideUp_0.3s_ease-out]">
            <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
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

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  placeholder="Campaign title"
                />
              </div>

              {/* Share Count */}
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
                    <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:bg-primary transition-all duration-200"></div>
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
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    placeholder="Number of shares required"
                  />
                )}
              </div>

              {/* Tasks */}
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
                    <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:bg-primary transition-all duration-200"></div>
                    <span className="absolute left-1 top-1 w-3.5 h-3.5 bg-white rounded-full transition-all duration-200 peer-checked:translate-x-4"></span>
                  </label>
                </div>
                {editForm.features.tasks && (
                  <div className="space-y-3">
                    {editForm.tasks.map((task, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl border border-border">
                        <input
                          value={task.text}
                          onChange={(e) => updateTaskInEdit(index, 'text', e.target.value)}
                          placeholder="Task text"
                          className="border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                        />
                        <input
                          value={task.url}
                          onChange={(e) => updateTaskInEdit(index, 'url', e.target.value)}
                          placeholder="Task URL"
                          className="border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
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
                        className="w-full py-2 border-2 border-dashed border-border rounded-xl text-sm text-gray-500 hover:text-primary hover:border-primary/50 transition"
                      >
                        + Add Task
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Final URL */}
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
                    <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:bg-primary transition-all duration-200"></div>
                    <span className="absolute left-1 top-1 w-3.5 h-3.5 bg-white rounded-full transition-all duration-200 peer-checked:translate-x-4"></span>
                  </label>
                </div>
                {editForm.features.finalUrl && (
                  <input
                    type="url"
                    value={editForm.finalUrl}
                    onChange={(e) => setEditForm(prev => ({ ...prev, finalUrl: e.target.value }))}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                    placeholder="https://your-site.com/thank-you"
                  />
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 disabled:opacity-50"
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