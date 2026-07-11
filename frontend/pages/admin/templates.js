// frontend/pages/admin/templates.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../components/AuthScreen';
import Meta from '../../components/Meta';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function AdminTemplates() {
  const router = useRouter();
  const { user, isAuthenticated, loading, refreshUser } = useAuth();
  
  // State
  const [templates, setTemplates] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    image: '',
    category: '',
    platform: 'all',
    hashtags: '',
    isHighlight: false,
  });

  // Redirect if not admin
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push('/');
        return;
      }
      if (user && !user.isAdmin) {
        router.push('/');
        return;
      }
    }
  }, [loading, isAuthenticated, user, router]);

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/templates`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchTemplates();
    }
  }, [user]);

  // Handle form input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Generate slug from title
  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData(prev => ({ ...prev, slug }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      description: '',
      image: '',
      category: '',
      platform: 'all',
      hashtags: '',
      isHighlight: false,
    });
    setEditingId(null);
    setShowForm(false);
    setMessage({ text: '', type: '' });
  };

  // Edit template
  const handleEdit = (template) => {
    setFormData({
      title: template.title || '',
      slug: template.slug || '',
      description: template.description || '',
      image: template.image || '',
      category: template.category || '',
      platform: template.platform || 'all',
      hashtags: template.hashtags?.join(', ') || '',
      isHighlight: template.isHighlight || false,
    });
    setEditingId(template.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete template
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to archive this template?')) return;
    
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/templates/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Template archived successfully!', type: 'success' });
        fetchTemplates();
      } else {
        setMessage({ text: data.error || 'Failed to archive template', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Network error', type: 'error' });
    }
  };

  // Submit form (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const token = await user.getIdToken();
      const payload = {
        ...formData,
        hashtags: formData.hashtags.split(',').map(t => t.trim()).filter(Boolean),
      };

      let url = `${API_BASE}/templates`;
      let method = 'POST';
      if (editingId) {
        url = `${API_BASE}/templates/${editingId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          text: editingId ? 'Template updated!' : 'Template created!',
          type: 'success'
        });
        fetchTemplates();
        resetForm();
      } else {
        setMessage({ text: data.error || 'Operation failed', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Network error', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  // Not admin – redirect
  if (!user?.isAdmin) {
    return null;
  }

  return (
    <>
      <Meta title="Admin - Template Manager" />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📁 Template Manager</h1>
            <p className="text-gray-500 mt-1">Create, edit, and manage your templates</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition shadow-sm"
          >
            {showForm ? 'Cancel' : '+ Add Template'}
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-xl ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-border p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Template' : 'Create New Template'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  onBlur={generateSlug}
                  placeholder="TikTok Booster Free"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug * (URL identifier)
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="tiktok-booster-free"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
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
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Get free TikTok followers, views & likes instantly"
                  rows="2"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Image URL */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://cloudinary.com/your-image.jpg"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select category</option>
                  <option value="giveaway">Giveaway</option>
                  <option value="contest">Contest</option>
                  <option value="challenge">Challenge</option>
                  <option value="growth">Growth</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform
                </label>
                <select
                  name="platform"
                  value={formData.platform}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All Platforms</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>

              {/* Hashtags */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hashtags (comma separated)
                </label>
                <input
                  type="text"
                  name="hashtags"
                  value={formData.hashtags}
                  onChange={handleChange}
                  placeholder="#tiktok, #freefollowers, #viral"
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Highlight */}
              <div className="md:col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  name="isHighlight"
                  checked={formData.isHighlight}
                  onChange={handleChange}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <label className="text-sm font-medium text-gray-700">
                  Highlight this template (featured)
                </label>
              </div>

              {/* Buttons */}
              <div className="md:col-span-2 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Template List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Existing Templates ({templates.length})
          </h2>
          {templates.length === 0 ? (
            <p className="text-gray-400 text-center py-12">No templates created yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-xl shadow-sm border border-border p-4 hover:shadow-md transition"
                >
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                    {template.image ? (
                      <img src={template.image} alt={template.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">🎨</div>
                    )}
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{template.title}</h3>
                      <p className="text-xs text-gray-500 font-mono truncate">{template.slug}</p>
                    </div>
                    {template.isHighlight && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex-shrink-0">⭐</span>
                    )}
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-1">
                    {template.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{template.category}</span>
                    )}
                    {template.platform && template.platform !== 'all' && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{template.platform}</span>
                    )}
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">👥 {template.usageCount || 0}</span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}