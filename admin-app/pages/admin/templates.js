// pages/admin/templates.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth, auth } from '../../components/Auth'; // 👈 import auth

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com';
const API_BASE = BACKEND_URL + '/api';

export default function AdminTemplates() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    title: '', slug: '', description: '', image: '',
    category: '', platform: 'all', hashtags: '', isHighlight: false
  });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !user?.isAdmin)) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, user, router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const generateSlug = () => {
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setForm(prev => ({ ...prev, slug }));
  };

  const resetForm = () => {
    setForm({ title: '', slug: '', description: '', image: '', category: '', platform: 'all', hashtags: '', isHighlight: false });
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      // ✅ Use auth.currentUser to get the token
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setMessage('❌ Not authenticated. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      const token = await firebaseUser.getIdToken();
      const payload = { 
        ...form, 
        hashtags: form.hashtags.split(',').map(t => t.trim()).filter(Boolean) 
      };

      const res = await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage('✅ Template created successfully!');
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

  if (loading || !user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">📁 Create Template</h1>
      <p className="text-gray-500 mb-6">Add a new template to the gallery</p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input
              name="slug"
              value={form.slug}
              onChange={handleChange}
              placeholder="tiktok-booster-free"
              className="w-full border p-2 rounded-lg font-mono"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Get free TikTok followers, views & likes instantly"
              rows="2"
              className="w-full border p-2 rounded-lg"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
            <input
              name="image"
              value={form.image}
              onChange={handleChange}
              placeholder="https://cloudinary.com/your-image.jpg"
              className="w-full border p-2 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border p-2 rounded-lg"
            >
              <option value="">Select category</option>
              <option value="giveaway">Giveaway</option>
              <option value="contest">Contest</option>
              <option value="challenge">Challenge</option>
              <option value="growth">Growth</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
            <select
              name="platform"
              value={form.platform}
              onChange={handleChange}
              className="w-full border p-2 rounded-lg"
            >
              <option value="all">All Platforms</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags (comma separated)</label>
            <input
              name="hashtags"
              value={form.hashtags}
              onChange={handleChange}
              placeholder="#tiktok, #freefollowers, #viral"
              className="w-full border p-2 rounded-lg"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              name="isHighlight"
              checked={form.isHighlight}
              onChange={handleChange}
              className="w-4 h-4"
            />
            <label className="text-sm font-medium text-gray-700">Highlight this template (featured)</label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Template'}
        </button>
      </form>

      <div className="mt-4 text-center text-xs text-gray-400">
        Only admins can create templates. Make sure you're logged in with an admin account.
      </div>
    </div>
  );
}