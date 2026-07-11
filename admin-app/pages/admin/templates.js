// pages/admin/templates.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../components/Auth';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

export default function AdminTemplates() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    title: '', slug: '', description: '', image: '',
    category: '', platform: 'all', hashtags: '', isHighlight: false
  });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!isAuthenticated || !user?.isAdmin)) router.push('/login');
  }, [loading, isAuthenticated, user]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/templates`);
      const data = await res.json();
      if (data.success) setTemplates(data.templates);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (user?.isAdmin) fetchTemplates();
  }, [user]);

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
    setEditingId(null);
    setShowForm(false);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    try {
      const token = await user.getIdToken();
      const payload = { ...form, hashtags: form.hashtags.split(',').map(t => t.trim()).filter(Boolean) };
      const url = editingId ? `${API_BASE}/templates/${editingId}` : `${API_BASE}/templates`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(editingId ? '✅ Template updated!' : '✅ Template created!');
        fetchTemplates();
        resetForm();
      } else {
        setMessage(data.error || 'Failed');
      }
    } catch (err) {
      setMessage('Network error');
    }
    setIsSubmitting(false);
  };

  const handleEdit = (t) => {
    setForm({ ...t, hashtags: t.hashtags?.join(', ') || '' });
    setEditingId(t.id);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Archive this template?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✅ Template archived');
        fetchTemplates();
      }
    } catch (err) {
      setMessage('Failed to archive');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📁 Templates</h1>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          {showForm ? 'Cancel' : '+ Add Template'}
        </button>
      </div>

      {message && <div className="mb-4 p-3 bg-gray-100 rounded-lg">{message}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow mb-6 border">
          <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit' : 'Create'} Template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="title" placeholder="Title *" value={form.title} onChange={handleChange} onBlur={generateSlug} className="border p-2 rounded" required />
            <input name="slug" placeholder="Slug *" value={form.slug} onChange={handleChange} className="border p-2 rounded" required />
            <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} className="border p-2 rounded col-span-2" rows="2" />
            <input name="image" placeholder="Image URL" value={form.image} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <select name="category" value={form.category} onChange={handleChange} className="border p-2 rounded">
              <option value="">Category</option>
              <option value="giveaway">Giveaway</option>
              <option value="contest">Contest</option>
              <option value="challenge">Challenge</option>
              <option value="growth">Growth</option>
              <option value="other">Other</option>
            </select>
            <select name="platform" value={form.platform} onChange={handleChange} className="border p-2 rounded">
              <option value="all">All Platforms</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
            </select>
            <input name="hashtags" placeholder="Hashtags (comma separated)" value={form.hashtags} onChange={handleChange} className="border p-2 rounded col-span-2" />
            <label className="flex items-center gap-2 col-span-2">
              <input type="checkbox" name="isHighlight" checked={form.isHighlight} onChange={handleChange} className="w-4 h-4" />
              Highlight this template
            </label>
          </div>
          <button type="submit" disabled={isSubmitting} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <div key={t.id} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition">
            <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden">
              {t.image ? <img src={t.image} alt={t.title} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-4xl">🎨</div>}
            </div>
            <div className="flex justify-between items-start">
              <h3 className="font-semibold">{t.title}</h3>
              {t.isHighlight && <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded-full">⭐</span>}
            </div>
            <p className="text-sm text-gray-500 font-mono">/{t.slug}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {t.category && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{t.category}</span>}
              {t.platform && t.platform !== 'all' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t.platform}</span>}
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">👥 {t.usageCount || 0}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => handleEdit(t)} className="flex-1 px-3 py-1 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Edit</button>
              <button onClick={() => handleDelete(t.id)} className="flex-1 px-3 py-1 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">Archive</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}