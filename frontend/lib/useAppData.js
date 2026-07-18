// lib/useAppData.js – Simplified Version
// ============================================================
// SIMPLE APPROACH – Direct setData, no subscriber complexity
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../services/firebase';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com/api';

async function apiRequest(endpoint, options = {}, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    options.body = JSON.stringify(options.body);
  }
  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `API error: ${response.status}`);
  return data;
}

// ── Shared cache ──
const cache = {
  profile: null,
  stats: null,
  campaigns: [],
  supportTickets: [],
  templates: [],
  featuredTemplates: [],
  comments: [],
};

// ── Shared promises (deduplication) ──
let fetchPromises = {};

// ── Update function that updates cache AND notifies all instances ──
let updateAllInstances = null;

function setCacheAndNotify(newData) {
  Object.assign(cache, newData);
  if (updateAllInstances) {
    updateAllInstances({ ...cache });
  }
}

export function useAppData() {
  const router = useRouter();
  const pathname = router.pathname;

  // ── Local state initialized from cache ──
  const [data, setData] = useState({
    profile: cache.profile,
    stats: cache.stats,
    campaigns: cache.campaigns,
    supportTickets: cache.supportTickets,
    templates: cache.templates,
    featuredTemplates: cache.featuredTemplates,
    comments: cache.comments,
  });

  const [loadingState, setLoadingState] = useState({
    profile: false,
    stats: false,
    campaigns: false,
    supportTickets: false,
    templates: false,
    featuredTemplates: false,
    comments: false,
  });

  const [dataLoaded, setDataLoaded] = useState(false);

  // ── Register this instance for updates ──
  useEffect(() => {
    const oldUpdate = updateAllInstances;
    updateAllInstances = (newData) => {
      setData(newData);
    };
    return () => {
      updateAllInstances = oldUpdate;
    };
  }, []);

  // ── Individual fetch with deduplication ──
  const fetchWithDedupe = (key, fetchFn) => {
    if (fetchPromises[key]) return fetchPromises[key];

    fetchPromises[key] = fetchFn()
      .then((result) => {
        setCacheAndNotify({ [key]: result });
        return result;
      })
      .catch((err) => {
        toast.error(`Failed to load ${key}`);
        throw err;
      })
      .finally(() => {
        fetchPromises[key] = null;
      });
    return fetchPromises[key];
  };

  // ── Fetch functions ──
  const fetchProfile = () =>
    fetchWithDedupe('profile', async () => {
      const user = auth.currentUser;
      if (!user) return null;
      const token = await user.getIdToken();
      const res = await apiRequest('/auth/me', {}, token);
      return res.user ? { uid: user.uid, ...res.user, completed: true } : null;
    });

  const fetchStats = () =>
    fetchWithDedupe('stats', async () => {
      const user = auth.currentUser;
      if (!user) return { totalCampaigns: 0, totalViews: 0, totalUnlocks: 0, totalShares: 0, totalCompletions: 0, successfulCampaigns: 0 };
      const token = await user.getIdToken();
      const res = await apiRequest('/stats', {}, token);
      return res.stats || {};
    });

  const fetchCampaigns = () =>
    fetchWithDedupe('campaigns', async () => {
      const user = auth.currentUser;
      if (!user) return [];
      const token = await user.getIdToken();
      const res = await apiRequest('/campaigns?limit=25', {}, token);
      return res.campaigns || [];
    });

  const fetchSupportTickets = () =>
    fetchWithDedupe('supportTickets', async () => {
      const user = auth.currentUser;
      if (!user) return [];
      const token = await user.getIdToken();
      const res = await apiRequest('/support', {}, token);
      return res.tickets || [];
    });

  const fetchTemplates = () =>
    fetchWithDedupe('templates', async () => {
      const res = await apiRequest('/templates');
      return res.templates || [];
    });

  const fetchFeaturedTemplates = () =>
    fetchWithDedupe('featuredTemplates', async () => {
      const res = await apiRequest('/templates?highlight=true');
      return (res.templates || []).filter(t => t.isHighlight === true);
    });

  const fetchComments = () =>
    fetchWithDedupe('comments', async () => {
      const res = await apiRequest('/comments');
      return res.comments || [];
    });

  // ── Route‑aware auto‑fetch ──
  useEffect(() => {
    const fetchPageData = async () => {
      const user = auth.currentUser;

      // 1. Profile always (for Navbar)
      if (user && !cache.profile) {
        setLoadingState(prev => ({ ...prev, profile: true }));
        await fetchProfile();
        setLoadingState(prev => ({ ...prev, profile: false }));
      }

      // 2. Page-specific data
      const isHome = pathname === '/';
      const isProfile = pathname === '/profile' || pathname === '/stats' || pathname === '/refer-earn' || pathname === '/edit-profile';
      const isSupport = pathname === '/support';
      const isCreate = pathname === '/create' || pathname === '/createcampaign';
      const isAbout = pathname === '/about';

      if (isHome) {
        if (!cache.templates) {
          setLoadingState(prev => ({ ...prev, templates: true }));
          await fetchTemplates();
          setLoadingState(prev => ({ ...prev, templates: false }));
        }
        if (!cache.featuredTemplates) {
          setLoadingState(prev => ({ ...prev, featuredTemplates: true }));
          await fetchFeaturedTemplates();
          setLoadingState(prev => ({ ...prev, featuredTemplates: false }));
        }
        if (!cache.comments) {
          setLoadingState(prev => ({ ...prev, comments: true }));
          await fetchComments();
          setLoadingState(prev => ({ ...prev, comments: false }));
        }
      }

      if (isProfile && user) {
        if (!cache.stats) {
          setLoadingState(prev => ({ ...prev, stats: true }));
          await fetchStats();
          setLoadingState(prev => ({ ...prev, stats: false }));
        }
        if (!cache.campaigns) {
          setLoadingState(prev => ({ ...prev, campaigns: true }));
          await fetchCampaigns();
          setLoadingState(prev => ({ ...prev, campaigns: false }));
        }
      }

      if (isSupport && user) {
        if (!cache.supportTickets) {
          setLoadingState(prev => ({ ...prev, supportTickets: true }));
          await fetchSupportTickets();
          setLoadingState(prev => ({ ...prev, supportTickets: false }));
        }
      }

      if (isCreate) {
        if (!cache.templates) {
          setLoadingState(prev => ({ ...prev, templates: true }));
          await fetchTemplates();
          setLoadingState(prev => ({ ...prev, templates: false }));
        }
      }

      if (isAbout) {
        if (!cache.comments) {
          setLoadingState(prev => ({ ...prev, comments: true }));
          await fetchComments();
          setLoadingState(prev => ({ ...prev, comments: false }));
        }
      }

      setDataLoaded(true);
    };

    fetchPageData().catch(() => {});
  }, [pathname]);

  // ── Refetch helpers ──
  const refetchProfile = useCallback(async () => {
    cache.profile = null;
    fetchPromises.profile = null;
    setLoadingState(prev => ({ ...prev, profile: true }));
    await fetchProfile();
    setLoadingState(prev => ({ ...prev, profile: false }));
  }, []);

  const refetchStats = useCallback(async () => {
    cache.stats = null;
    fetchPromises.stats = null;
    setLoadingState(prev => ({ ...prev, stats: true }));
    await fetchStats();
    setLoadingState(prev => ({ ...prev, stats: false }));
  }, []);

  const refetchCampaigns = useCallback(async () => {
    cache.campaigns = null;
    fetchPromises.campaigns = null;
    setLoadingState(prev => ({ ...prev, campaigns: true }));
    await fetchCampaigns();
    setLoadingState(prev => ({ ...prev, campaigns: false }));
  }, []);

  const refetchSupportTickets = useCallback(async () => {
    cache.supportTickets = null;
    fetchPromises.supportTickets = null;
    setLoadingState(prev => ({ ...prev, supportTickets: true }));
    await fetchSupportTickets();
    setLoadingState(prev => ({ ...prev, supportTickets: false }));
  }, []);

  const refetchTemplates = useCallback(async () => {
    cache.templates = null;
    cache.featuredTemplates = null;
    fetchPromises.templates = null;
    fetchPromises.featuredTemplates = null;
    setLoadingState(prev => ({ ...prev, templates: true, featuredTemplates: true }));
    await Promise.all([fetchTemplates(), fetchFeaturedTemplates()]);
    setLoadingState(prev => ({ ...prev, templates: false, featuredTemplates: false }));
  }, []);

  const refetchComments = useCallback(async () => {
    cache.comments = null;
    fetchPromises.comments = null;
    setLoadingState(prev => ({ ...prev, comments: true }));
    await fetchComments();
    setLoadingState(prev => ({ ...prev, comments: false }));
  }, []);

  const clearUserData = useCallback(() => {
    cache.profile = null;
    cache.stats = null;
    cache.campaigns = null;
    cache.supportTickets = null;
    setData({
      profile: null,
      stats: null,
      campaigns: [],
      supportTickets: [],
      templates: data.templates,
      featuredTemplates: data.featuredTemplates,
      comments: data.comments,
    });
  }, [data]);

  return {
    profile: data.profile,
    stats: data.stats,
    campaigns: data.campaigns,
    supportTickets: data.supportTickets,
    templates: data.templates,
    featuredTemplates: data.featuredTemplates,
    comments: data.comments,
    loadingState,
    dataLoaded,
    refetchProfile,
    refetchStats,
    refetchCampaigns,
    refetchSupportTickets,
    refetchTemplates,
    refetchComments,
    clearUserData,
  };
}