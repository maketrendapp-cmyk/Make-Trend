// pages/groweachother/grow-feed.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Meta from '../../components/Meta';
import { useAuth } from '../../components/AuthScreen';
import { getToken } from '../../lib/api';
import {
  useGrowFeed,
  useAvailableTasks,
  useInvalidateQueries,
  useMtCoins,
} from '../../lib/queries';
import {
  FiHeart,
  FiUser,
  FiCheckCircle,
  FiX,
  FiLoader,
  FiRefreshCw,
  FiPlus,
  FiExternalLink,
  FiCompass,
  FiRepeat,
  FiFilter,
  FiLogIn,
  FiAlertCircle,
  FiInfo,
  FiSearch,
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
  FaLink,
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

// ── Platform definitions ──
const PLATFORMS = ['YouTube', 'Instagram', 'Twitter', 'Facebook', 'TikTok', 'Twitch', 'LinkedIn', 'GitHub'];
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
  youtube: 'text-red-600 bg-red-50 border-red-200',
  instagram: 'text-pink-600 bg-pink-50 border-pink-200',
  twitter: 'text-blue-400 bg-blue-50 border-blue-200',
  facebook: 'text-blue-700 bg-blue-50 border-blue-200',
  tiktok: 'text-black bg-gray-100 border-gray-200',
  twitch: 'text-purple-600 bg-purple-50 border-purple-200',
  linkedin: 'text-blue-600 bg-blue-50 border-blue-200',
  github: 'text-gray-800 bg-gray-100 border-gray-200',
};

// ── Custom Dropdown Component ──
const CustomSelect = ({ value, onChange, options, placeholder, icon: Icon }) => {
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
    <div className="relative inline-block w-full sm:w-auto" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-purple-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all duration-200 min-w-[140px] shadow-sm"
      >
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <span className="flex-1 text-left truncate">{selectedLabel}</span>
        <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 animate-fadeIn max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors duration-150 ${
                  isSelected
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <FiCheckCircle className="w-4 h-4 text-purple-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function GrowFeed() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { invalidateGrowFeed } = useInvalidateQueries();

  // ── Filter state (selected = UI, applied = sent to backend) ──
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState('');
  const [appliedPlatform, setAppliedPlatform] = useState('');
  const [appliedTaskType, setAppliedTaskType] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableTaskTypes, setAvailableTaskTypes] = useState(DEFAULT_TASK_TYPES);

  // ── React Query: Grow Feed (infinite) with applied filters ──
  const filters = {
    platform: appliedPlatform || undefined,
    taskType: appliedTaskType || undefined,
    search: searchQuery || undefined,
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
  } = useGrowFeed(filters, true);

  // ── MT Coins balance ──
  const { data: mtCoinsData, isLoading: mtCoinsLoading, refetch: refetchMtCoins } = useMtCoins(isAuthenticated);

  // ── Flatten and filter tasks ──
  const allTasks = data?.pages?.flatMap((page) => page.tasks) || [];
  const tasks = isAuthenticated
    ? allTasks.filter(task => !task.hasExchange)
    : allTasks;

  const hasMore = hasNextPage;

  // ── Modal state ──
  const [showModal, setShowModal] = useState(false);
  const [selectedTargetTask, setSelectedTargetTask] = useState(null);
  const [selectedMyTask, setSelectedMyTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // ── Available tasks for modal ──
  const {
    data: availableTasksData,
    refetch: refetchAvailable,
    isLoading: isLoadingAvailable,
  } = useAvailableTasks(isAuthenticated && !!user);
  const myTasks = availableTasksData || [];

  const availableCoins = (mtCoinsData?.available ?? 0);
  const hasEnoughCoins = availableCoins >= 1;

  // ── Platform change handler – updates task types ──
  const handlePlatformChange = (val) => {
    setSelectedPlatform(val);
    setSelectedTaskType('');
    if (val && PLATFORMS.includes(val)) {
      setAvailableTaskTypes(TASK_TYPES_BY_PLATFORM[val] || DEFAULT_TASK_TYPES);
    } else {
      setAvailableTaskTypes(DEFAULT_TASK_TYPES);
    }
  };

  // ── Apply filters ──
  const applyFilters = () => {
    setAppliedPlatform(selectedPlatform);
    setAppliedTaskType(selectedTaskType);
    // Refetch the first page
    refetch({ refetchPage: (page, index) => index === 0 });
  };

  // ── Clear all filters ──
  const clearFilters = () => {
    setSelectedPlatform('');
    setSelectedTaskType('');
    setAppliedPlatform('');
    setAppliedTaskType('');
    setSearchInput('');
    setSearchQuery('');
    setAvailableTaskTypes(DEFAULT_TASK_TYPES);
    refetch({ refetchPage: (page, index) => index === 0 });
  };

  // ── Handle search ──
  const handleSearch = () => {
    if (searchInput.trim()) {
      // If search starts with @, keep it; otherwise search by text
      setSearchQuery(searchInput.trim());
    } else {
      setSearchQuery('');
    }
    // Refetch with search
    refetch({ refetchPage: (page, index) => index === 0 });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // ── Intersection Observer ──
  const observerRef = useRef(null);

  const lastElementRef = useCallback(
    (node) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );
      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, hasMore, fetchNextPage]
  );

  // ── Modal: open for exchange creation ──
  const handleHelpToGrow = async (task) => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/groweachother/grow-feed');
      return;
    }
    setSelectedTargetTask(task);
    setSelectedMyTask(null);
    setModalError('');
    setShowConfirmation(false);
    await refetchAvailable();
    await refetchMtCoins();
    setShowModal(true);
  };

  const handleCreateExchangeClick = () => {
    if (!selectedMyTask) {
      setModalError('Please select a task to exchange.');
      return;
    }
    if (!hasEnoughCoins) {
      setModalError(`Insufficient MT Coins. You need 1 coin to create an exchange. You have ${availableCoins} coins.`);
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmExchange = async () => {
    setSubmitting(true);
    setModalError('');

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/exchanges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetTaskId: selectedTargetTask.id,
          yourTaskId: selectedMyTask.id,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create exchange');
      }

      toast.success('Exchange created! 1 MT Coin was deducted from your balance.');
      setShowModal(false);
      setShowConfirmation(false);
      setSelectedTargetTask(null);
      setSelectedMyTask(null);
      invalidateGrowFeed();
      refetch();
      refetchMtCoins();
    } catch (err) {
      console.error('Create exchange error:', err);
      setModalError(err.message || 'Failed to create exchange');
      setShowConfirmation(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackFromConfirmation = () => {
    setShowConfirmation(false);
    setModalError('');
  };

  // ── Helpers ──
  const getPlatformIcon = (platform) => {
    const Icon = PLATFORM_ICONS[platform?.toLowerCase()] || FaLink;
    return Icon;
  };

  const getPlatformColor = (platform) => {
    return PLATFORM_COLORS[platform?.toLowerCase()] || 'text-purple-600 bg-purple-50 border-purple-200';
  };

  const goToUserProfile = (uid) => {
    if (uid) {
      router.push(`/userinfo/${uid}`);
    }
  };

  // ── Platform options ──
  const platformOptions = [
    { value: '', label: 'All Platforms' },
    ...PLATFORMS.map(p => ({ value: p, label: p })),
  ];

  const taskTypeOptions = [
    { value: '', label: 'All Tasks' },
    ...availableTaskTypes.map(t => ({ value: t, label: t })),
  ];

  // ── Render loading ──
  if (isLoading) {
    return (
      <>
        <Meta title="Grow Feed | Make Trend" />
        <div className="min-h-screen bg-gray-50 py-8 px-4">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32" />
                      <div className="h-3 bg-gray-200 rounded w-20 mt-1" />
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-40" />
                  <div className="mt-4 h-10 bg-gray-200 rounded-xl w-32" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <p className="text-red-600 font-medium">Failed to load feed.</p>
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

  const hasVisibleTasks = tasks.length > 0;
  const hasActiveFilters = appliedPlatform || appliedTaskType || searchQuery;

  return (
    <>
      <Meta title="Grow Feed | Make Trend" description="Help others grow and get help in return." />
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          {/* ── Top Navigation Bar ── */}
          <div className="flex items-center justify-between gap-2 mb-6 bg-white p-2.5 sm:p-3 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => router.push('/groweachother/my-tasks')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-medium text-xs sm:text-sm transition"
                  >
                    <FiPlus className="w-4 h-4" /> My Tasks
                  </button>
                  <button
                    onClick={() => router.push('/groweachother/my-exchanges')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium text-xs sm:text-sm transition"
                  >
                    <FiRepeat className="w-4 h-4" /> Exchanges
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push('/login?redirect=/groweachother/grow-feed')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-medium text-xs sm:text-sm transition"
                >
                  <FiLogIn className="w-4 h-4" /> Sign in to participate
                </button>
              )}
            </div>
            <button
              onClick={() => refetch({ refetchPage: (page, index) => index === 0 })}
              className="p-2 text-gray-400 hover:text-gray-600 transition rounded-xl hover:bg-gray-50"
              title="Refresh Feed"
            >
              <FiRefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FiHeart className="text-purple-600 w-5 h-5" />
                Grow Feed
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Help others grow and receive mutual engagement</p>
            </div>
          </div>

          {/* ── Search & Filters ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search by @username or keyword..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition"
                />
                {searchInput && (
                  <button
                    onClick={() => setSearchInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium flex items-center gap-1.5 whitespace-nowrap"
              >
                <FiSearch className="w-4 h-4" /> Search
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <FiFilter className="text-purple-500 flex-shrink-0" />
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Filters</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <CustomSelect
                  value={selectedPlatform}
                  onChange={handlePlatformChange}
                  options={platformOptions}
                  placeholder="All Platforms"
                />

                <CustomSelect
                  value={selectedTaskType}
                  onChange={setSelectedTaskType}
                  options={taskTypeOptions}
                  placeholder="All Tasks"
                />

                <button
                  onClick={applyFilters}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition text-sm font-medium"
                >
                  Apply Filters
                </button>

                {(hasActiveFilters) && (
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

            {/* Active filters chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500 font-medium">Active:</span>
                {appliedPlatform && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full">
                    Platform: {appliedPlatform}
                    <button
                      onClick={() => { setSelectedPlatform(''); setAppliedPlatform(''); }}
                      className="hover:text-red-500"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {appliedTaskType && (
                  <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full">
                    Task: {appliedTaskType}
                    <button
                      onClick={() => { setSelectedTaskType(''); setAppliedTaskType(''); }}
                      className="hover:text-red-500"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full">
                    Search: {searchQuery}
                    <button
                      onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                      className="hover:text-red-500"
                    >
                      <FiX className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Feed ── */}
          {!hasVisibleTasks && !isFetchingNextPage && (
            <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100 px-4">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm">🌱</div>
              <h3 className="text-base font-bold text-gray-900 mb-1">
                {isAuthenticated && allTasks.length > 0
                  ? 'All tasks exchanged!'
                  : 'No tasks available'}
              </h3>
              <p className="text-sm text-gray-400 mb-6 font-medium">
                {isAuthenticated && allTasks.length > 0
                  ? 'You have already exchanged all visible tasks. Check back later!'
                  : hasActiveFilters
                  ? 'Try adjusting your filters.'
                  : 'Check back later or create your own tasks!'}
              </p>
              {isAuthenticated && !hasActiveFilters && allTasks.length === 0 && (
                <button
                  onClick={() => router.push('/groweachother/my-tasks')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-sm font-medium shadow-sm"
                >
                  <FiPlus className="w-4 h-4" />
                  Create Task
                </button>
              )}
            </div>
          )}

          <div className="space-y-4">
            {tasks.map((task, index) => {
              const Icon = getPlatformIcon(task.platform);
              const colorClass = getPlatformColor(task.platform);
              const isLast = index === tasks.length - 1;
              return (
                <div
                  key={task.id}
                  ref={isLast ? lastElementRef : null}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* ── Card Header: Owner Info ── */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-50 bg-gray-50/30">
                    <div
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => goToUserProfile(task.owner?.uid)}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 border-2 border-purple-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                        {task.owner?.avatar ? (
                          <img
                            src={task.owner.avatar}
                            alt={task.owner.fullname || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiUser className="w-4 h-4 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm group-hover:text-purple-600 transition">
                          {task.owner?.fullname || task.owner?.username || 'Community Member'}
                        </p>
                        <p className="text-xs text-gray-400 font-medium">@{task.owner?.username || 'user'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${colorClass} uppercase tracking-wider`}>
                        {task.platform || 'Social'}
                      </span>
                    </div>
                  </div>

                  {/* ── Card Body: Task Details ── */}
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${colorClass} shadow-sm`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                            {task.taskType || 'Support'}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">on {task.platform || 'Platform'}</span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 truncate">
                          {task.title || `${task.taskType} my ${task.platform} profile`}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                    </div>

                    {/* ── Action Links ── */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400 font-medium">
                        🤝 Mutual community exchange
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={task.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium transition"
                        >
                          <span>Visit</span>
                          <FiExternalLink className="w-3 h-3 text-gray-400" />
                        </a>

                        {task.isOwn ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg">
                            <FiUser className="w-3.5 h-3.5" /> Your Task
                          </span>
                        ) : task.hasExchange ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold rounded-lg">
                            <FiCheckCircle className="w-3.5 h-3.5" /> Exchanged
                          </span>
                        ) : (
                          <button
                            onClick={() => handleHelpToGrow(task)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-lg hover:shadow-md transition shadow-sm active:scale-95"
                          >
                            <FiHeart className="w-3.5 h-3.5" />
                            Help To Grow
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Infinite scroll loading ── */}
          {hasMore && (
            <div className="py-6 flex justify-center">
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
              You've reached the end of the feed 🎉
            </p>
          )}
        </div>
      </div>

      {/* ── Help To Grow Modal ── */}
      {showModal && isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            {!showConfirmation ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Help To Grow</h2>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedTargetTask(null);
                      setSelectedMyTask(null);
                      setModalError('');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-3.5 bg-purple-50/80 border border-purple-100 rounded-2xl">
                  <p className="text-xs sm:text-sm text-purple-900 font-medium leading-relaxed">
                    You're helping <strong>{selectedTargetTask?.owner?.fullname || selectedTargetTask?.owner?.username}</strong>
                    {' '}with their <strong>{selectedTargetTask?.taskType}</strong> on{' '}
                    <strong>{selectedTargetTask?.platform}</strong>.
                  </p>
                </div>

                <div className={`mb-4 p-3 rounded-2xl border ${hasEnoughCoins ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Available MT Coins</span>
                    <span className={`text-lg font-bold ${hasEnoughCoins ? 'text-green-700' : 'text-red-700'}`}>
                      {mtCoinsLoading ? '...' : availableCoins}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <FiInfo className={`w-3.5 h-3.5 ${hasEnoughCoins ? 'text-green-500' : 'text-red-500'}`} />
                    <p className={`text-xs ${hasEnoughCoins ? 'text-green-600' : 'text-red-600'}`}>
                      {hasEnoughCoins
                        ? 'You have enough coins. 1 MT Coin will be deducted.'
                        : `You need 1 MT Coin. You have ${availableCoins} coins.`}
                    </p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider mb-2.5">
                  Select your task to return the favor:
                </p>

                {myTasks.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-gray-500 text-xs sm:text-sm font-medium mb-3">You don't have any active tasks available.</p>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        router.push('/groweachother/my-tasks');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition text-xs font-bold shadow-sm"
                    >
                      <FiPlus className="w-4 h-4" />
                      Create Task First
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">
                    {myTasks.map((task) => {
                      const Icon = getPlatformIcon(task.platform);
                      const colorClass = getPlatformColor(task.platform);
                      return (
                        <button
                          key={task.id}
                          onClick={() => {
                            setSelectedMyTask(task);
                            setModalError('');
                          }}
                          className={`w-full text-left p-3 rounded-2xl border transition-all ${
                            selectedMyTask?.id === task.id
                              ? 'border-purple-500 bg-purple-50/60 shadow-sm'
                              : 'border-gray-200/80 hover:border-purple-200 hover:bg-purple-50/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-200/60 shadow-sm ${colorClass}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                {task.platform} – {task.taskType}
                              </p>
                              {task.title && (
                                <p className="text-[11px] text-gray-500 truncate">{task.title}</p>
                              )}
                            </div>
                            {selectedMyTask?.id === task.id && (
                              <FiCheckCircle className="w-5 h-5 text-purple-600 ml-auto flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {modalError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                    {modalError}
                  </div>
                )}

                <button
                  onClick={handleCreateExchangeClick}
                  disabled={!selectedMyTask || submitting || myTasks.length === 0 || !hasEnoughCoins}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                    !selectedMyTask || submitting || myTasks.length === 0 || !hasEnoughCoins
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-md active:scale-95'
                  }`}
                >
                  {submitting ? (
                    <>
                      <FiLoader className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Continue to Confirm'
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Confirm Exchange</h2>
                  <button
                    onClick={handleBackFromConfirmation}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                    disabled={submitting}
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <FiAlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-yellow-800">1 MT Coin will be deducted</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        You have <strong>{availableCoins}</strong> MT Coins available.
                        After this exchange, you'll have <strong>{availableCoins - 1}</strong> coins.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 p-3.5 bg-purple-50/80 border border-purple-100 rounded-2xl">
                  <p className="text-xs sm:text-sm text-purple-900 font-medium leading-relaxed">
                    You'll help <strong>{selectedTargetTask?.owner?.fullname || selectedTargetTask?.owner?.username}</strong>
                    {' '}with <strong>{selectedTargetTask?.taskType}</strong> on{' '}
                    <strong>{selectedTargetTask?.platform}</strong>.
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    Your task: <strong>{selectedMyTask?.platform} – {selectedMyTask?.taskType}</strong>
                  </p>
                </div>

                {modalError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold">
                    {modalError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleBackFromConfirmation}
                    disabled={submitting}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmExchange}
                    disabled={submitting}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <FiLoader className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Confirm & Exchange'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}