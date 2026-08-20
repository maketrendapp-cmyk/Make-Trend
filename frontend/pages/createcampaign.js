// pages/createcampaign.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useAuth } from '../components/AuthScreen';
import { useQueryClient } from '@tanstack/react-query';
import { useTemplates, useInvalidateQueries } from '../lib/queries';
import { auth } from '../services/firebase';
import Meta from '../components/Meta';
import toast from 'react-hot-toast';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

// ── Updated Task Types (removed specified items) ──
const TASK_TYPES = [
  { value: 'sub_like_video', label: 'Subscribe & Like video' },
  { value: 'sub_turnonbell', label: 'Subscribe & Turn on Bell' },
  { value: 'youtube_like', label: 'YouTube Like' },
  { value: 'instagram_followers', label: 'Instagram Followers' },
  { value: 'instagram_post_like', label: 'Instagram Post Like' },
  { value: 'facebook_followers', label: 'Facebook Followers' },
  { value: 'telegram_member', label: 'Telegram Member' },
  { value: 'youtube_like_comment', label: 'YouTube Video Like & Comment' },
  { value: 'whatsapp_channel_join', label: 'WhatsApp Channel Join' },
  { value: 'tiktok_follow', label: 'TikTok Follow' },
  { value: 'tiktok_like_video', label: 'TikTok Like Video' },
  { value: 'join_discord', label: 'Join Discord' },
  { value: 'like_facebook_post', label: 'Like Facebook Post' },
  { value: 'follow_twitter', label: 'Follow on Twitter' },
];

// ── Custom Dropdown Component ──
const CustomSelect = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200 hover:border-purple-300"
      >
        <span className="truncate">{selectedLabel}</span>
        <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors duration-150 ${
                  isSelected
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="truncate pr-2">{option.label}</span>
                {isSelected && <FiCheck className="w-4 h-4 text-purple-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function CreateCampaign() {
  const router = useRouter();
  const { slug } = router.query;
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { data: templates = [], isLoading: templatesLoading } = useTemplates();
  const { invalidateCampaigns, invalidateStats } = useInvalidateQueries();

  // ── State ──
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // ── Form State ──
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [campaignReward, setCampaignReward] = useState('');
  const [campaignImage, setCampaignImage] = useState('');

  const [shareCountEnabled, setShareCountEnabled] = useState(false);
  const [shareCount, setShareCount] = useState(10);

  const [tasksEnabled, setTasksEnabled] = useState(false);
  const [tasks, setTasks] = useState([{ text: '', url: '', type: '' }]);

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
        setCampaignTitle(found.title || '');
        setCampaignDescription(found.description || '');
        setCampaignReward(found.reward || 'Exclusive Reward');
        setCampaignImage(found.image || '');
        setError('');
        loadSavedForm();
        setLoading(false);
      } else {
        setError('Template not found');
        setLoading(false);
      }
    } else if (!slug) {
      setLoading(false);
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
        if (parsed.image !== undefined) setCampaignImage(parsed.image);
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

  // ── Save form to localStorage ──
  useEffect(() => {
    if (!template) return;
    const formData = {
      title: campaignTitle,
      description: campaignDescription,
      reward: campaignReward,
      image: campaignImage,
      shareCountEnabled,
      shareCount,
      tasksEnabled,
      tasks,
      finalUrlEnabled,
      finalUrl,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(formData));
    } catch (e) {}
  }, [
    campaignTitle,
    campaignDescription,
    campaignReward,
    campaignImage,
    shareCountEnabled,
    shareCount,
    tasksEnabled,
    tasks,
    finalUrlEnabled,
    finalUrl,
    template,
    storageKey,
  ]);

  // ── Image Upload Handler ──
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewImage(objectUrl);

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      e.target.value = '';
      setPreviewImage(null);
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Only JPEG, PNG, WEBP, and GIF are allowed');
      e.target.value = '';
      setPreviewImage(null);
      return;
    }

    setUploadingImage(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`${API_BASE}/upload?folder=campaigns`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setCampaignImage(data.url);
        toast.success('Image uploaded successfully');
      } else {
        toast.error(data.error || 'Upload failed');
        setPreviewImage(null);
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image');
      setPreviewImage(null);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const removeImage = () => {
    setCampaignImage('');
    setPreviewImage(null);
  };

  // ── Task Helpers ──
  const getTaskTextFromType = (type) => {
    const found = TASK_TYPES.find(t => t.value === type);
    return found ? found.label : '';
  };

  const handleTaskTypeChange = (index, value) => {
    const updated = [...tasks];
    updated[index].type = value;
    updated[index].text = getTaskTextFromType(value);
    setTasks(updated);
  };

  const addTask = () => {
    if (tasks.length >= 100) {
      setMessage('Maximum 100 tasks allowed');
      return;
    }
    setTasks([...tasks, { text: '', url: '', type: '' }]);
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
        image: campaignImage || undefined,
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
        localStorage.removeItem(storageKey);
        invalidateCampaigns().catch(() => {});
        invalidateStats().catch(() => {});
        queryClient.resetQueries({ queryKey: ['campaigns'] });
        router.push(`/campaign-created?id=${data.campaignId}`);
      } else {
        setMessage(data.error || 'Failed to create campaign');
      }
    } catch (err) {
      console.error('Error:', err);
      setMessage('Network error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Redirect unauthenticated users ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated && slug) {
      const redirect = `/createcampaign?slug=${slug}`;
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [authLoading, isAuthenticated, slug]);

  // ── No slug page ──
  if (!slug && !authLoading) {
    return (
      <>
        <Meta title="Create a Campaign – Select a Template" />
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-50 via-white to-purple-50/20">
          <div className="max-w-md w-full text-center">
            <div className="text-6xl mb-6">📋</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Select a Template</h1>
            <p className="text-gray-500 text-sm mb-6">
              You need to choose a template before creating a campaign. Browse our collection and pick the one that fits your goal.
            </p>
            <button
              onClick={() => router.push('/create')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200 shadow-md"
            >
              <span>✨</span> Browse Templates
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!authLoading && !isAuthenticated && slug) return null;

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

  if (loading || templatesLoading) {
    return (
      <>
        <Meta title="Create Campaign" />
        <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-pulse">
          {/* skeleton – same as before */}
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
      <Meta
        title={`Create Campaign – ${template?.title || 'Untitled'}`}
        description={`Start your ${template?.title || 'campaign'} using this template. Customize and launch your campaign in minutes.`}
      />
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => router.back()}
          className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-all duration-200 mb-4 px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </button>

        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-2">
          <span>Template:</span>
          <span className="font-mono font-medium text-gray-800 bg-gray-100 px-2.5 py-0.5 rounded-md">{slug}</span>
          {template?.category && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{template.category}</span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mt-1">Create Campaign</h1>
        <p className="text-gray-500 mt-1 text-sm">Enable the features you want and customize your campaign</p>

        {message && (
          <div className={`mt-6 p-4 rounded-xl ${
            message.includes('✅')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          } animate-[fadeIn_0.3s_ease-out]`}>
            {message}
          </div>
        )}

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

              {/* Image Upload with 16:9 Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🖼️ Campaign Image</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition disabled:opacity-50"
                  />
                  {campaignImage && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {uploadingImage && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <svg className="animate-spin h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading...
                  </p>
                )}
                {(previewImage || campaignImage) && (
                  <div className="mt-2 relative w-full max-w-md aspect-[16/9] rounded-xl overflow-hidden border border-border bg-gray-100">
                    <Image
                      src={previewImage || campaignImage}
                      alt="Campaign preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">Upload a custom image (max 5MB, 16:9 recommended). Leave empty to use the template image.</p>
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
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-border">
                    {/* Task Type */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Task Type</label>
                      <CustomSelect
                        value={task.type || ''}
                        onChange={(val) => handleTaskTypeChange(index, val)}
                        options={TASK_TYPES}
                        placeholder="Select type"
                      />
                    </div>
                    {/* Task Text */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Task Text</label>
                      <input
                        value={task.text}
                        onChange={(e) => updateTask(index, 'text', e.target.value)}
                        placeholder="Task description"
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                        maxLength="250"
                      />
                      <p className="text-xs text-gray-400 mt-1">{task.text.length}/250</p>
                    </div>
                    {/* Task URL */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Task URL</label>
                      <input
                        value={task.url}
                        onChange={(e) => updateTask(index, 'url', e.target.value)}
                        placeholder="https://..."
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                      />
                    </div>
                    {/* Remove button */}
                    <div className="flex items-end justify-end lg:justify-center">
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