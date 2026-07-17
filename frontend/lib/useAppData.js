// lib/useAppData.js
// ============================================================
// ALL DATA FETCHING LOGIC – with localStorage caching for instant load
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { auth } from '../services/firebase';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com/api';

// ── Cache helpers ──
const CACHE_PREFIX = 'makeTrend_';

function getCache(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Check if cache is expired (5 minutes)
    if (data.expiry && Date.now() > data.expiry) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    return data.value;
  } catch {
    return null;
  }
}

function setCache(key, value, ttlMinutes = 5) {
  if (typeof window === 'undefined') return;
  try {
    const data = {
      value,
      expiry: Date.now() + ttlMinutes * 60 * 1000,
    };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
  } catch {}
}

function clearCache(key) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${CACHE_PREFIX}${key}`);
  } catch {}
}

function clearAllCache() {
  if (typeof window === 'undefined') return;
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch {}
}

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
  // ============================================================
  // GLOBAL DATA STATE – PREFETCHED ONCE
  // ============================================================
  // ── Initialize from cache (instantly shows data) ──
  const [templates, setTemplates] = useState(() => getCache('templates') || []);
  const [featuredTemplates, setFeaturedTemplates] = useState(() => {
    const cached = getCache('templates');
    return cached ? cached.filter(t => t.isHighlight === true) : [];
  });
  const [profile, setProfile] = useState(() => getCache('profile') || null);
  const [campaigns, setCampaigns] = useState(() => getCache('campaigns') || []);
  const [supportTickets, setSupportTickets] = useState(() => getCache('support') || []);
  const [comments, setComments] = useState(() => getCache('comments') || []);
  const [stats, setStats] = useState(() => getCache('stats') || {
    totalCampaigns: 0,
    totalViews: 0,
    totalUnlocks: 0,
    totalShares: 0,
    totalCompletions: 0,
    successfulCampaigns: 0,
  });
  
  // ── dataLoaded is true if cache exists, false otherwise ──
  const [dataLoaded, setDataLoaded] = useState(() => {
    // Check if any cache exists
    return !!(
      getCache('templates') ||
      getCache('profile') ||
      getCache('campaigns')
    );
  });

  // ============================================================
  // FETCH FUNCTIONS (with cache updates)
  // ============================================================

  const fetchTemplates = async () => {
    try {
      const data = await apiRequest('/templates');
      const all = data.templates || [];
      setTemplates(all);
      const featured = all.filter(t => t.isHighlight === true);
      setFeaturedTemplates(featured);
      setCache('templates', all, 10); // 10 minutes TTL for templates
    } catch (err) {
      console.error('Templates fetch error:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const data = await apiRequest('/auth/me', {}, token);
      let profileData;
      if (data.success) {
        profileData = data.user;
      } else {
        profileData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || '',
          avatar: firebaseUser.photoURL || '',
        };
      }
      setProfile(profileData);
      setCache('profile', profileData, 5);
    } catch (err) {
      console.error('Profile fetch error:', err);
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const fallback = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || '',
          avatar: firebaseUser.photoURL || '',
        };
        setProfile(fallback);
        setCache('profile', fallback, 5);
      }
    }
  };

  const fetchCampaigns = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const data = await apiRequest('/campaigns?limit=25', {}, token);
      const campaignsData = data.campaigns || [];
      setCampaigns(campaignsData);
      setCache('campaigns', campaignsData, 3);
    } catch (err) {
      console.error('Campaigns fetch error:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const data = await apiRequest('/stats', {}, token);
      if (data.success) {
        setStats(data.stats);
        setCache('stats', data.stats, 3);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  const fetchSupportTickets = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const data = await apiRequest('/support', {}, token);
      const tickets = data.tickets || [];
      setSupportTickets(tickets);
      setCache('support', tickets, 3);
    } catch (err) {
      console.error('Support tickets fetch error:', err);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await apiRequest('/comments');
      const commentsData = data.comments || [];
      setComments(commentsData);
      setCache('comments', commentsData, 10);
    } catch (err) {
      console.error('Comments fetch error:', err);
    }
  };

  // ============================================================
  // MASTER LOADER (called on app start AND on login)
  // ============================================================
  const loadAllData = useCallback(async () => {
    // ── If cache exists, dataLoaded is already true ──
    // Always fetch fresh data in the background
    await fetchTemplates();
    await fetchComments();

    if (auth.currentUser) {
      await fetchProfile();
      await fetchCampaigns();
      await fetchStats();
      await fetchSupportTickets();
    }

    // ── Mark data as loaded (cache exists or fetch complete) ──
    setDataLoaded(true);
  }, []);

  // ============================================================
  // LOAD PUBLIC DATA ON APP START (even without login)
  // ============================================================
  useEffect(() => {
    // If cache exists, we already show data instantly.
    // But we still fetch fresh data in the background.
    loadAllData();
  }, []); // ← Runs once when the app starts

  // ============================================================
  // REFETCH HELPERS (for after edits)
  // ============================================================
  const refetchProfile = async () => {
    await fetchProfile();
    setDataLoaded(true);
  };
  const refetchCampaigns = async () => {
    await fetchCampaigns();
    setDataLoaded(true);
  };
  const refetchStats = async () => {
    await fetchStats();
    setDataLoaded(true);
  };
  const refetchSupportTickets = async () => {
    await fetchSupportTickets();
    setDataLoaded(true);
  };
  const refetchComments = async () => {
    await fetchComments();
    setDataLoaded(true);
  };
  const refetchTemplates = async () => {
    await fetchTemplates();
    setDataLoaded(true);
  };

  // ============================================================
  // CLEAR USER DATA (on logout)
  // ============================================================
  const clearUserData = useCallback(() => {
    setProfile(null);
    setCampaigns([]);
    setSupportTickets([]);
    setStats({
      totalCampaigns: 0,
      totalViews: 0,
      totalUnlocks: 0,
      totalShares: 0,
      totalCompletions: 0,
      successfulCampaigns: 0,
    });
    // ── Clear cache for user-specific data ──
    clearCache('profile');
    clearCache('campaigns');
    clearCache('stats');
    clearCache('support');
    // Keep templates and comments (public)
    // dataLoaded remains true – public data is still available
  }, []);

  // ============================================================
  // RETURN
  // ============================================================
  return {
    templates,
    featuredTemplates,
    profile,
    campaigns,
    supportTickets,
    comments,
    stats,
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