// pages/admin/templates.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, auth } from '../../components/Auth';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function AdminTemplates() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Form state – all fields editable as text (except plan & isHighlight)
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    image: '',
    category: '',        // text input – you can type anything
    platform: '',        // text input – you can type anything
    hashtags: '',        // comma‑separated text
    isHighlight: false,
    plan: 'free',        // dropdown: free, pro
  });

  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!isAuthenticated || !user?.isAdmin)) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, user, router]);

  // Fetch templates list
  const fetchTemplates = async () => {
    setDataLoading(true);
    try {
      const res = await fetch(`${API_BASE}/templates`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) setTemplates(data.templates);
    } catch (e) {
      console.error('Fetch error:', e);
      setMessage('Failed to load templates: ' + e.message);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) fetchTemplates();
  }, [user]);

  // Form handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const generateSlug = () => {
    const slug = form.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setForm(prev => ({ ...prev, slug }));
  };

  const resetForm = () => {
    setForm({
      title: '',
      slug: '',
      description: '',
      image: '',
      category: '',
      platform: '',
      hashtags: '',
      isHighlight: false,
      plan: 'free',
    });
    setEditingId(null);
    setShowForm(false);
    setMessage('');
  };

  // Submit create or update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setMessage('❌ Not authenticated. Please log in again.');
        setIsSubmitting(false);
        return;
      }
      const token = await firebaseUser.getIdToken();

      // Build payload – convert hashtags to array
      const payload = {
        ...form,
        hashtags: form.hashtags.split(',').map(t => t.trim()).filter(Boolean),
      };

      const url = editingId
        ? `${API_BASE}/templates/${editingId}`
        : `${API_BASE}/templates`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage(editingId ? '✅ Template updated!' : '✅ Template created!');
        fetchTemplates();
        resetForm();
      } else {
        setMessage(data.error || `Server error (${res.status})`);
      }
    } catch (err) {
      console.error('Network error:', err);
      setMessage('Network error: ' + err.message);
    }
    setIsSubmitting(false);
  };

  // Edit handler – fill form with template data
  const handleEdit = (t) => {
    setForm({
      title: t.title || '',
      slug: t.slug || '',
      description: t.description || '',
      image: t.image || '',
      category: t.category || '',
      platform: t.platform || '',
      hashtags: (t.hashtags || []).join(', '),
      isHighlight: t.isHighlight || false,
      plan: t.plan || 'free',
    });
    setEditingId(t.id);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  // Delete (archive) template
  const handleDelete = async (id) => {
    if (!confirm('Archive this template?')) return;
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE}/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✅ Archived');
        fetchTemplates();
      } else {
        setMessage(data.error || 'Failed to archive');
      }
    } catch (err) {
      setMessage('Failed to archive: ' + err.message);
    }
  };

  // Loading state
  if (loading || !user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">📁 Templates</h1>
          <p className="text-gray-500 text-sm">
            {dataLoading ? 'Loading...' : `${templates.length} templates found`}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? 'Cancel' : '+ Add Template'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            message.includes('✅')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message}
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow border mb-8"
        >
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Template' : 'Create New Template'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                onBlur={generateSlug}
                placeholder="TikTok Booster Free"
                className="w-full border p-2 rounded-lg"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug *
              </label>
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="tiktok-booster-free"
                className="w-full border p-2 rounded-lg font-mono"
                required
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Get free TikTok followers, views & likes instantly"
                rows="2"
                className="w-full border p-2 rounded-lg"
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image URL
              </label>
              <input
                name="image"
                value={form.image}
                onChange={handleChange}
                placeholder="https://cloudinary.com/your-image.jpg"
                className="w-full border p-2 rounded-lg"
              />
            </div>

            {/* Category – text input (free typing) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="e.g., giveaway, growth, contest"
                className="w-full border p-2 rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1">
                Type any category (no dropdown)
              </p>
            </div>

            {/* Platform – text input (free typing) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Platform
              </label>
              <input
                name="platform"
                value={form.platform}
                onChange={handleChange}
                placeholder="e.g., tiktok, instagram, youtube"
                className="w-full border p-2 rounded-lg"
              />
              <p className="text-xs text-gray-400 mt-1">
                Type any platform (no dropdown)
              </p>
            </div>

            {/* Hashtags */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hashtags (comma separated)
              </label>
              <input
                name="hashtags"
                value={form.hashtags}
                onChange={handleChange}
                placeholder="#tiktok, #freefollowers, #viral"
                className="w-full border p-2 rounded-lg"
              />
            </div>

            {/* Plan (dropdown) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan
              </label>
              <select
                name="plan"
                value={form.plan}
                onChange={handleChange}
                className="w-full border p-2 rounded-lg"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Free = all users, Pro = only paid users
              </p>
            </div>

            {/* Highlight checkbox */}
            <div className="flex items-center gap-2 self-end pb-1">
              <input
                type="checkbox"
                name="isHighlight"
                checked={form.isHighlight}
                onChange={handleChange}
                className="w-4 h-4"
              />
              <label className="text-sm font-medium text-gray-700">
                Highlight this template (featured)
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting
                ? 'Saving...'
                : editingId
                ? 'Update Template'
                : 'Create Template'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Template List */}
      {dataLoading && <div className="text-center py-4">Loading templates...</div>}

      {!dataLoading && templates.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-border">
          <p className="text-gray-500">No templates created yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <div
            key={t.id}
            className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden">
              {t.image ? (
                <img
                  src={t.image}
                  alt={t.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="h-full flex items-center justify-center text-4xl text-gray-300">
                  🎨
                </div>
              )}
            </div>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{t.title}</h3>
              {t.isHighlight && (
                <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded-full">
                  ⭐
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 font-mono">/{t.slug}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {t.category && (
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                  {t.category}
                </span>
              )}
              {t.platform && t.platform !== 'all' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {t.platform}
                </span>
              )}
              {t.plan && t.plan !== 'free' && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                  {t.plan.toUpperCase()}
                </span>
              )}
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                👥 {t.usageCount || 0}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => handleEdit(t)}
                className="flex-1 px-3 py-1 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                className="flex-1 px-3 py-1 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100"
              >
                Archive
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}