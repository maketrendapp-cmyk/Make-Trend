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

// ── NEW: Withdrawal Queries ──

export function useMtCoins(enabled = false) {
  return useQuery({
    queryKey: ['mtCoins'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return { earned: 0, spent: 0, available: 0, usdValue: 0, stats: { views: 0, shares: 0, completions: 0, unlocks: 0 } };
      const data = await apiRequest('/mt-coins', {}, token);
      return data.mtCoins || { earned: 0, spent: 0, available: 0, usdValue: 0, stats: { views: 0, shares: 0, completions: 0, unlocks: 0 } };
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useWithdrawalMethods() {
  return useQuery({
    queryKey: ['withdrawalMethods'],
    queryFn: async () => {
      const data = await apiRequest('/withdrawal-methods');
      return data.methods || [];
    },
    staleTime: 3600 * 1000, // 1 hour
  });
}

export function useWithdrawals(enabled = false) {
  return useQuery({
    queryKey: ['withdrawals'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      const data = await apiRequest('/withdrawals', {}, token);
      return data.withdrawals || [];
    },
    enabled,
    staleTime: 60 * 1000,
  });
}

// ── Mutations ──

export function useCreateWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mtCoins, method, details }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest('/withdrawals', {
        method: 'POST',
        body: { mtCoins, method, details },
      }, token);
      return data;
    },
    onSuccess: () => {
      // Invalidate all relevant queries after successful withdrawal
      queryClient.invalidateQueries(['mtCoins']);
      queryClient.invalidateQueries(['withdrawals']);
      queryClient.invalidateQueries(['stats']);
      queryClient.invalidateQueries(['profile']);
      toast.success('Withdrawal request submitted successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit withdrawal');
    },
  });
}

// ── Invalidation helper ──
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
    // ── NEW: Invalidation for withdrawal data ──
    invalidateMtCoins: () => queryClient.invalidateQueries(['mtCoins']),
    invalidateWithdrawals: () => queryClient.invalidateQueries(['withdrawals']),
    invalidateWithdrawalMethods: () => queryClient.invalidateQueries(['withdrawalMethods']),
    invalidateAll: () => {
      queryClient.invalidateQueries(['profile']);
      queryClient.invalidateQueries(['stats']);
      queryClient.invalidateQueries(['campaigns']);
      queryClient.invalidateQueries(['templates']);
      queryClient.invalidateQueries(['featuredTemplates']);
      queryClient.invalidateQueries(['supportTickets']);
      queryClient.invalidateQueries(['comments']);
      queryClient.invalidateQueries(['mtCoins']);
      queryClient.invalidateQueries(['withdrawals']);
      queryClient.invalidateQueries(['withdrawalMethods']);
    },
  };
}