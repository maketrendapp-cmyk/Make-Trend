// pages/groweachother/my-tasks.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import { getToken } from '../../lib/api';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiLoader,
  FiRefreshCw,
  FiLink,
  FiCompass,
  FiRepeat,
  FiExternalLink,
} from 'react-icons/fi';
import {
  FaYoutube,
  FaInstagram,
  FaTwitter,
  FaFacebook,
  FaTiktok,
  FaTwitch,
  FaLinkedin,
  FaGithub,
} from 'react-icons/fa';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

const PLATFORM_ICONS = {
  youtube: FaYoutube,
  instagram: FaInstagram,
  twitter: FaTwitter,
  facebook: FaFacebook,
  tiktok: FaTiktok,
  twitch: FaTwitch,
  linkedin: FaLinkedin,
  github: FaGithub,
};

const PLATFORM_COLORS = {
  youtube: 'text-red-600 bg-red-50 border-red-100',
  instagram: 'text-pink-600 bg-pink-50 border-pink-100',
  twitter: 'text-blue-400 bg-blue-50 border-blue-100',
  facebook: 'text-blue-700 bg-blue-50 border-blue-100',
  tiktok: 'text-black bg-gray-100 border-gray-200',
  twitch: 'text-purple-600 bg-purple-50 border-purple-100',
  linkedin: 'text-blue-600 bg-blue-50 border-blue-100',
  github: 'text-gray-800 bg-gray-50 border-gray-200',
};

const PLATFORMS = ['YouTube', 'Instagram', 'Twitter', 'Facebook', 'TikTok', 'Twitch', 'LinkedIn', 'GitHub'];
const TASK_TYPES = ['Subscribe', 'Follow', 'Like', 'Comment', 'Share', 'Watch', 'View'];

export default function MyTasks() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Modal state ──
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    platform: '',
    url: '',
    taskType: '',
    title: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // ── Fetch tasks ──
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/social-tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load tasks');
      setTasks(data.tasks || []);
      setError('');
    } catch (err) {
      console.error('Fetch tasks error:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchTasks();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // ── Open modal for create/edit ──
  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({ platform: '', url: '', taskType: '', title: '' });
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormData({
      platform: task.platform || '',
      url: task.url || '',
      taskType: task.taskType || '',
      title: task.title || '',
    });
    setModalError('');
    setShowModal(true);
  };

  // ── Submit task ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    const { platform, url, taskType, title } = formData;
    if (!platform || !url || !taskType) {
      setModalError('Platform, URL, and Task Type are required.');
      setSubmitting(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        setModalError('Not authenticated');
        setSubmitting(false);
        return;
      }

      const payload = { platform, url, taskType, title: title || '' };

      let res;
      if (editingTask) {
        res = await fetch(`${API_BASE}/social-tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/social-tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save task');

      setShowModal(false);
      fetchTasks();
    } catch (err) {
      console.error('Save task error:', err);
      setModalError(err.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete task ──
  const handleDelete = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/social-tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete task');
      fetchTasks();
    } catch (err) {
      console.error('Delete task error:', err);
      setError(err.message || 'Failed to delete task');
    }
  };

  // ── Toggle active status ──
  const handleToggleActive = async (task) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/social-tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: !task.active }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to update task');
      fetchTasks();
    } catch (err) {
      console.error('Toggle active error:', err);
      setError(err.message || 'Failed to update task');
    }
  };

  const getPlatformIcon = (platform) => {
    const Icon = PLATFORM_ICONS[platform?.toLowerCase()] || FiLink;
    return Icon;
  };

  const getPlatformStyle = (platform) => {
    return PLATFORM_COLORS[platform?.toLowerCase()] || 'text-purple-600 bg-purple-50 border-purple-100';
  };

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="My Tasks | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiPlus className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>
            <p className="text-gray-500 mt-2 text-sm">Sign in to create and manage your social tasks.</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition w-full shadow-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Meta title="My Tasks | Make Trend" />
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="flex items-center justify-between mb-6">
              <div className="h-8 w-32 bg-gray-200 rounded" />
              <div className="h-10 w-28 bg-gray-200 rounded-xl" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-48 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Meta title="My Tasks | Make Trend" description="Manage your social tasks for Grow Together." />
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50 via-gray-50 to-white py-6 px-4">
        <div className="max-w-3xl mx-auto">
          
          {/* ── Navigation Quick Links ── */}
          <div className="flex items-center justify-between gap-2 mb-6 bg-white/80 backdrop-blur-xl p-3 rounded-2xl border border-gray-200/60 shadow-sm overflow-x-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/groweachother/grow-feed')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-bold text-xs sm:text-sm transition-all border border-purple-100 whitespace-nowrap"
              >
                <FiCompass className="w-4 h-4" /> Go to Feed
              </button>
              <button
                onClick={() => router.push('/groweachother/my-exchanges')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs sm:text-sm transition-all border border-indigo-100 whitespace-nowrap"
              >
                <FiRepeat className="w-4 h-4" /> View Exchanges
              </button>
            </div>
            <button
              onClick={fetchTasks}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm text-gray-500 hover:text-gray-900 transition-colors"
              title="Refresh Tasks"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-gray-200/60 shadow-sm">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <FiPlus className="w-5 h-5" />
                </div>
                My Social Tasks
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-1">Manage what tasks you want other members to complete</p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-2xl hover:shadow-lg transition-all active:scale-95 shadow-md whitespace-nowrap"
            >
              <FiPlus className="w-5 h-5" />
              Add New Task
            </button>
          </div>

          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-semibold shadow-sm">
              {error}
            </div>
          )}

          {/* ── Tasks List ── */}
          {tasks.length === 0 ? (
            <div className="text-center py-20 bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-200/60 px-4">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📋</div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">No tasks created yet</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto font-medium">Create your first social task to start receiving engagement from the community!</p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition text-sm shadow-sm"
              >
                <FiPlus className="w-4 h-4" />
                Create First Task
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const Icon = getPlatformIcon(task.platform);
                const styleClass = getPlatformStyle(task.platform);
                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-3xl shadow-sm border p-5 transition-all duration-300 hover:shadow-md ${
                      task.active ? 'border-gray-200/60' : 'border-gray-200 bg-gray-50/60 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Left Details */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-sm ${styleClass}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-extrabold text-gray-900 text-base">
                              {task.platform || 'Unknown'}
                            </span>
                            <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full">
                              {task.taskType || 'Task'}
                            </span>
                            {!task.active && (
                              <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2.5 py-0.5 rounded-full">
                                Paused
                              </span>
                            )}
                          </div>

                          {task.title && (
                            <p className="text-sm font-semibold text-gray-700 truncate mb-1">{task.title}</p>
                          )}

                          <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline truncate max-w-full"
                          >
                            <FiExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{task.url}</span>
                          </a>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center justify-end gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <button
                          onClick={() => handleToggleActive(task)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                            task.active
                              ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {task.active ? 'Active' : 'Activate'}
                        </button>
                        <button
                          onClick={() => openEditModal(task)}
                          className="p-2.5 bg-gray-50 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition border border-gray-200/60 shadow-sm"
                          title="Edit Task"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="p-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition border border-red-200/60 shadow-sm"
                          title="Delete Task"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Create/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-gray-900">
                {editingTask ? 'Edit Social Task' : 'Add New Social Task'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Platform */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Platform <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition cursor-pointer"
                  required
                >
                  <option value="">Select platform</option>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Target URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition"
                  placeholder="https://youtube.com/@channel"
                  required
                />
              </div>

              {/* Task Type */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Task Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.taskType}
                  onChange={(e) => setFormData({ ...formData, taskType: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition cursor-pointer"
                  required
                >
                  <option value="">Select task type</option>
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                  Custom Label / Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition"
                  placeholder="e.g. My Gaming Channel"
                  maxLength={100}
                />
                <p className="mt-1 text-[11px] text-gray-400 font-medium text-right">{formData.title.length}/100 characters</p>
              </div>

              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold shadow-sm">
                  {modalError}
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <FiLoader className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-5 h-5" />
                      {editingTask ? 'Update Task' : 'Create Task'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

