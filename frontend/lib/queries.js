// lib/queries.js
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { auth } from '../services/firebase';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');

const requestCache = new Map();

async function apiRequest(endpoint, options = {}, token = null) {
  const cacheKey = `${endpoint}-${JSON.stringify(options)}-${token || 'no-token'}`;
  if (requestCache.has(cacheKey)) return requestCache.get(cacheKey);

  const url = `${BACKEND_URL}/api${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body) options.body = JSON.stringify(options.body);

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');

  requestCache.set(cacheKey, data);
  setTimeout(() => requestCache.delete(cacheKey), 5000);
  return data;
}

async function getToken() {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(false);
}

// ── Profile ──
export function useProfile(enabled = false) {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      const data = await apiRequest('/auth/me', {}, token);
      if (data.user) {
        return {
          uid: data.user.uid || '',
          username: data.user.username || '',
          fullname: data.user.fullname || '',
          email: data.user.email || '',
          avatar: data.user.avatar || '',
          plan: data.user.plan || 'free',
          referralCode: data.user.referralCode || '',
          referrals: data.user.referrals || 0,
          completed: data.user.completed || false,
          isBanned: data.user.isBanned || false,
          mtCoinsEarned: data.user.mtCoinsEarned || 0,
          mtCoinsSpent: data.user.mtCoinsSpent || 0,
          proExpiry: data.user.proExpiry || null,
          createdAt: data.user.createdAt || null,
          lastLogin: data.user.lastLogin || null,
        };
      }
      return null;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    placeholderData: {
      uid: '',
      username: '',
      fullname: '',
      email: '',
      avatar: '',
      plan: 'free',
      referralCode: '',
      referrals: 0,
      completed: false,
      isBanned: false,
      mtCoinsEarned: 0,
      mtCoinsSpent: 0,
      proExpiry: null,
      createdAt: null,
      lastLogin: null,
    },
  });
}

// ── Stats ──
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

// ── Templates ──
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
    enabled: hasFilters || !initialData || (Array.isArray(initialData) && initialData.length === 0),
  });
}

// ── Campaigns ──
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

// ── Support Tickets ──
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

// ── Comments ──
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

// ── NEW: MT Coins ──
export function useMtCoins(enabled = false) {
  return useQuery({
    queryKey: ['mtCoins'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return { available: 0, earned: 0, spent: 0, usdValue: 0 };
      const data = await apiRequest('/mt-coins', {}, token);
      return data.mtCoins || { available: 0, earned: 0, spent: 0, usdValue: 0 };
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

// ── NEW: Withdrawal Methods ──
export function useWithdrawalMethods(enabled = false) {
  return useQuery({
    queryKey: ['withdrawalMethods'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      const data = await apiRequest('/withdrawal-methods', {}, token);
      return data.methods || [];
    },
    enabled,
    staleTime: 3600 * 1000, // 1 hour
  });
}

// ── NEW: Withdrawals History ──
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

// ── NEW: Create Withdrawal ──
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