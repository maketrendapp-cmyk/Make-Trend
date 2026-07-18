// lib/useAppData.js
// ============================================================
// ENHANCED – Caching, Parallel Batches, Loading States, Abort, Retry, Toasts
// All data is cached and initialised from cache on mount.
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { auth } from '../services/firebase';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com/api';

// ── Simple in‑memory cache (5 minutes TTL) ──
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ── Deduplicate in‑flight requests ──
const pending = new Map();
async function fetchWithDedupe(key, fetchFn) {
  if (pending.has(key)) return pending.get(key);
  const promise = fetchFn().then(data => {
    setCache(key, data);
    pending.delete(key);
    return data;
  });
  pending.set(key, promise);
  return promise;
}

// ── API helper with abort, retry, logging ──
async function apiRequest(endpoint, options = {}, token = null, signal = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    options.body = JSON.stringify(options.body);
  }

  const start = performance.now();
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers, signal });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log(`⚡ ${endpoint} – ${(performance.now() - start).toFixed(0)}ms`);
      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log(`⏹️ ${endpoint} aborted`);
        throw err;
      }
      lastError = err;
      await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
    }
  }
  toast.error(`Failed to load ${endpoint}: ${lastError.message}`);
  throw lastError;
}

export function useAppData() {
  // ── 1️⃣ INSTANT initialisation from cache (synchronous) ──
  // Build cache keys for each data type
  const user = auth.currentUser;
  const uid = user?.uid;

  const getInitial = (key) => {
    const cached = getCached(key);
    return cached !== null ? cached : (() => {
      // For arrays, return empty array; for objects, return null/default
      if (key.startsWith('templates:') || key === 'comments:all' || key.startsWith('campaigns:') || key.startsWith('support:')) {
        return [];
      }
      if (key.startsWith('stats:')) {
        return { totalCampaigns: 0, totalViews: 0, totalUnlocks: 0, totalShares: 0, totalCompletions: 0, successfulCampaigns: 0 };
      }
      if (key.startsWith('profile:')) {
        return null;
      }
      return null;
    })();
  };

  const profileKey = uid ? `profile:${uid}` : null;
  const statsKey = uid ? `stats:${uid}` : null;
  const campaignsKey = uid ? `campaigns:${uid}` : null;
  const supportKey = uid ? `support:${uid}` : null;

  const [templates, setTemplates] = useState(getInitial('templates:all'));
  const [featuredTemplates, setFeaturedTemplates] = useState(getInitial('templates:highlight:true'));
  const [profile, setProfile] = useState(profileKey ? getInitial(profileKey) : null);
  const [campaigns, setCampaigns] = useState(campaignsKey ? getInitial(campaignsKey) : []);
  const [supportTickets, setSupportTickets] = useState(supportKey ? getInitial(supportKey) : []);
  const [comments, setComments] = useState(getInitial('comments:all'));
  const [stats, setStats] = useState(statsKey ? getInitial(statsKey) : { totalCampaigns: 0, totalViews: 0, totalUnlocks: 0, totalShares: 0, totalCompletions: 0, successfulCampaigns: 0 });

  // ── dataLoaded is true from the start – UI never waits ──
  const [dataLoaded, setDataLoaded] = useState(true);

  // ── Loading states (for skeletons) ──
  const [loadingState, setLoadingState] = useState({
    profile: false,
    stats: false,
    highlights: false,
    allTemplates: false,
    campaigns: false,
    support: false,
    comments: false,
  });

  const abortControllerRef = useRef(null);

  // ---- Individual fetch functions (with cache and dedupe) ----

  const fetchProfile = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoadingState(s => ({ ...s, profile: true }));
    try {
      const token = await user.getIdToken();
      const key = `profile:${user.uid}`;
      // getCached already checked in initial state, but we still use fetchWithDedupe
      const data = await fetchWithDedupe(key, async () => {
        const result = await apiRequest('/auth/me', {}, token);
        return result.success ? result.user : null;
      });
      if (data) setProfile(data);
    } finally {
      setLoadingState(s => ({ ...s, profile: false }));
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoadingState(s => ({ ...s, stats: true }));
    try {
      const token = await user.getIdToken();
      const key = `stats:${user.uid}`;
      const data = await fetchWithDedupe(key, async () => {
        const result = await apiRequest('/stats', {}, token);
        return result.success ? result.stats : null;
      });
      if (data) setStats(data);
    } finally {
      setLoadingState(s => ({ ...s, stats: false }));
    }
  }, []);

  const fetchHighlightedTemplates = useCallback(async () => {
    setLoadingState(s => ({ ...s, highlights: true }));
    try {
      const key = 'templates:highlight:true';
      const data = await fetchWithDedupe(key, async () => {
        const result = await apiRequest('/templates?highlight=true');
        return result.templates || [];
      });
      setFeaturedTemplates(data);
    } finally {
      setLoadingState(s => ({ ...s, highlights: false }));
    }
  }, []);

  const fetchAllTemplates = useCallback(async () => {
    setLoadingState(s => ({ ...s, allTemplates: true }));
    try {
      const key = 'templates:all';
      const data = await fetchWithDedupe(key, async () => {
        const result = await apiRequest('/templates');
        return result.templates || [];
      });
      setTemplates(data);
    } finally {
      setLoadingState(s => ({ ...s, allTemplates: false }));
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoadingState(s => ({ ...s, campaigns: true }));
    try {
      const token = await user.getIdToken();
      const key = `campaigns:${user.uid}`;
      const data = await fetchWithDedupe(key, async () => {
        const result = await apiRequest('/campaigns?limit=25', {}, token);
        return result.campaigns || [];
      });
      setCampaigns(data);
    } finally {
      setLoadingState(s => ({ ...s, campaigns: false }));
    }
  }, []);

  const fetchSupportTickets = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoadingState(s => ({ ...s, support: true }));
    try {
      const token = await user.getIdToken();
      const key = `support:${user.uid}`;
      const data = await fetchWithDedupe(key, async () => {
        const result = await apiRequest('/support', {}, token);
        return result.tickets || [];
      });
      setSupportTickets(data);
    } finally {
      setLoadingState(s => ({ ...s, support: false }));
    }
  }, []);

  const fetchComments = useCallback(async () => {
    setLoadingState(s => ({ ...s, comments: true }));
    try {
      const key = 'comments:all';
      const data = await fetchWithDedupe(key, async () => {
        const result = await apiRequest('/comments');
        return result.comments || [];
      });
      setComments(data);
    } finally {
      setLoadingState(s => ({ ...s, comments: false }));
    }
  }, []);

  // ---- Master loader – two parallel batches ----
  const loadAllData = useCallback(async () => {
    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // ── Batch 1: Profile, Stats, Highlights, All Templates ──
      const batch1 = [];
      if (auth.currentUser) {
        batch1.push(fetchProfile());
        batch1.push(fetchStats());
      }
      batch1.push(fetchHighlightedTemplates());
      batch1.push(fetchAllTemplates());
      await Promise.all(batch1);

      // ── Batch 2: Campaigns, Support, Comments ──
      const batch2 = [];
      if (auth.currentUser) {
        batch2.push(fetchCampaigns());
        batch2.push(fetchSupportTickets());
      }
      batch2.push(fetchComments());
      await Promise.all(batch2);

      setDataLoaded(true);
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Some data failed to load. Please refresh.');
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    fetchProfile,
    fetchStats,
    fetchHighlightedTemplates,
    fetchAllTemplates,
    fetchCampaigns,
    fetchSupportTickets,
    fetchComments,
  ]);

  // ---- Refetch helpers (clear cache AND pending, then refetch) ----
  const refetchProfile = useCallback(async () => {
    const user = auth.currentUser;
    if (user) {
      const key = `profile:${user.uid}`;
      cache.delete(key);
      pending.delete(key);
      await fetchProfile();
    }
  }, [fetchProfile]);

  const refetchCampaigns = useCallback(async () => {
    const user = auth.currentUser;
    if (user) {
      const key = `campaigns:${user.uid}`;
      cache.delete(key);
      pending.delete(key);
      await fetchCampaigns();
    }
  }, [fetchCampaigns]);

  const refetchStats = useCallback(async () => {
    const user = auth.currentUser;
    if (user) {
      const key = `stats:${user.uid}`;
      cache.delete(key);
      pending.delete(key);
      await fetchStats();
    }
  }, [fetchStats]);

  const refetchSupportTickets = useCallback(async () => {
    const user = auth.currentUser;
    if (user) {
      const key = `support:${user.uid}`;
      cache.delete(key);
      pending.delete(key);
      await fetchSupportTickets();
    }
  }, [fetchSupportTickets]);

  const refetchComments = useCallback(async () => {
    const key = 'comments:all';
    cache.delete(key);
    pending.delete(key);
    await fetchComments();
  }, [fetchComments]);

  const refetchTemplates = useCallback(async () => {
    const keys = ['templates:all', 'templates:highlight:true'];
    keys.forEach(key => {
      cache.delete(key);
      pending.delete(key);
    });
    await Promise.all([fetchAllTemplates(), fetchHighlightedTemplates()]);
  }, [fetchAllTemplates, fetchHighlightedTemplates]);

  // ---- Clear user data on logout ----
  const clearUserData = useCallback(() => {
    setProfile(null);
    setCampaigns([]);
    setSupportTickets([]);
    setStats({ totalCampaigns: 0, totalViews: 0, totalUnlocks: 0, totalShares: 0, totalCompletions: 0, successfulCampaigns: 0 });
    const user = auth.currentUser;
    if (user) {
      cache.delete(`profile:${user.uid}`);
      cache.delete(`stats:${user.uid}`);
      cache.delete(`campaigns:${user.uid}`);
      cache.delete(`support:${user.uid}`);
    }
  }, []);

  return {
    templates,
    featuredTemplates,
    profile,
    campaigns,
    supportTickets,
    comments,
    stats,
    loadingState,
    dataLoaded,        // true from start – UI never waits
    loadAllData,
    refetchProfile,
    refetchCampaigns,
    refetchStats,
    refetchSupportTickets,
    refetchComments,
    refetchTemplates,
    clearUserData,
  };
}