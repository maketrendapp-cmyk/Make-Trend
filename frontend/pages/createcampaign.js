// pages/createcampaign.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { useTemplates, useInvalidateQueries } from '../lib/queries';
import AuthScreen from '../components/AuthScreen';
import { auth } from '../services/firebase';
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function CreateCampaign() {
  const router = useRouter();
  const { slug } = router.query;
  const { 
    user, 
    isAuthenticated, 
    loading: authLoading, 
    refreshUser
  } = useAuth();
  
  // ── React Query ──
  const { data: templates = [], isLoading: templatesLoading } = useTemplates();
  const { invalidateCampaigns, invalidateStats } = useInvalidateQueries();

  // ── State ──
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [campaignUrl, setCampaignUrl] = useState('');
  const [campaignId, setCampaignId] = useState('');

  // ── Form State ──
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignReward, setCampaignReward] = useState('');

  const [shareCountEnabled, setShareCountEnabled] = useState(false);
  const [shareCount, setShareCount] = useState(10);

  const [tasksEnabled, setTasksEnabled] = useState(false);
  const [tasks, setTasks] = useState([{ text: '', url: '' }]);

  const [finalUrlEnabled, setFinalUrlEnabled] = useState(false);
  const [finalUrl, setFinalUrl] = useState('');

  // ── Storage key per template slug ──
  const storageKey = `createCampaign_${slug || 'new'}`;

  // ── Load template from React Query cache ──
  useEffect(() => {
    if (slug && isAuthenticated && templates.length > 0) {
      const found = templates.find(t => t.slug === slug);
      if (found) {
        setTemplate(found);
        // Pre‑fill from template
        setCampaignTitle(found.title || '');
        setCampaignDescription(found.description || '');
        setCampaignReward(found.reward || 'Exclusive Reward');
        setError('');
        // Load saved form from localStorage
        loadSavedForm();
        setLoading(false);
      } else {
        setError('Template not found');
        setLoading(false);
      }
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [slug, isAuthenticated, templates]);

  // ── Load saved form from localStorage ──
  const loadSavedForm = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title !== undefined) setCampaignTitle(parsed.title);
        if (parsed.description !== undefined) setCampaignDescription(parsed.description);
        if (parsed.reward !== undefined) setCampaignReward(parsed.reward);
        if (parsed.shareCountEnabled !== undefined) setShareCountEnabled(parsed.shareCountEnabled);
        if (parsed.shareCount !== undefined) setShareCount(parsed.shareCount);
        if (parsed.tasksEnabled !== undefined) setTasksEnabled(parsed.tasksEnabled);
        if (parsed.tasks !== undefined) setTasks(parsed.tasks);
        if (parsed.finalUrlEnabled !== undefined) setFinalUrlEnabled(parsed.finalUrlEnabled);
        if (parsed.finalUrl !== undefined) setFinalUrl(parsed.finalUrl);
      }
    } catch (e) {
      console.warn('Failed to load saved form', e);
    }
  };

  // ── Save form to localStorage on any change ──
  useEffect(() => {
    if (!template) return;
    const formData = {
      title: campaignTitle,
      description: campaignDescription,
      reward: campaignReward,
      shareCountEnabled,
      shareCount,
      tasksEnabled,
      tasks,
      finalUrlEnabled,
      finalUrl,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(formData));
    } catch (e) {
      // ignore
    }
  }, [
    campaignTitle,
    campaignDescription,
    campaignReward,
    shareCountEnabled,
    shareCount,
    tasksEnabled,
    tasks,
    finalUrlEnabled,
    finalUrl,
    template,
    storageKey,
  ]);

  // ── Task Handlers ──
  const addTask = () => {
    if (tasks.length >= 100) {
      setMessage('Maximum 100 tasks allowed');
      return;
    }
    setTasks([...tasks, { text: '', url: '' }]);
  };

  const removeTask = (index) => {
    if (tasks.length <= 1) {
      setMessage('At least one task is required if tasks are enabled');
      return;
    }
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index, field, value) => {
    const updated = [...tasks];
    updated[index][field] = value;
    setTasks(updated);
  };

  // ── Validation ──
  const validateForm = () => {
    if (!campaignTitle || campaignTitle.trim().length < 1) {
      setMessage('Please enter a campaign title');
      return false;
    }
    if (campaignTitle.length > 100) {
      setMessage('Campaign title must be less than 100 characters');
      return false;
    }
    if (campaignDescription && campaignDescription.length > 500) {
      setMessage('Description must be less than 500 characters');
      return false;
    }

    if (!shareCountEnabled && !tasksEnabled && !finalUrlEnabled) {
      setMessage('Please enable at least one feature: Share Count, Tasks, or Final URL');
      return false;
    }

    if (shareCountEnabled) {
      const num = Number(shareCount);
      if (!Number.isInteger(num) || num < 1 || num > 9999) {
        setMessage('Share count must be a whole number between 1 and 9999');
        return false;
      }
    }

    if (tasksEnabled) {
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

    if (finalUrlEnabled && finalUrl && !isValidUrl(finalUrl)) {
      setMessage('Please enter a valid final redirect URL');
      return false;
    }

    return true;
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setMessage('❌ You must be logged in to create a campaign.');
        setIsSubmitting(false);
        return;
      }

      const token = await firebaseUser.getIdToken();

      const payload = {
        templateId: template.id,
        title: campaignTitle.trim(),
        description: campaignDescription.trim(),
        reward: campaignReward.trim(),
        shareCount: shareCountEnabled ? Number(shareCount) : 0,
        tasks: tasksEnabled ? tasks : [],
        finalUrl: finalUrlEnabled ? finalUrl : '',
        features: {
          shareCount: shareCountEnabled,
          tasks: tasksEnabled,
          finalUrl: finalUrlEnabled,
        },
      };

      const res = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const cId = data.campaignId;
        setCampaignId(cId);
        const url = `/${slug}/${cId}`;
        setCampaignUrl(url);
        setMessage('✅ Campaign created successfully!');
        // Clear saved form after success
        localStorage.removeItem(storageKey);
        // 🔥 Invalidate React Query cache to refresh stats and campaigns
        await invalidateCampaigns();
        await invalidateStats();
      } else {
        setMessage(data.error || 'Failed to create campaign');
      }
    } catch (err) {
      console.error('Error:', err);
      setMessage('Network error: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // ── Handlers for non‑authenticated ──
  if (!authLoading && !isAuthenticated) {
    return (
      <>
        <Meta title="Login Required" />
        <AuthScreen onSuccess={refreshUser} />
      </>
    );
  }

  // ── Error state (with Meta) ──
  if (error) {
    return (
      <>
        <Meta title="Template Not Found" />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Template not found</h2>
          <p className="text-gray-500">{error}</p>
          <button
            onClick={() => router.push('/create')}
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Browse Templates
          </button>
        </main>
      </>
    );
  }

  // ── Success Screen ──
  if (campaignUrl) {
    const fullUrl = `${window.location.origin}${campaignUrl}`;
    return (
      <>
        <Meta title="Campaign Created!" />
        <main className="min-h-screen flex items-center justify-center px-4 py-5 bg-gradient-to-b from-gray-50 to-white">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 sm:px-7 sm:py-5">
              <div className="flex items-center gap-4 text-white">
                <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                  🎉
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">Campaign Created!</h1>
                  <p className="text-purple-100 text-sm">Your campaign is ready to share.</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Preview Card */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Preview</h2>
                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-48 h-40 sm:h-auto bg-gray-200 flex-shrink-0">
                      {template?.image ? (
                        <img
                          src={template.image}
                          alt={campaignTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                          🎯
                        </div>
                      )}
                    </div>
                    <div className="flex-1 p-4 space-y-2">
                      <h3 className="text-lg font-bold text-gray-900">{campaignTitle}</h3>
                      {campaignDescription && (
                        <p className="text-gray-600 text-sm">{campaignDescription}</p>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-200">
                          🎁 {campaignReward}
                        </span>
                        {shareCountEnabled && (
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-200">
                            📢 {shareCount} shares
                          </span>
                        )}
                        {tasksEnabled && (
                          <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-xs font-medium border border-purple-200">
                            📋 {tasks.length} tasks
                          </span>
                        )}
                        {finalUrlEnabled && (
                          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium border border-green-200">
                            🔗 Redirect
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy URL */}
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Share Link</h2>
                <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <input
                    type="text"
                    value={fullUrl}
                    readOnly
                    className="flex-1 w-full bg-transparent outline-none text-sm font-mono text-gray-700 truncate"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(fullUrl);
                      setMessage('✅ Link copied!');
                      setTimeout(() => setMessage(''), 3000);
                    }}
                    className="flex-shrink-0 w-full sm:w-auto px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-sm"
                  >
                    Copy Link
                  </button>
                </div>
                {message && <p className="mt-2 text-sm text-green-600 text-center">{message}</p>}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 justify-center pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.push(campaignUrl)}
                  className="inline-flex items-center justify-center px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-sm"
                >
                  👁️ View Campaign
                </button>
                <button
                  onClick={() => router.push('/stats')}
                  className="inline-flex items-center justify-center px-5 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-all duration-200"
                >
                  📊 View Stats
                </button>
                <button
                  onClick={() => router.push('/create')}
                  className="inline-flex items-center justify-center px-5 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-all duration-200"
                >
                  ✨ Create Another
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // ── Skeleton Loading ──
  if (loading || templatesLoading) {
    return (
      <>
        <Meta title="Create Campaign" />
        <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-pulse">
          <div className="w-20 h-8 bg-gray-200 rounded-lg mb-4" />
          <div className="flex items-center gap-2 mb-2">
            <div className="w-20 h-5 bg-gray-200 rounded" />
            <div className="w-32 h-6 bg-gray-200 rounded-md" />
          </div>
          <div className="w-64 h-9 bg-gray-200 rounded mb-2" />
          <div className="w-80 h-5 bg-gray-200 rounded mb-6" />

          <div className="bg-white p-6 rounded-2xl border border-border mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="w-32 h-6 bg-gray-200 rounded mb-1" />
                <div className="w-48 h-4 bg-gray-200 rounded" />
              </div>
              <div className="w-11 h-6 bg-gray-200 rounded-full" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="w-32 h-6 bg-gray-200 rounded mb-1" />
                <div className="w-48 h-4 bg-gray-200 rounded" />
              </div>
              <div className="w-11 h-6 bg-gray-200 rounded-full" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="w-32 h-6 bg-gray-200 rounded mb-1" />
                <div className="w-48 h-4 bg-gray-200 rounded" />
              </div>
              <div className="w-11 h-6 bg-gray-200 rounded-full" />
            </div>
          </div>

          <div className="w-full h-14 bg-gray-200 rounded-xl" />
        </main>
      </>
    );
  }

  // ── Main Form ──
  return (
    <>
      <Meta title={`Create Campaign - ${template?.title || 'Campaign'}`} />
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 mb-4 px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        {/* Template Info */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
          <span>Template:</span>
          <span className="font-mono font-medium text-gray-800 bg-gray-100 px-2.5 py-0.5 rounded-md">{slug}</span>
          {template?.category && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{template.category}</span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mt-1">Create Campaign</h1>
        <p className="text-gray-500 mt-1 text-sm">Enable the features you want and customize your campaign</p>

        {/* Messages */}
        {message && (
          <div className={`mt-6 p-4 rounded-xl ${
            message.includes('✅')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          } animate-[fadeIn_0.3s_ease-out]`}>
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* ── Campaign Details ── */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 Campaign Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="Enter campaign title..."
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  maxLength="100"
                />
                <p className="text-xs text-gray-400 mt-1">{campaignTitle.length}/100 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={campaignDescription}
                  onChange={(e) => setCampaignDescription(e.target.value)}
                  placeholder="Describe your campaign..."
                  rows="3"
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-y"
                  maxLength="500"
                />
                <p className="text-xs text-gray-400 mt-1">{campaignDescription.length}/500 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🎁 Reward</label>
                <input
                  type="text"
                  value={campaignReward}
                  onChange={(e) => setCampaignReward(e.target.value)}
                  placeholder="e.g., Exclusive Gift Card"
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
                <p className="text-xs text-gray-400 mt-1">What users get after completing the campaign</p>
              </div>
            </div>
          </div>

          {/* ── Share Count ── */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">📢 Share Count</h2>
                <p className="text-sm text-gray-500">Require users to share your campaign</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareCountEnabled}
                  onChange={(e) => setShareCountEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:bg-primary transition-all duration-200"></div>
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 peer-checked:translate-x-5 peer-checked:bg-white"></span>
              </label>
            </div>

            {shareCountEnabled && (
              <div className="mt-4 animate-slideDown">
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Shares Required</label>
                <input
                  type="number"
                  value={shareCount}
                  onChange={(e) => setShareCount(Number(e.target.value))}
                  min="1"
                  max="9999"
                  step="1"
                  className="w-full max-w-xs border border-border rounded-xl px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
                <p className="text-xs text-gray-400 mt-1">Enter a whole number between 1 and 9999</p>
              </div>
            )}
          </div>

          {/* ── Tasks ── */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">📋 Tasks</h2>
                <p className="text-sm text-gray-500">Add tasks users must complete</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={tasksEnabled}
                  onChange={(e) => setTasksEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:bg-primary transition-all duration-200"></div>
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 peer-checked:translate-x-5"></span>
              </label>
            </div>

            {tasksEnabled && (
              <div className="mt-4 space-y-4 animate-slideDown">
                <p className="text-sm text-gray-500">Add up to 100 tasks</p>
                {tasks.map((task, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl border border-border">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Task {index + 1} Text</label>
                      <input
                        value={task.text}
                        onChange={(e) => updateTask(index, 'text', e.target.value)}
                        placeholder="e.g., Follow @username"
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                        maxLength="250"
                      />
                      <p className="text-xs text-gray-400 mt-1">{task.text.length}/250</p>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Task URL</label>
                      <input
                        value={task.url}
                        onChange={(e) => updateTask(index, 'url', e.target.value)}
                        placeholder="https://instagram.com/..."
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => removeTask(index)}
                        className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {tasks.length < 100 && (
                  <button
                    type="button"
                    onClick={addTask}
                    className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-gray-500 hover:text-primary hover:border-primary/50 transition-all duration-200 font-medium"
                  >
                    + Add Task
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Final URL ── */}
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">🔗 Final Redirect URL</h2>
                <p className="text-sm text-gray-500">Redirect users after completing the campaign</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={finalUrlEnabled}
                  onChange={(e) => setFinalUrlEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:bg-primary transition-all duration-200"></div>
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 peer-checked:translate-x-5"></span>
              </label>
            </div>

            {finalUrlEnabled && (
              <div className="mt-4 animate-slideDown">
                <label className="block text-sm font-medium text-gray-700 mb-1">Redirect URL</label>
                <input
                  type="url"
                  value={finalUrl}
                  onChange={(e) => setFinalUrl(e.target.value)}
                  placeholder="https://your-site.com/thank-you"
                  className="w-full border border-border rounded-xl px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                />
                <p className="text-xs text-gray-400 mt-1">Optional: Users will be redirected here after completion</p>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating Campaign...
              </span>
            ) : (
              'Create Campaign 🚀'
            )}
          </button>
        </form>
      </main>

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
      `}</style>
    </>
  );
}