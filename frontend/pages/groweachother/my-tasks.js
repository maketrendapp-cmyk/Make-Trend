// pages/groweachother/my-tasks.js
import React, { useState, useEffect, useRef } from 'react';
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
  FiFilter,
  FiChevronDown,
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
import { useMyTasks, useInvalidateQueries } from '../../lib/queries';

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
  youtube: 'text-red-600',
  instagram: 'text-pink-600',
  twitter: 'text-blue-400',
  facebook: 'text-blue-700',
  tiktok: 'text-black',
  twitch: 'text-purple-600',
  linkedin: 'text-blue-600',
  github: 'text-gray-800',
};

// ── Predefined platforms ──
const PLATFORMS = ['YouTube', 'Instagram', 'Twitter', 'Facebook', 'TikTok', 'Twitch', 'LinkedIn', 'GitHub'];

// ── Task types per platform ──
const TASK_TYPES_BY_PLATFORM = {
  YouTube: ['Subscribe', 'Like', 'Comment', 'Share', 'Watch', 'View'],
  Instagram: ['Follow', 'Like', 'Comment', 'Share', 'View'],
  Facebook: ['Like', 'Follow', 'Comment', 'Share', 'Watch'],
  Twitter: ['Follow', 'Like', 'Retweet', 'Reply'],
  TikTok: ['Follow', 'Like', 'Comment', 'Share'],
  Twitch: ['Follow', 'Subscribe', 'Like', 'Watch'],
  LinkedIn: ['Follow', 'Like', 'Comment', 'Share'],
  GitHub: ['Follow', 'Star', 'Watch'],
};

const DEFAULT_TASK_TYPES = ['Follow', 'Like', 'Comment', 'Share'];

// ─── CUSTOM SELECT COMPONENT ──────────────────────────────────
const CustomSelect = ({ value, onChange, options, placeholder, disabled = false }) => {
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
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center justify-between w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200 hover:border-purple-300 ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto py-1">
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
                    : 'text-slate-700 hover:bg-slate-50'
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
// ─── END CUSTOM SELECT ────────────────────────────────────────

export default function MyTasks() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { invalidateMyTasks } = useInvalidateQueries();

  // ── Filter state ──
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('');
  const [taskTypeFilter, setTaskTypeFilter] = useState('');
  const [availableTaskTypes, setAvailableTaskTypes] = useState(DEFAULT_TASK_TYPES);

  // ── React Query: My Tasks (infinite, with filters) ──
  const filters = {
    status: statusFilter,
    platform: platformFilter || undefined,
    taskType: taskTypeFilter || undefined,
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    refetch,
    isError,
    error,
  } = useMyTasks(filters, isAuthenticated && !!user);

  // ── Flatten tasks from all pages ──
  const tasks = data?.pages?.flatMap((page) => page.tasks) || [];
  const hasMore = hasNextPage;

  // ── Intersection Observer for infinite scroll ──
  const observerRef = useRef(null);

  useEffect(() => {
    if (isFetchingNextPage || !hasMore || tasks.length === 0) return;

    const lastElement = document.querySelector('#tasks-end');
    if (!lastElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(lastElement);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isFetchingNextPage, hasMore, tasks.length, fetchNextPage]);

  // ── Modal state ──
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    platform: '',
    url: '',
    taskType: '',
    title: '',
    description: '',
  });
  const [customPlatform, setCustomPlatform] = useState('');
  const [customTaskType, setCustomTaskType] = useState('');
  const [showCustomPlatformInput, setShowCustomPlatformInput] = useState(false);
  const [showCustomTaskTypeInput, setShowCustomTaskTypeInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // ── Delete confirmation modal state ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Handle platform filter change ──
  const handlePlatformFilterChange = (value) => {
    setPlatformFilter(value);
    setTaskTypeFilter('');
    if (value && PLATFORMS.includes(value)) {
      setAvailableTaskTypes(TASK_TYPES_BY_PLATFORM[value] || DEFAULT_TASK_TYPES);
    } else {
      setAvailableTaskTypes(DEFAULT_TASK_TYPES);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPlatformFilter('');
    setTaskTypeFilter('');
    setAvailableTaskTypes(DEFAULT_TASK_TYPES);
  };

  // ── Open modal for create/edit ──
  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({ platform: '', url: '', taskType: '', title: '', description: '' });
    setCustomPlatform('');
    setCustomTaskType('');
    setShowCustomPlatformInput(false);
    setShowCustomTaskTypeInput(false);
    setAvailableTaskTypes(DEFAULT_TASK_TYPES);
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    const platform = task.platform || '';
    const taskType = task.taskType || '';
    const isCustomPlatform = platform && !PLATFORMS.includes(platform);
    const isCustomTaskType = taskType && !DEFAULT_TASK_TYPES.includes(taskType) && !Object.values(TASK_TYPES_BY_PLATFORM).flat().includes(taskType);

    setFormData({
      platform: isCustomPlatform ? 'custom' : platform,
      url: task.url || '',
      taskType: isCustomTaskType ? 'custom' : taskType,
      title: task.title || '',
      description: task.description || '',
    });
    setCustomPlatform(isCustomPlatform ? platform : '');
    setCustomTaskType(isCustomTaskType ? taskType : '');
    setShowCustomPlatformInput(isCustomPlatform);
    setShowCustomTaskTypeInput(isCustomTaskType);
    if (platform && PLATFORMS.includes(platform)) {
      setAvailableTaskTypes(TASK_TYPES_BY_PLATFORM[platform] || DEFAULT_TASK_TYPES);
    } else {
      setAvailableTaskTypes(DEFAULT_TASK_TYPES);
    }
    setModalError('');
    setShowModal(true);
  };

  // ── Handle platform change in modal ──
  const handlePlatformChange = (value) => {
    setFormData({ ...formData, platform: value });
    if (value === 'custom') {
      setShowCustomPlatformInput(true);
      setAvailableTaskTypes(DEFAULT_TASK_TYPES);
    } else {
      setShowCustomPlatformInput(false);
      setCustomPlatform('');
      if (PLATFORMS.includes(value)) {
        setAvailableTaskTypes(TASK_TYPES_BY_PLATFORM[value] || DEFAULT_TASK_TYPES);
      } else {
        setAvailableTaskTypes(DEFAULT_TASK_TYPES);
      }
      const currentTaskType = formData.taskType;
      if (currentTaskType && !availableTaskTypes.includes(currentTaskType) && currentTaskType !== 'custom') {
        setFormData(prev => ({ ...prev, taskType: '' }));
      }
    }
  };

  // ── Handle task type change in modal ──
  const handleTaskTypeChange = (value) => {
    setFormData({ ...formData, taskType: value });
    if (value === 'custom') {
      setShowCustomTaskTypeInput(true);
    } else {
      setShowCustomTaskTypeInput(false);
      setCustomTaskType('');
    }
  };

  // ── Submit task ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    let finalPlatform = formData.platform;
    let finalTaskType = formData.taskType;

    if (finalPlatform === 'custom') {
      if (!customPlatform.trim()) {
        setModalError('Please enter a custom platform name.');
        setSubmitting(false);
        return;
      }
      finalPlatform = customPlatform.trim();
    }

    if (finalTaskType === 'custom') {
      if (!customTaskType.trim()) {
        setModalError('Please enter a custom task type.');
        setSubmitting(false);
        return;
      }
      finalTaskType = customTaskType.trim();
    }

    const { url, title, description } = formData;
    if (!finalPlatform || !url || !finalTaskType) {
      setModalError('Platform, URL, and Task Type are required.');
      setSubmitting(false);
      return;
    }
    if (description && description.length > 500) {
      setModalError('Description cannot exceed 500 characters.');
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

      const payload = {
        platform: finalPlatform,
        url,
        taskType: finalTaskType,
        title: title || '',
        description: description || '',
      };

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
      invalidateMyTasks();
      await refetch();
    } catch (err) {
      console.error('Save task error:', err);
      setModalError(err.message || 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete task ──
  const confirmDelete = (task) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!taskToDelete) return;
    setDeleting(true);

    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/social-tasks/${taskToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete task');
      setShowDeleteModal(false);
      setTaskToDelete(null);
      invalidateMyTasks();
      await refetch();
    } catch (err) {
      console.error('Delete task error:', err);
      setModalError(err.message || 'Failed to delete task');
    } finally {
      setDeleting(false);
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
      invalidateMyTasks();
      await refetch();
    } catch (err) {
      console.error('Toggle active error:', err);
      setModalError(err.message || 'Failed to update task');
    }
  };

  const getPlatformIcon = (platform) => {
    const Icon = PLATFORM_ICONS[platform?.toLowerCase()] || FiLink;
    return Icon;
  };

  const getPlatformColor = (platform) => {
    return PLATFORM_COLORS[platform?.toLowerCase()] || 'text-purple-600';
  };

  // ── Options for custom selects ──
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  const platformOptions = [
    { value: '', label: 'All Platforms' },
    ...PLATFORMS.map(p => ({ value: p, label: p })),
  ];

  const taskTypeOptions = [
    { value: '', label: 'All Task Types' },
    ...availableTaskTypes.map(t => ({ value: t, label: t })),
  ];

  // ── Check if any filter is active ──
  const hasActiveFilters = statusFilter !== 'all' || platformFilter || taskTypeFilter;

  if (!isAuthenticated) {
    return (
      <>
        <Meta title="My Tasks | Make Trend" />
        <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600">
              <FiPlus className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">My Tasks</h2>
            <p className="text-gray-500 mt-1.5 text-sm">Sign in to create and manage your social tasks.</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition w-full shadow-sm text-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Meta title="My Tasks | Make Trend" />
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="flex items-center justify-between mb-6">
              <div className="h-7 w-32 bg-gray-200 rounded-lg" />
              <div className="h-10 w-28 bg-gray-200 rounded-xl" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-48 mt-1.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <p className="text-red-600 font-medium">Failed to load tasks.</p>
          <p className="text-sm text-red-500 mt-1">{error?.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm"
          >
            <FiRefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Meta title="My Tasks | Make Trend" description="Manage your social tasks for Grow Together." />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-3xl mx-auto">

          {/* ── Top Navigation Links Bar ── */}
          <div className="flex items-center justify-between gap-2 mb-6 bg-white p-2.5 sm:p-3 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/groweachother/grow-feed')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50/80 hover:bg-purple-100 text-purple-700 rounded-xl font-medium text-xs sm:text-sm transition border border-purple-100/60"
              >
                <FiCompass className="w-4 h-4" /> Go to Feed
              </button>
              <button
                onClick={() => router.push('/groweachother/my-exchanges')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium text-xs sm:text-sm transition border border-indigo-100/60"
              >
                <FiRepeat className="w-4 h-4" /> View Exchanges
              </button>
            </div>
            <button
              onClick={() => refetch({ refetchPage: (page, index) => index === 0 })}
              className="p-2 text-gray-400 hover:text-gray-600 transition rounded-xl hover:bg-gray-50"
              title="Refresh"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiPlus className="text-purple-600 w-5 h-5" />
                My Tasks
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage your social tasks for Grow Together</p>
            </div>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs sm:text-sm font-medium rounded-xl hover:shadow-md transition shadow-sm"
            >
              <FiPlus className="w-4 h-4" />
              Add Task
            </button>
          </div>

          {/* ── Filters ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <FiFilter className="text-purple-500 flex-shrink-0" />
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Filters</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="w-full sm:w-36">
                  <CustomSelect
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={statusOptions}
                    placeholder="All Status"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <CustomSelect
                    value={platformFilter}
                    onChange={handlePlatformFilterChange}
                    options={platformOptions}
                    placeholder="All Platforms"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <CustomSelect
                    value={taskTypeFilter}
                    onChange={(val) => setTaskTypeFilter(val)}
                    options={taskTypeOptions}
                    placeholder="All Task Types"
                    disabled={!platformFilter && availableTaskTypes === DEFAULT_TASK_TYPES}
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
                  >
                    <FiX className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Active Filter Chips ── */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs text-gray-500 font-medium">Active filters:</span>
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full border border-purple-100">
                  Status: {statusFilter === 'active' ? 'Active' : 'Inactive'}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="hover:text-red-500 transition"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              )}
              {platformFilter && (
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full border border-purple-100">
                  Platform: {platformFilter}
                  <button
                    onClick={() => {
                      setPlatformFilter('');
                      setTaskTypeFilter('');
                      setAvailableTaskTypes(DEFAULT_TASK_TYPES);
                    }}
                    className="hover:text-red-500 transition"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              )}
              {taskTypeFilter && (
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full border border-purple-100">
                  Task Type: {taskTypeFilter}
                  <button
                    onClick={() => setTaskTypeFilter('')}
                    className="hover:text-red-500 transition"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Clear all
              </button>
            </div>
          )}

          {isError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error?.message || 'Failed to load tasks'}
            </div>
          )}

          {/* ── Tasks List ── */}
          {tasks.length === 0 && !isFetchingNextPage ? (
            <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100 px-4">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">📋</div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {hasActiveFilters ? 'No matching tasks' : 'No tasks yet'}
              </h3>
              <p className="text-sm text-gray-400 mb-6 font-medium">
                {hasActiveFilters
                  ? 'Try adjusting your filters.'
                  : 'Create your first social task to get started!'}
              </p>
              {!hasActiveFilters && (
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium shadow-sm"
                >
                  <FiPlus className="w-4 h-4" />
                  Create Task
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {tasks.map((task) => {
                const Icon = getPlatformIcon(task.platform);
                const color = getPlatformColor(task.platform);
                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl shadow-sm border p-4 sm:p-5 hover:shadow-md transition-all ${
                      task.active ? 'border-gray-100' : 'border-gray-200/80 bg-gray-50/60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100/60 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-gray-900 text-sm sm:text-base">
                              {task.platform || 'Unknown'}
                            </span>
                            <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md">
                              {task.taskType || 'Task'}
                            </span>
                            {!task.active && (
                              <span className="text-[11px] font-semibold text-gray-500 bg-gray-200/70 px-2 py-0.5 rounded-md">
                                Inactive
                              </span>
                            )}
                          </div>
                          {task.title && (
                            <p className="text-xs sm:text-sm text-gray-600 font-medium truncate mb-1">{task.title}</p>
                          )}
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 mb-1">{task.description}</p>
                          )}
                          <a
                            href={task.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full font-medium"
                          >
                            <FiExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{task.url}</span>
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <button
                          onClick={() => handleToggleActive(task)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                            task.active
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {task.active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => openEditModal(task)}
                          className="p-2 text-gray-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition border border-transparent hover:border-purple-100"
                          title="Edit Task"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(task)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition border border-transparent hover:border-red-100"
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

          {/* ── Infinite scroll sentinel ── */}
          {hasMore && (
            <div id="tasks-end" className="py-6 flex justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                  <FiLoader className="w-4 h-4 animate-spin text-purple-600" />
                  Loading more tasks...
                </div>
              ) : (
                <div className="h-4" />
              )}
            </div>
          )}

          {!hasMore && tasks.length > 0 && (
            <p className="text-center text-xs font-medium text-gray-400 py-6">
              You've seen all tasks 🎉
            </p>
          )}
        </div>
      </div>

      {/* ── Create/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {editingTask ? 'Edit Task' : 'Add New Task'}
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
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Platform <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={formData.platform}
                  onChange={handlePlatformChange}
                  options={[
                    { value: '', label: 'Select platform' },
                    ...PLATFORMS.map(p => ({ value: p, label: p })),
                    { value: 'custom', label: '✏️ Custom' },
                  ]}
                  placeholder="Select platform"
                />
                {showCustomPlatformInput && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customPlatform}
                      onChange={(e) => setCustomPlatform(e.target.value)}
                      placeholder="Enter custom platform name"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2 text-sm focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                      required={formData.platform === 'custom'}
                    />
                  </div>
                )}
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                  placeholder="https://..."
                  required
                />
              </div>

              {/* Task Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Task Type <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={formData.taskType}
                  onChange={handleTaskTypeChange}
                  options={[
                    { value: '', label: 'Select task type' },
                    ...availableTaskTypes.map(t => ({ value: t, label: t })),
                    { value: 'custom', label: '✏️ Custom' },
                  ]}
                  placeholder="Select task type"
                />
                {showCustomTaskTypeInput && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customTaskType}
                      onChange={(e) => setCustomTaskType(e.target.value)}
                      placeholder="Enter custom task type"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2 text-sm focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                      required={formData.taskType === 'custom'}
                    />
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                  placeholder="e.g. My YouTube Channel"
                  maxLength={100}
                />
                <p className="mt-1 text-[11px] text-gray-400 font-medium">{formData.title.length}/100 characters</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Description / Instructions (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm font-medium focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 transition resize-none"
                  placeholder="Add instructions or details about this task..."
                  maxLength={500}
                />
                <p className="mt-1 text-[11px] text-gray-400 font-medium text-right">{formData.description.length}/500 characters</p>
              </div>

              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                  {modalError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-medium text-sm hover:shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <FiLoader className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" />
                      {editingTask ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium text-sm hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiTrash2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1.5">Delete Task</h3>
            <p className="text-gray-500 text-xs sm:text-sm mb-6 leading-relaxed">Are you sure you want to delete this task? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {deleting ? <FiLoader className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setTaskToDelete(null); }}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}