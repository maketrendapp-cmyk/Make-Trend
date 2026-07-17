// lib/useAppData.js
// ============================================================
// ALL DATA FETCHING LOGIC – Separated from AuthScreen for better maintainability
// ============================================================

import { useState, useCallback } from 'react';
import { auth } from '../services/firebase';

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

export function useAppData() {
  // ============================================================
  // GLOBAL DATA STATE – PREFETCHED ONCE
  // ============================================================
  const [templates, setTemplates] = useState([]);
  const [featuredTemplates, setFeaturedTemplates] = useState([]);
  const [profile, setProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalViews: 0,
    totalUnlocks: 0,
    totalShares: 0,
    totalCompletions: 0,
    successfulCampaigns: 0,
  });
  const [dataLoaded, setDataLoaded] = useState(false);

  // ============================================================
  // FETCH FUNCTIONS
  // ============================================================

  const fetchTemplates = async () => {
    try {
      const data = await apiRequest('/api/templates');
      const all = data.templates || [];
      setTemplates(all);
      setFeaturedTemplates(all.filter(t => t.isHighlight === true));
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
      if (data.success) {
        setProfile(data.user);
      } else {
        setProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || '',
          avatar: firebaseUser.photoURL || '',
        });
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        setProfile({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || '',
          avatar: firebaseUser.photoURL || '',
        });
      }
    }
  };

  const fetchCampaigns = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const data = await apiRequest('/api/campaigns?limit=25', {}, token);
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error('Campaigns fetch error:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;
      const token = await firebaseUser.getIdToken();
      const data = await apiRequest('/api/stats', {}, token);
      if (data.success) {
        setStats(data.stats);
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
      const data = await apiRequest('/api/support', {}, token);
      setSupportTickets(data.tickets || []);
    } catch (err) {
      console.error('Support tickets fetch error:', err);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await apiRequest('/api/comments');
      setComments(data.comments || []);
    } catch (err) {
      console.error('Comments fetch error:', err);
    }
  };

  // ============================================================
  // MASTER LOADER (called once)
  // ============================================================
  const loadAllData = useCallback(async () => {
    if (dataLoaded) return;
    await fetchTemplates();
    await fetchComments();
    if (auth.currentUser) {
      await fetchProfile();
      await fetchCampaigns();
      await fetchStats();
      await fetchSupportTickets();
    }
    setDataLoaded(true);
  }, [dataLoaded]);

  // ============================================================
  // REFETCH HELPERS (for after edits)
  // ============================================================
  const refetchProfile = fetchProfile;
  const refetchCampaigns = fetchCampaigns;
  const refetchStats = fetchStats;
  const refetchSupportTickets = fetchSupportTickets;
  const refetchComments = fetchComments;
  const refetchTemplates = fetchTemplates;

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
    // Keep templates and comments (public)
  }, []);

  return {
    // Data
    templates,
    featuredTemplates,
    profile,
    campaigns,
    supportTickets,
    comments,
    stats,
    dataLoaded,
    // Actions
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