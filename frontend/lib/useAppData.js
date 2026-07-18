// lib/useAppData.js
// ============================================================
// ROUTE-AWARE FETCH – Fetches only what the current page needs
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

let fetchPromises = {
  profile: null,
  stats: null,
  campaigns: null,
  supportTickets: null,
  templates: null,
  featuredTemplates: null,
  comments: null,
};

let isFetching = {};

// ── Subscribers ──
let subscribers = [];

function notifySubscribers() {
  subscribers.forEach(fn => fn(cache));
}

function subscribe(fn) {
  subscribers.push(fn);
  return () => {
    subscribers = subscribers.filter(f => f !== fn);
  };
}

// ── Individual fetch functions with deduplication ──
const fetchWithDedupe = (key, fetchFn) => {
  if (fetchPromises[key]) return fetchPromises[key];
  if (isFetching[key]) return fetchPromises[key];

  isFetching[key] = true;
  fetchPromises[key] = fetchFn()
    .then((data) => {
      cache[key] = data;
      notifySubscribers();
      return data;
    })
    .catch((err) => {
      toast.error(`Failed to load ${key}`);
      throw err;
    })
    .finally(() => {
      isFetching[key] = false;
      fetchPromises[key] = null;
    });
  return fetchPromises[key];
};

// ── Data fetchers ──
const fetchProfile = () =>
  fetchWithDedupe('profile', async () => {
    const user = auth.currentUser;
    if (!user) return null;
    const token = await user.getIdToken();
    const data = await apiRequest('/auth/me', {}, token);
    return data.user ? { uid: user.uid, ...data.user, completed: true } : null;
  });

const fetchStats = () =>
  fetchWithDedupe('stats', async () => {
    const user = auth.currentUser;
    if (!user) return { totalCampaigns: 0, totalViews: 0, totalUnlocks: 0, totalShares: 0, totalCompletions: 0, successfulCampaigns: 0 };
    const token = await user.getIdToken();
    const data = await apiRequest('/stats', {}, token);
    return data.stats || {};
  });

const fetchCampaigns = () =>
  fetchWithDedupe('campaigns', async () => {
    const user = auth.currentUser;
    if (!user) return [];
    const token = await user.getIdToken();
    const data = await apiRequest('/campaigns?limit=25', {}, token);
    return data.campaigns || [];
  });

const fetchSupportTickets = () =>
  fetchWithDedupe('supportTickets', async () => {
    const user = auth.currentUser;
    if (!user) return [];
    const token = await user.getIdToken();
    const data = await apiRequest('/support', {}, token);
    return data.tickets || [];
  });

const fetchTemplates = () =>
  fetchWithDedupe('templates', async () => {
    const data = await apiRequest('/templates');
    return data.templates || [];
  });

const fetchFeaturedTemplates = () =>
  fetchWithDedupe('featuredTemplates', async () => {
    const data = await apiRequest('/templates?highlight=true');
    return (data.templates || []).filter(t => t.isHighlight === true);
  });

const fetchComments = () =>
  fetchWithDedupe('comments', async () => {
    const data = await apiRequest('/comments');
    return data.comments || [];
  });

// ── React Hook ──
export function useAppData() {
  const router = useRouter();
  const pathname = router.pathname;

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

  useEffect(() => {
    const update = (newCache) => {
      setData({
        profile: newCache.profile,
        stats: newCache.stats,
        campaigns: newCache.campaigns,
        supportTickets: newCache.supportTickets,
        templates: newCache.templates,
        featuredTemplates: newCache.featuredTemplates,
        comments: newCache.comments,
      });
    };
    return subscribe(update);
  }, []);

  // ── Determine which data to fetch based on route ──
  useEffect(() => {
    const fetchPageData = async () => {
      const user = auth.currentUser;

      // 1. Always fetch profile if user exists (for Navbar)
      if (user && !cache.profile && !isFetching.profile) {
        setLoadingState(prev => ({ ...prev, profile: true }));
        await fetchProfile();
        setLoadingState(prev => ({ ...prev, profile: false }));
      }

      // 2. Fetch data specific to the current page
      const isHome = pathname === '/';
      const isProfile = pathname === '/profile';
      const isStats = pathname === '/stats';
      const isCreate = pathname === '/create' || pathname === '/createcampaign';
      const isSupport = pathname === '/support';
      const isRefer = pathname === '/refer-earn';
      const isAbout = pathname === '/about';

      // Home page: templates, featured, comments (profile already fetched)
      if (isHome) {
        if (!cache.templates && !isFetching.templates) {
          setLoadingState(prev => ({ ...prev, templates: true }));
          await fetchTemplates();
          setLoadingState(prev => ({ ...prev, templates: false }));
        }
        if (!cache.featuredTemplates && !isFetching.featuredTemplates) {
          setLoadingState(prev => ({ ...prev, featuredTemplates: true }));
          await fetchFeaturedTemplates();
          setLoadingState(prev => ({ ...prev, featuredTemplates: false }));
        }
        if (!cache.comments && !isFetching.comments) {
          setLoadingState(prev => ({ ...prev, comments: true }));
          await fetchComments();
          setLoadingState(prev => ({ ...prev, comments: false }));
        }
      }

      // Profile, Stats, Refer pages: need profile, stats, campaigns
      if (isProfile || isStats || isRefer) {
        if (user) {
          if (!cache.stats && !isFetching.stats) {
            setLoadingState(prev => ({ ...prev, stats: true }));
            await fetchStats();
            setLoadingState(prev => ({ ...prev, stats: false }));
          }
          if (!cache.campaigns && !isFetching.campaigns) {
            setLoadingState(prev => ({ ...prev, campaigns: true }));
            await fetchCampaigns();
            setLoadingState(prev => ({ ...prev, campaigns: false }));
          }
        }
      }

      // Support page: need supportTickets
      if (isSupport && user) {
        if (!cache.supportTickets && !isFetching.supportTickets) {
          setLoadingState(prev => ({ ...prev, supportTickets: true }));
          await fetchSupportTickets();
          setLoadingState(prev => ({ ...prev, supportTickets: false }));
        }
      }

      // Create page: need templates
      if (isCreate) {
        if (!cache.templates && !isFetching.templates) {
          setLoadingState(prev => ({ ...prev, templates: true }));
          await fetchTemplates();
          setLoadingState(prev => ({ ...prev, templates: false }));
        }
      }

      // About page: need comments
      if (isAbout) {
        if (!cache.comments && !isFetching.comments) {
          setLoadingState(prev => ({ ...prev, comments: true }));
          await fetchComments();
          setLoadingState(prev => ({ ...prev, comments: false }));
        }
      }

      // Mark as loaded
      setDataLoaded(true);
    };

    fetchPageData().catch(() => {});
  }, [pathname]); // Re-run when route changes

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
    notifySubscribers();
  }, []);

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