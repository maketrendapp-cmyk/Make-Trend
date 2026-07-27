// lib/queries.js
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { auth } from '../services/firebase';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');

const requestCache = new Map();

async function apiRequest(endpoint, options = {}, token = null) {
  const cacheKey = `${endpoint}-${JSON.stringify(options)}-${token || 'no-token'}`;
  
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }

  const url = `${BACKEND_URL}/api${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body) {
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  
  requestCache.set(cacheKey, data);
  setTimeout(() => requestCache.delete(cacheKey), 5000); // 5s TTL

  return data;
}

// ── Get user token ──
async function getToken() {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(false); // false = use cached token if still valid
}

// ── Queries ──
export function useProfile(enabled = false) {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      const data = await apiRequest('/auth/me', {}, token);
      return data.user ? { ...data.user, completed: true } : null;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useStats(enabled = false) {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return { totalCampaigns: 0, totalViews: 0, totalUnlocks: 0, totalShares: 0, totalCompletions: 0, successfulCampaigns: 0 };
      const data = await apiRequest('/stats', {}, token);
      return data.stats || {};
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useTemplates(filters = {}, initialData = null) {
  const queryString = new URLSearchParams(filters).toString();
  const queryKey = ['templates', filters];
  const hasFilters = Object.keys(filters).length > 0;
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = queryString ? `/templates?${queryString}` : '/templates';
      const data = await apiRequest(url);
      return data.templates || [];
    },
    initialData: initialData || undefined,
    staleTime: 5 * 60 * 1000,
    // Only fetch if filters are applied OR no initial data
    enabled: hasFilters || !initialData || (Array.isArray(initialData) && initialData.length === 0),
  });
}

export function useFeaturedTemplates(filters = {}, initialData = null) {
  const queryString = new URLSearchParams({ highlight: true, ...filters }).toString();
  const queryKey = ['featuredTemplates', filters];
  const hasFilters = Object.keys(filters).length > 0;
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const data = await apiRequest(`/templates?${queryString}`);
      return (data.templates || []).filter(t => t.isHighlight === true);
    },
    initialData: initialData || undefined,
    staleTime: 5 * 60 * 1000,
    // Only fetch if filters are applied OR no initial data
    enabled: hasFilters || !initialData || (Array.isArray(initialData) && initialData.length === 0),
  });
}

export function useCampaigns(enabled = false) {
  return useInfiniteQuery({
    queryKey: ['campaigns'],
    queryFn: async ({ pageParam = null }) => {
      const token = await getToken();
      if (!token) return { campaigns: [], nextCursor: null };
      let url = '/campaigns?limit=25';
      if (pageParam) {
        url += `&lastCreatedAt=${pageParam.lastCreatedAt}&lastId=${pageParam.lastId}`;
      }
      const data = await apiRequest(url, {}, token);
      return {
        campaigns: data.campaigns || [],
        nextCursor: data.hasMore ? {
          lastCreatedAt: data.lastCreatedAt,
          lastId: data.lastId,
        } : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSupportTickets(enabled = false) {
  return useQuery({
    queryKey: ['supportTickets'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      const data = await apiRequest('/support', {}, token);
      return data.tickets || [];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useComments() {
  return useQuery({
    queryKey: ['comments'],
    queryFn: async () => {
      const data = await apiRequest('/comments');
      return data.comments || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutations (for creating/updating data) ──
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  return {
    invalidateProfile: () => queryClient.invalidateQueries(['profile']),
    invalidateStats: () => queryClient.invalidateQueries(['stats']),
    invalidateCampaigns: () => queryClient.invalidateQueries(['campaigns']),
    invalidateTemplates: () => queryClient.invalidateQueries(['templates']),
    invalidateFeaturedTemplates: () => queryClient.invalidateQueries(['featuredTemplates']),
    invalidateSupportTickets: () => queryClient.invalidateQueries(['supportTickets']),
    invalidateComments: () => queryClient.invalidateQueries(['comments']),
    invalidateAll: () => {
      queryClient.invalidateQueries(['profile']);
      queryClient.invalidateQueries(['stats']);
      queryClient.invalidateQueries(['campaigns']);
      queryClient.invalidateQueries(['templates']);
      queryClient.invalidateQueries(['featuredTemplates']);
      queryClient.invalidateQueries(['supportTickets']);
      queryClient.invalidateQueries(['comments']);
    },
  };
}