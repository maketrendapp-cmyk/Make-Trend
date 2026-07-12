// pages/createcampaign.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthScreen';
import { auth } from '../services/firebase';
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

  // ===== SUBMIT =====
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
        // ✅ CLEAN URL: /[slug]/[campaignId]
        const url = `/${slug}/${campaignId}`;
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

  // ===== ERROR =====
  if (error || !template) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Template not found</h2>
        <p className="text-gray-500">{error || 'The template you\'re looking for doesn\'t exist.'}</p>
        <button
          onClick={() => router.push('/create')}
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          Browse Templates
        </button>
      </main>
    );
  }

  // ===== SUCCESS =====
  if (campaignUrl) {
    const fullUrl = `${window.location.origin}${campaignUrl}`;
    return (
      <>
        <Meta title="Campaign Created!" />
        <main className="max-w-2xl mx-auto px-4 py-16">
          <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-8 md:p-10 text-center shadow-xl">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-green-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              {/* Success Icon with animation */}
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center shadow-lg shadow-green-200/50 animate-[popIn_0.6s_ease-out]">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>

              <h2 className="text-3xl font-bold text-gray-900">🎉 Campaign Created!</h2>
              <p className="text-gray-600 mt-2">Your campaign is ready to share with the world.</p>

              {/* URL Box */}
              <div className="mt-6 p-4 bg-white rounded-2xl border border-green-200 shadow-sm flex items-center gap-3 transition-all hover:shadow-md">
                <input
                  type="text"
                  value={fullUrl}
                  readOnly
                  className="flex-1 bg-transparent outline-none text-sm font-mono text-gray-700 truncate"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(fullUrl);
                    setMessage('✅ Link copied!');
                    setTimeout(() => setMessage(''), 3000);
                  }}
                  className="flex-shrink-0 px-4 py-2 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 text-sm shadow-sm hover:shadow-md"
                >
                  Copy
                </button>
              </div>
              {message && <p className="mt-2 text-sm text-green-600">{message}</p>}

              {/* Template info */}
              <div className="mt-4 text-xs text-gray-400">
                Template: <span className="font-mono font-medium text-gray-600">{slug}</span>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => router.push(campaignUrl)}
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  👁️ View Campaign
                </button>
                <button
                  onClick={() => router.push('/stats')}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all duration-200"
                >
                  📊 View Stats
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // ===== MAIN FORM =====
  return (
    <>
      <Meta title={`Create Campaign - ${template?.title || 'Campaign'}`} />
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* ===== BACK BUTTON ===== */}
        <button
          onClick={() => router.back()}
          className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 mb-4 px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        {/* ===== TEMPLATE INFO ===== */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
          <span>Template:</span>
          <span className="font-mono font-medium text-gray-800 bg-gray-100 px-2.5 py-0.5 rounded-md">
            {slug}
          </span>
          {template?.category && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {template.category}
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mt-1">Create Campaign</h1>
        <p className="text-gray-500 mt-1 text-sm">Enable the features you want and customize your campaign</p>

        {/* ===== MESSAGE ===== */}
        {message && (
          <div className={`mt-6 p-4 rounded-xl ${
            message.includes('✅')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          } animate-[fadeIn_0.3s_ease-out]`}>
            {message}
          </div>
        )}

        {/* ===== FORM ===== */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Share Count */}
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

          {/* Tasks */}
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

          {/* Final URL */}
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
        @keyframes popIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .animate-popIn { animation: popIn 0.6s ease-out; }
      `}</style>
    </>
  );
}