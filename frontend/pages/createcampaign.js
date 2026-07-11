// pages/createcampaign.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, auth } from '../components/AuthScreen';  // 👈 import auth
import Meta from '../components/Meta';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function CreateCampaign() {
  const router = useRouter();
  const { slug } = router.query;
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // ===== STATE =====
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [campaignUrl, setCampaignUrl] = useState('');

  // ===== FORM STATE =====
  const [shareCountEnabled, setShareCountEnabled] = useState(false);
  const [shareCount, setShareCount] = useState(10);

  const [tasksEnabled, setTasksEnabled] = useState(false);
  const [tasks, setTasks] = useState([{ text: '', url: '' }]);

  const [finalUrlEnabled, setFinalUrlEnabled] = useState(false);
  const [finalUrl, setFinalUrl] = useState('');

  // ===== FETCH TEMPLATE =====
  useEffect(() => {
    if (slug) {
      fetchTemplate();
    }
  }, [slug]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?returnTo=' + encodeURIComponent(router.asPath));
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/templates/slug/${slug}`);
      if (!res.ok) throw new Error('Template not found');
      const data = await res.json();
      if (data.success) {
        setTemplate(data.template);
      } else {
        setError('Template not found');
      }
    } catch (err) {
      setError('Failed to load template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ===== TASK HANDLERS =====
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

  // ===== VALIDATION =====
  const validateForm = () => {
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

  // ===== SUBMIT – FIXED: use auth.currentUser =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // ✅ Get the Firebase user directly from `auth`
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setMessage('❌ You must be logged in to create a campaign.');
        setIsSubmitting(false);
        return;
      }

      const token = await firebaseUser.getIdToken();

      const payload = {
        templateId: template.id,
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
        const campaignId = data.campaignId;
        const url = `/${slug}?id=${campaignId}`;
        setCampaignUrl(url);
        setMessage('✅ Campaign created successfully!');
      } else {
        setMessage(data.error || 'Failed to create campaign');
      }
    } catch (err) {
      console.error('Error:', err);
      setMessage('Network error: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // ===== LOADING / ERROR =====
  if (authLoading || loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading template...</p>
        </div>
      </main>
    );
  }

  if (error || !template) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Template not found</h2>
        <p className="text-gray-500">{error || 'The template you\'re looking for doesn\'t exist.'}</p>
        <button onClick={() => router.push('/create')} className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition">
          Browse Templates
        </button>
      </main>
    );
  }

  // ===== SUCCESS =====
  if (campaignUrl) {
    return (
      <>
        <Meta title="Campaign Created!" />
        <main className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900">Campaign Created!</h2>
            <p className="text-gray-600 mt-2">Share this link with your audience:</p>
            <div className="mt-4 p-4 bg-white rounded-xl border border-green-200 flex items-center gap-3">
              <input
                type="text"
                value={`${window.location.origin}${campaignUrl}`}
                readOnly
                className="flex-1 bg-transparent outline-none text-sm font-mono"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}${campaignUrl}`);
                  setMessage('✅ Link copied!');
                  setTimeout(() => setMessage(''), 3000);
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm"
              >
                Copy
              </button>
            </div>
            {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
            <div className="mt-6 flex gap-3 justify-center">
              <button
                onClick={() => router.push(campaignUrl)}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
              >
                View Campaign
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  // ===== MAIN FORM =====
  return (
    <>
      <Meta title={`Create Campaign - ${template.title}`} />
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 transition mb-2 flex items-center gap-1">
            ← Back
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Template:</span>
            <span className="font-medium text-gray-900">{template.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Create Campaign</h1>
          <p className="text-gray-500 mt-1">Enable the features you want and customize your campaign</p>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ===== SHARE COUNT ===== */}
          <div className="bg-white p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">📢 Share Count</h2>
                <p className="text-sm text-gray-500">Require users to share your campaign</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareCountEnabled}
                  onChange={(e) => setShareCountEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:bg-primary transition"></div>
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></span>
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
                  className="w-full max-w-xs border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-gray-400 mt-1">Enter a whole number between 1 and 9999</p>
              </div>
            )}
          </div>

          {/* ===== TASKS ===== */}
          <div className="bg-white p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">📋 Tasks</h2>
                <p className="text-sm text-gray-500">Add tasks users must complete</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={tasksEnabled}
                  onChange={(e) => setTasksEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:bg-primary transition"></div>
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></span>
              </label>
            </div>

            {tasksEnabled && (
              <div className="mt-4 space-y-4 animate-slideDown">
                <p className="text-sm text-gray-500">Add up to 100 tasks</p>
                {tasks.map((task, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg border border-border">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Task {index + 1} Text</label>
                      <input
                        value={task.text}
                        onChange={(e) => updateTask(index, 'text', e.target.value)}
                        placeholder="e.g., Follow @username"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => removeTask(index)}
                        className="px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
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
                    className="w-full py-2 border-2 border-dashed border-border rounded-lg text-sm text-gray-500 hover:text-primary hover:border-primary/50 transition"
                  >
                    + Add Task
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ===== FINAL URL ===== */}
          <div className="bg-white p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">🔗 Final Redirect URL</h2>
                <p className="text-sm text-gray-500">Redirect users after completing the campaign</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={finalUrlEnabled}
                  onChange={(e) => setFinalUrlEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:bg-primary transition"></div>
                <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></span>
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
                  className="w-full border border-border rounded-lg px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-gray-400 mt-1">Optional: Users will be redirected here after completion</p>
              </div>
            )}
          </div>

          {/* ===== SUBMIT ===== */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating Campaign...' : 'Create Campaign 🚀'}
          </button>
        </form>
      </main>

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </>
  );
}