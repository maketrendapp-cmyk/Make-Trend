// lib/useAppData.js
// ============================================================
// PERSISTENT CACHE – All data instantly available on reload
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { auth } from '../services/firebase';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com/api';
const CACHE_PREFIX = 'maketrend_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Persistent cache helpers ──
function getCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data._expiry && Date.now() > data._expiry) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data._value;
  } catch {
    return null;
  }
}

function setCache(key, value) {
  try {
    const payload = {
      _value: value,
      _expiry: Date.now() + CACHE_TTL,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
  } catch {}
}

function removeCache(key) {
  localStorage.removeItem(CACHE_PREFIX + key);
}

// ── API helper ──
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

export function useAppData() {
  // ── State (initialised with empty defaults – will be filled by effect) ──
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalViews: 0,
    totalUnlocks: 0,
    totalShares: 0,
    totalCompletions: 0,
    successfulCampaigns: 0,
  });
  const [campaigns, setCampaigns] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [featuredTemplates, setFeaturedTemplates] = useState([]);
  const [comments, setComments] = useState([]);

  // ── Loading states ──
  const [loadingState, setLoadingState] = useState({
    profile: false,
    stats: false,
    highlights: false,
    allTemplates: false,
    campaigns: false,
    support: false,
    comments: false,
  });

  const [dataLoaded, setDataLoaded] = useState(true);

  // ── 🔄 Sync state with localStorage whenever user changes ──
  useEffect(() => {
    const user = auth.currentUser;
    const uid = user?.uid;

    if (uid) {
      // Read user-specific data from cache
      setProfile(getCache(`profile_${uid}`) || null);
      setStats(getCache(`stats_${uid}`) || {
        totalCampaigns: 0,
        totalViews: 0,
        totalUnlocks: 0,
        totalShares: 0,
        totalCompletions: 0,
        successfulCampaigns: 0,
      });
      setCampaigns(getCache(`campaigns_${uid}`) || []);
      setSupportTickets(getCache(`support_${uid}`) || []);
    } else {
      // No user – clear all user-specific data
      setProfile(null);
      setStats({
        totalCampaigns: 0,
        totalViews: 0,
        totalUnlocks: 0,
        totalShares: 0,
        totalCompletions: 0,
        successfulCampaigns: 0,
      });
      setCampaigns([]);
      setSupportTickets([]);
    }

    // Public data (templates, comments) are always read from cache
    setTemplates(getCache('templates_all') || []);
    setFeaturedTemplates(getCache('templates_highlight') || []);
    setComments(getCache('comments_all') || []);
  }, [auth.currentUser]); // ← React to user changes

  // ---- Fetch functions (write to cache after fetch) ----
  const fetchProfile = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    setLoadingState(s => ({ ...s, profile: true }));
    try {
      const token = await u.getIdToken();
      const data = await apiRequest('/auth/me', {}, token);
      if (data.success && data.user) {
        const fullProfile = { uid: u.uid, email: u.email, ...data.user, completed: true };
        setProfile(fullProfile);
        setCache(`profile_${u.uid}`, fullProfile);
      }
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoadingState(s => ({ ...s, profile: false }));
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    setLoadingState(s => ({ ...s, stats: true }));
    try {
      const token = await u.getIdToken();
      const data = await apiRequest('/stats', {}, token);
      if (data.success) {
        setStats(data.stats);
        setCache(`stats_${u.uid}`, data.stats);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    } finally {
      setLoadingState(s => ({ ...s, stats: false }));
    }
  }, []);

  const fetchHighlightedTemplates = useCallback(async () => {
    setLoadingState(s => ({ ...s, highlights: true }));
    try {
      const data = await apiRequest('/templates?highlight=true');
      const all = data.templates || [];
      const highlighted = all.filter(t => t.isHighlight === true);
      setFeaturedTemplates(highlighted);
      setCache('templates_highlight', highlighted);
    } catch (err) {
      console.error('Highlights fetch error:', err);
    } finally {
      setLoadingState(s => ({ ...s, highlights: false }));
    }
  }, []);

  const fetchAllTemplates = useCallback(async () => {
    setLoadingState(s => ({ ...s, allTemplates: true }));
    try {
      const data = await apiRequest('/templates');
      const list = data.templates || [];
      setTemplates(list);
      setCache('templates_all', list);
    } catch (err) {
      console.error('Templates fetch error:', err);
    } finally {
      setLoadingState(s => ({ ...s, allTemplates: false }));
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    setLoadingState(s => ({ ...s, campaigns: true }));
    try {
      const token = await u.getIdToken();
      const data = await apiRequest('/campaigns?limit=25', {}, token);
      const list = data.campaigns || [];
      setCampaigns(list);
      setCache(`campaigns_${u.uid}`, list);
    } catch (err) {
      console.error('Campaigns fetch error:', err);
    } finally {
      setLoadingState(s => ({ ...s, campaigns: false }));
    }
  }, []);

  const fetchSupportTickets = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    setLoadingState(s => ({ ...s, support: true }));
    try {
      const token = await u.getIdToken();
      const data = await apiRequest('/support', {}, token);
      const list = data.tickets || [];
      setSupportTickets(list);
      setCache(`support_${u.uid}`, list);
    } catch (err) {
      console.error('Support tickets fetch error:', err);
    } finally {
      setLoadingState(s => ({ ...s, support: false }));
    }
  }, []);

  const fetchComments = useCallback(async () => {
    setLoadingState(s => ({ ...s, comments: true }));
    try {
      const data = await apiRequest('/comments');
      const list = data.comments || [];
      setComments(list);
      setCache('comments_all', list);
    } catch (err) {
      console.error('Comments fetch error:', err);
    } finally {
      setLoadingState(s => ({ ...s, comments: false }));
    }
  }, []);

  // ---- Master loader ----
  const loadAllData = useCallback(async () => {
    try {
      await Promise.all([
        fetchProfile(),
        fetchStats(),
        fetchHighlightedTemplates(),
        fetchAllTemplates(),
      ]);
      await Promise.all([
        fetchCampaigns(),
        fetchSupportTickets(),
        fetchComments(),
      ]);
    } catch (err) {
      toast.error('Some data failed to load');
    }
  }, [
    fetchProfile, fetchStats, fetchHighlightedTemplates, fetchAllTemplates,
    fetchCampaigns, fetchSupportTickets, fetchComments,
  ]);

  // ── Auto‑load on mount (non‑blocking) ──
  useEffect(() => {
    loadAllData().catch(() => {});
  }, []);

  // ---- Refetch helpers ----
  const refetchProfile = useCallback(async () => {
    const u = auth.currentUser;
    if (u) {
      removeCache(`profile_${u.uid}`);
      await fetchProfile();
    }
  }, [fetchProfile]);

  const refetchStats = useCallback(async () => {
    const u = auth.currentUser;
    if (u) {
      removeCache(`stats_${u.uid}`);
      await fetchStats();
    }
  }, [fetchStats]);

  const refetchCampaigns = useCallback(async () => {
    const u = auth.currentUser;
    if (u) {
      removeCache(`campaigns_${u.uid}`);
      await fetchCampaigns();
    }
  }, [fetchCampaigns]);

  const refetchSupportTickets = useCallback(async () => {
    const u = auth.currentUser;
    if (u) {
      removeCache(`support_${u.uid}`);
      await fetchSupportTickets();
    }
  }, [fetchSupportTickets]);

  const refetchComments = useCallback(async () => {
    removeCache('comments_all');
    await fetchComments();
  }, [fetchComments]);

  const refetchTemplates = useCallback(async () => {
    removeCache('templates_all');
    removeCache('templates_highlight');
    await Promise.all([fetchAllTemplates(), fetchHighlightedTemplates()]);
  }, [fetchAllTemplates, fetchHighlightedTemplates]);

  // ---- Clear user data on logout ----
  const clearUserData = useCallback(() => {
    // Reset all user-specific state
    setProfile(null);
    setStats({ totalCampaigns: 0, totalViews: 0, totalUnlocks: 0, totalShares: 0, totalCompletions: 0, successfulCampaigns: 0 });
    setCampaigns([]);
    setSupportTickets([]);

    // Remove user-specific cache keys
    const u = auth.currentUser;
    if (u) {
      removeCache(`profile_${u.uid}`);
      removeCache(`stats_${u.uid}`);
      removeCache(`campaigns_${u.uid}`);
      removeCache(`support_${u.uid}`);
    } else {
      // If no user, clear all user-specific keys (fallback)
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          if (key.includes('profile_') || key.includes('stats_') || key.includes('campaigns_') || key.includes('support_')) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
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
    dataLoaded,
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