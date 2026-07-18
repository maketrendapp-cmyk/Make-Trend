// lib/useAppData.js
// ============================================================
// NO CACHING – Fresh data on every load
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { auth } from '../services/firebase';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com/api';

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
  // ── State ──
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

  const [loadingState, setLoadingState] = useState({
    profile: false,
    stats: false,
    highlights: false,
    allTemplates: false,
    campaigns: false,
    support: false,
    comments: false,
  });

  const [dataLoaded, setDataLoaded] = useState(false);

  // ---- Fetch functions ----
  const fetchProfile = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    setLoadingState(s => ({ ...s, profile: true }));
    try {
      const token = await u.getIdToken();
      const data = await apiRequest('/auth/me', {}, token);
      if (data.success && data.user) {
        setProfile({ uid: u.uid, email: u.email, ...data.user, completed: true });
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
      if (data.success) setStats(data.stats);
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
      setFeaturedTemplates(all.filter(t => t.isHighlight === true));
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
      setTemplates(data.templates || []);
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
      setCampaigns(data.campaigns || []);
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
      setSupportTickets(data.tickets || []);
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
      setComments(data.comments || []);
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
    } finally {
      setDataLoaded(true);
    }
  }, [
    fetchProfile, fetchStats, fetchHighlightedTemplates, fetchAllTemplates,
    fetchCampaigns, fetchSupportTickets, fetchComments,
  ]);

  // ── Load on mount ──
  useEffect(() => {
    loadAllData().catch(() => {});
  }, []);

  // ---- Refetch helpers ----
  const refetchProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const refetchStats = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  const refetchCampaigns = useCallback(async () => {
    await fetchCampaigns();
  }, [fetchCampaigns]);

  const refetchSupportTickets = useCallback(async () => {
    await fetchSupportTickets();
  }, [fetchSupportTickets]);

  const refetchComments = useCallback(async () => {
    await fetchComments();
  }, [fetchComments]);

  const refetchTemplates = useCallback(async () => {
    await Promise.all([fetchAllTemplates(), fetchHighlightedTemplates()]);
  }, [fetchAllTemplates, fetchHighlightedTemplates]);

  const clearUserData = useCallback(() => {
    setProfile(null);
    setStats({ totalCampaigns: 0, totalViews: 0, totalUnlocks: 0, totalShares: 0, totalCompletions: 0, successfulCampaigns: 0 });
    setCampaigns([]);
    setSupportTickets([]);
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