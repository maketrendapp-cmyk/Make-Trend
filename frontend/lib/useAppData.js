// lib/useAppData.js
// ============================================================
// SINGLETON FETCH – All data loaded once, shared globally
// ============================================================

import { useState, useCallback, useEffect } from 'react';
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

let fetchPromise = null;
let isFetching = false;

// ── Master fetcher – runs only once ──
async function fetchAllData() {
  if (isFetching) return fetchPromise;
  if (fetchPromise) return fetchPromise;

  isFetching = true;
  fetchPromise = (async () => {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      const [
        profileData,
        statsData,
        templatesData,
        highlightsData,
        campaignsData,
        supportData,
        commentsData,
      ] = await Promise.all([
        user ? apiRequest('/auth/me', {}, token) : Promise.resolve(null),
        user ? apiRequest('/stats', {}, token) : Promise.resolve(null),
        apiRequest('/templates'),
        apiRequest('/templates?highlight=true'),
        user ? apiRequest('/campaigns?limit=25', {}, token) : Promise.resolve(null),
        user ? apiRequest('/support', {}, token) : Promise.resolve(null),
        apiRequest('/comments'),
      ]);

      cache.profile = profileData?.user ? { uid: user?.uid, ...profileData.user, completed: true } : null;
      cache.stats = statsData?.stats || { totalCampaigns: 0, totalViews: 0, totalUnlocks: 0, totalShares: 0, totalCompletions: 0, successfulCampaigns: 0 };
      cache.campaigns = campaignsData?.campaigns || [];
      cache.supportTickets = supportData?.tickets || [];
      cache.templates = templatesData?.templates || [];
      cache.featuredTemplates = (highlightsData?.templates || []).filter(t => t.isHighlight === true);
      cache.comments = commentsData?.comments || [];

    } catch (err) {
      toast.error('Some data failed to load');
      throw err;
    } finally {
      isFetching = false;
    }
  })();

  return fetchPromise;
}

// ── Subscriber pattern for cache updates ──
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

// ── React Hook ──
export function useAppData() {
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
    profile: true,
    stats: true,
    campaigns: true,
    supportTickets: true,
    templates: true,
    featuredTemplates: true,
    comments: true,
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

  useEffect(() => {
    if (dataLoaded) return;

    fetchAllData()
      .then(() => {
        setDataLoaded(true);
        setLoadingState({
          profile: false,
          stats: false,
          campaigns: false,
          supportTickets: false,
          templates: false,
          featuredTemplates: false,
          comments: false,
        });
      })
      .catch(() => {
        setLoadingState({
          profile: false,
          stats: false,
          campaigns: false,
          supportTickets: false,
          templates: false,
          featuredTemplates: false,
          comments: false,
        });
      });
  }, []);

  // ── Refetch helpers ──
  const refetchProfile = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const res = await apiRequest('/auth/me', {}, token);
    if (res.success && res.user) {
      cache.profile = { uid: user.uid, ...res.user, completed: true };
      notifySubscribers();
    }
  }, []);

  const refetchStats = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const res = await apiRequest('/stats', {}, token);
    if (res.success) {
      cache.stats = res.stats;
      notifySubscribers();
    }
  }, []);

  const refetchCampaigns = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const res = await apiRequest('/campaigns?limit=25', {}, token);
    if (res.success) {
      cache.campaigns = res.campaigns || [];
      notifySubscribers();
    }
  }, []);

  const refetchSupportTickets = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const res = await apiRequest('/support', {}, token);
    if (res.success) {
      cache.supportTickets = res.tickets || [];
      notifySubscribers();
    }
  }, []);

  const refetchTemplates = useCallback(async () => {
    const [templatesRes, highlightsRes] = await Promise.all([
      apiRequest('/templates'),
      apiRequest('/templates?highlight=true'),
    ]);
    cache.templates = templatesRes.templates || [];
    cache.featuredTemplates = (highlightsRes.templates || []).filter(t => t.isHighlight === true);
    notifySubscribers();
  }, []);

  const refetchComments = useCallback(async () => {
    const res = await apiRequest('/comments');
    if (res.success) {
      cache.comments = res.comments || [];
      notifySubscribers();
    }
  }, []);

  const clearUserData = useCallback(() => {
    cache.profile = null;
    cache.stats = { totalCampaigns: 0, totalViews: 0, totalUnlocks: 0, totalShares: 0, totalCompletions: 0, successfulCampaigns: 0 };
    cache.campaigns = [];
    cache.supportTickets = [];
    notifySubscribers();
  }, []);

  return {
    // ── Data ──
    profile: data.profile,
    stats: data.stats,
    campaigns: data.campaigns,
    supportTickets: data.supportTickets,
    templates: data.templates,
    featuredTemplates: data.featuredTemplates,
    comments: data.comments,
    // ── Status ──
    loadingState,
    dataLoaded,
    // ── Actions ──
    refetchProfile,
    refetchStats,
    refetchCampaigns,
    refetchSupportTickets,
    refetchTemplates,
    refetchComments,
    clearUserData,
  };
}