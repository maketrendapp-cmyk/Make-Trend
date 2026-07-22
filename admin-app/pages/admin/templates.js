// pages/admin/templates.js
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth, auth } from '../../components/Auth';
import {
  FiPlus,
  FiSearch,
  FiX,
  FiEdit2,
  FiArchive,
  FiTrash2,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiTag,
  FiAward,
} from 'react-icons/fi';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function AdminTemplates() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    image: '',
    category: '',
    platform: '',
    hashtags: '',
    isHighlight: false,
    plan: 'free',
    reward: '',
  });

  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!isAuthenticated || !user?.isAdmin)) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, user, router]);

  // Fetch templates
  const fetchTemplates = async () => {
    setDataLoading(true);
    try {
      const url = showArchived ? `${API_BASE}/templates?all=true` : `${API_BASE}/templates`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
        setFilteredTemplates(data.templates);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      setMessage('Failed to load templates: ' + e.message);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) fetchTemplates();
  }, [user, showArchived]);

  // Apply search & filters
  useEffect(() => {
    let result = templates;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.slug || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }
    if (filterCategory) {
      result = result.filter(t => t.category === filterCategory);
    }
    if (filterPlatform) {
      result = result.filter(t => t.platform === filterPlatform);
    }
    if (filterPlan) {
      result = result.filter(t => t.plan === filterPlan);
    }
    // If not showing archived, filter out inactive
    if (!showArchived) {
      result = result.filter(t => t.isActive !== false);
    }
    setFilteredTemplates(result);
  }, [templates, searchQuery, filterCategory, filterPlatform, filterPlan, showArchived]);

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
      reward: '',
    });
    setEditingId(null);
    setShowForm(false);
    setMessage('');
  };

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
      reward: t.reward || '',
    });
    setEditingId(t.id);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  // ── ARCHIVE (soft delete) ──
  const handleArchive = async (id) => {
    if (!confirm('Archive this template? It will be hidden from users.')) return;
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
        setMessage('✅ Template archived.');
        fetchTemplates();
      } else {
        setMessage(data.error || 'Failed to archive');
      }
    } catch (err) {
      setMessage('Failed to archive: ' + err.message);
    }
  };

  // ── RESTORE ──
  const handleRestore = async (id) => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE}/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: true }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✅ Template restored.');
        fetchTemplates();
      } else {
        setMessage(data.error || 'Failed to restore');
      }
    } catch (err) {
      setMessage('Failed to restore: ' + err.message);
    }
  };

  // ── PERMANENT DELETE ──
  const handlePermanentDelete = async (id) => {
    if (!confirm('⚠️ Permanently delete this template? This cannot be undone.')) return;
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const res = await fetch(`${API_BASE}/templates/${id}/permanent`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✅ Template permanently deleted.');
        fetchTemplates();
      } else {
        setMessage(data.error || 'Failed to delete');
      }
    } catch (err) {
      setMessage('Failed to delete: ' + err.message);
    }
  };

  // Extract unique categories, platforms, plans for filters
  const categories = useMemo(() => {
    const set = new Set();
    templates.forEach(t => { if (t.category) set.add(t.category); });
    return Array.from(set);
  }, [templates]);

  const platforms = useMemo(() => {
    const set = new Set();
    templates.forEach(t => { if (t.platform) set.add(t.platform); });
    return Array.from(set);
  }, [templates]);

  const plans = useMemo(() => {
    const set = new Set();
    templates.forEach(t => { if (t.plan) set.add(t.plan); });
    return Array.from(set);
  }, [templates]);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterPlatform('');
    setFilterPlan('');
  };

  // Count archived templates
  const archivedCount = templates.filter(t => t.isActive === false).length;

  if (loading || !user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <span>📁</span> Templates
          </h1>
          <p className="text-sm text-gray-500">
            {dataLoading ? 'Loading...' : `${filteredTemplates.length} templates found`}
            {archivedCount > 0 && !showArchived && (
              <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                {archivedCount} archived
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Toggle archived */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              showArchived
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showArchived ? <FiEyeOff /> : <FiEye />}
            {showArchived ? 'Hide Archived' : `Show Archived${archivedCount > 0 ? ` (${archivedCount})` : ''}`}
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition shadow-md"
          >
            <FiPlus />
            {showForm ? 'Cancel' : 'Add Template'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            message.includes('✅')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message}
          <button onClick={() => setMessage('')} className="ml-auto text-gray-400 hover:text-gray-600">
            <FiX />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, slug, description..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
            >
              <option value="">All Platforms</option>
              {platforms.map(plat => (
                <option key={plat} value={plat}>{plat}</option>
              ))}
            </select>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
            >
              <option value="">All Plans</option>
              {plans.map(plan => (
                <option key={plan} value={plan}>{plan}</option>
              ))}
            </select>
            {(searchQuery || filterCategory || filterPlatform || filterPlan) && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                <FiX className="inline mr-1" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-8"
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            {editingId ? '✏️ Edit Template' : '✨ Create New Template'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                onBlur={generateSlug}
                placeholder="TikTok Booster Free"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
                required
              />
            </div>
            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="tiktok-booster-free"
                className="w-full border border-gray-300 p-2.5 rounded-lg font-mono focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
                required
              />
            </div>
            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Get free TikTok followers, views & likes instantly"
                rows="2"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
              />
            </div>
            {/* Image URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
              <div className="flex gap-2">
                <input
                  name="image"
                  value={form.image}
                  onChange={handleChange}
                  placeholder="https://cloudinary.com/your-image.jpg"
                  className="flex-1 border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
                />
                {form.image && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                    <img src={form.image} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
            {/* Category & Platform (free text) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="e.g., giveaway, growth"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
              <input
                name="platform"
                value={form.platform}
                onChange={handleChange}
                placeholder="e.g., tiktok, instagram"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
              />
            </div>
            {/* Reward */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reward</label>
              <input
                name="reward"
                value={form.reward}
                onChange={handleChange}
                placeholder="e.g., $10 Gift Card"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
              />
            </div>
            {/* Hashtags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags (comma separated)</label>
              <input
                name="hashtags"
                value={form.hashtags}
                onChange={handleChange}
                placeholder="#tiktok, #freefollowers"
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
              />
            </div>
            {/* Plan & Highlight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                name="plan"
                value={form.plan}
                onChange={handleChange}
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 outline-none"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div className="flex items-center gap-2 self-end pb-2">
              <input
                type="checkbox"
                name="isHighlight"
                checked={form.isHighlight}
                onChange={handleChange}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label className="text-sm font-medium text-gray-700">Highlight this template (featured)</label>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Saving...' : (editingId ? 'Update Template' : 'Create Template')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Template Grid */}
      {dataLoading && <div className="text-center py-8 text-gray-500">Loading templates...</div>}

      {!dataLoading && filteredTemplates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-500">No templates found.</p>
          {(searchQuery || filterCategory || filterPlatform || filterPlan) && (
            <button onClick={clearFilters} className="mt-2 text-purple-600 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.map((t) => {
          const isArchived = t.isActive === false;
          return (
            <div
              key={t.id}
              className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition group ${
                isArchived ? 'border-gray-300 bg-gray-50/50' : 'border-gray-200'
              }`}
            >
              <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
                {t.image ? (
                  <img
                    src={t.image}
                    alt={t.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-4xl text-gray-300">🎨</div>
                )}
                {isArchived && (
                  <span className="absolute top-2 right-2 bg-gray-700/80 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                    Archived
                  </span>
                )}
                {t.isHighlight && !isArchived && (
                  <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full shadow">
                    ⭐ Featured
                  </span>
                )}
              </div>

              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-900 truncate">{t.title}</h3>
                <span className="text-xs text-gray-400 font-mono">/{t.slug}</span>
              </div>

              {t.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{t.description}</p>
              )}

              <div className="mt-2 flex flex-wrap gap-1">
                {t.category && (
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{t.category}</span>
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
                {t.reward && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <FiAward className="w-3 h-3" /> {t.reward}
                  </span>
                )}
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  👥 {t.usageCount || 0}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  onClick={() => handleEdit(t)}
                  className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition flex items-center justify-center gap-1"
                >
                  <FiEdit2 className="w-3.5 h-3.5" /> Edit
                </button>

                {isArchived ? (
                  <>
                    <button
                      onClick={() => handleRestore(t.id)}
                      className="flex-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 transition flex items-center justify-center gap-1"
                    >
                      <FiRefreshCw className="w-3.5 h-3.5" /> Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(t.id)}
                      className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition flex items-center justify-center gap-1"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleArchive(t.id)}
                    className="flex-1 px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded-lg text-sm hover:bg-yellow-100 transition flex items-center justify-center gap-1"
                  >
                    <FiArchive className="w-3.5 h-3.5" /> Archive
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}