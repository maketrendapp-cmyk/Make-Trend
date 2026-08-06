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
      return data.user ? { ...data.user, completed: true } : null;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
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

// ── MT Coins ──
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

// ── Withdrawal Methods ──
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
    staleTime: 3600 * 1000,
  });
}

// ── Withdrawals History ──
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

// ── Create Withdrawal ──
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

// ── Daily Bonus Status ──
export function useDailyBonus(enabled = false) {
  return useQuery({
    queryKey: ['dailyBonus'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      const data = await apiRequest('/daily-bonus/status', {}, token);
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });
}

// ── Claim Daily Bonus ──
export function useClaimDailyBonus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest('/daily-bonus/claim', {
        method: 'POST',
        body: {},
      }, token);
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['dailyBonus'] });
        queryClient.invalidateQueries({ queryKey: ['mtCoins'] });
      }
    },
    onError: (error) => {
      console.error('Claim bonus error:', error);
    },
  });
}

// ── Referrals ──
export function useReferrals(enabled = false) {
  return useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return { referralCode: '', totalReferrals: 0, referredUsers: [], referrer: null };
      const data = await apiRequest('/auth/referrals', {}, token);
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

// ── 🔥 GROW TOGETHER QUERIES ──

// 1. Grow Feed (infinite scroll)
export function useGrowFeed(enabled = true) {
  return useInfiniteQuery({
    queryKey: ['growFeed'],
    queryFn: async ({ pageParam = null }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const url = pageParam
        ? `/grow-feed?limit=20&lastTaskId=${pageParam}`
        : '/grow-feed?limit=20';
      const data = await apiRequest(url, {}, token);
      return {
        tasks: data.tasks || [],
        nextCursor: data.hasMore ? data.lastId : null,
      };
    },
    enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// 2. My Tasks
export function useMyTasks(enabled = true) {
  return useQuery({
    queryKey: ['myTasks'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      const data = await apiRequest('/social-tasks', {}, token);
      return data.tasks || [];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 3. Available Tasks (for modal selection)
export function useAvailableTasks(enabled = true) {
  return useQuery({
    queryKey: ['availableTasks'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      const data = await apiRequest('/social-tasks/available', {}, token);
      return data.tasks || [];
    },
    enabled,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 4. My Exchanges (infinite scroll with status filter)
export function useMyExchanges(status = '', enabled = true) {
  return useInfiniteQuery({
    queryKey: ['myExchanges', status],
    queryFn: async ({ pageParam = null }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      let url = `/exchanges?limit=20`;
      if (status) url += `&status=${status}`;
      if (pageParam) url += `&lastId=${pageParam}`;
      const data = await apiRequest(url, {}, token);
      return {
        exchanges: data.exchanges || [],
        nextCursor: data.hasMore ? data.lastId : null,
      };
    },
    enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 5. Exchange Detail
export function useExchangeDetail(id, enabled = true) {
  return useQuery({
    queryKey: ['exchangeDetail', id],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/exchanges/${id}`, {}, token);
      return data.exchange;
    },
    enabled: !!id && enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ── 🚀 PRODUCT TREND QUERIES ──

// 1. Product Feed (infinite scroll with filters) – PUBLIC
// 1. Product Feed (infinite scroll with filters) – PUBLIC
export function useProductFeed(filters = {}, enabled = true) {
  const queryKey = ['productFeed', filters];
  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams({
        limit: 20,
        ...filters,
        ...(pageParam && { lastId: pageParam }),
      });
      const url = `/productstrend/feed?${params.toString()}`;
      const data = await apiRequest(url, {}, null);
      return {
        products: data.products || [],
        nextCursor: data.hasMore ? data.lastId : null,
      };
    },
    enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true, // ⬅️ Keeps old data while fetching new
  });
}

// 2. Product Detail – PUBLIC
export function useProductDetail(id, enabled = true) {
  return useQuery({
    queryKey: ['productDetail', id],
    queryFn: async () => {
      // Detail is public; no token required
      const data = await apiRequest(`/productstrend/products/${id}`, {}, null);
      return data.product;
    },
    enabled: !!id && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// 3. My Products
export function useMyProducts(enabled = true) {
  return useQuery({
    queryKey: ['myProducts'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      const data = await apiRequest('/productstrend/my-products', {}, token);
      return data.products || [];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// 4. Product Comments – PUBLIC
export function useProductComments(productId, enabled = true) {
  return useQuery({
    queryKey: ['productComments', productId],
    queryFn: async () => {
      // Comments are public; no token required
      const data = await apiRequest(`/productstrend/products/${productId}/comments`, {}, null);
      return data.comments || [];
    },
    enabled: !!productId && enabled,
    staleTime: 1 * 60 * 1000,
  });
}

// 5. Launch Product Mutation
export function useLaunchProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest('/productstrend/products', {
        method: 'POST',
        body: payload,
      }, token);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['productFeed']);
      queryClient.invalidateQueries(['myProducts']);
      toast.success('Product launched successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to launch product');
    },
  });
}

// 6. Upvote Product Mutation
export function useUpvoteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/productstrend/products/${productId}/upvote`, {
        method: 'POST',
      }, token);
      return data;
    },
    onSuccess: (data, productId) => {
      queryClient.invalidateQueries(['productFeed']);
      queryClient.invalidateQueries(['productDetail', productId]);
      queryClient.invalidateQueries(['myProducts']);
    },
  });
}

// 7. Add Product Comment Mutation
export function useAddProductComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, text }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/productstrend/products/${productId}/comments`, {
        method: 'POST',
        body: { text },
      }, token);
      return data;
    },
    onSuccess: (data, { productId }) => {
      queryClient.invalidateQueries(['productComments', productId]);
      queryClient.invalidateQueries(['productDetail', productId]);
      queryClient.invalidateQueries(['productFeed']);
    },
  });
}

// 8. Delete Product Mutation
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/productstrend/products/${productId}`, {
        method: 'DELETE',
      }, token);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['productFeed']);
      queryClient.invalidateQueries(['myProducts']);
      toast.success('Product deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete product');
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
    invalidateReferrals: () => queryClient.invalidateQueries(['referrals']),
    invalidateDailyBonus: () => queryClient.invalidateQueries(['dailyBonus']),
    invalidateGrowFeed: () => queryClient.invalidateQueries(['growFeed']),
    invalidateMyTasks: () => queryClient.invalidateQueries(['myTasks']),
    invalidateAvailableTasks: () => queryClient.invalidateQueries(['availableTasks']),
    invalidateMyExchanges: () => queryClient.invalidateQueries(['myExchanges']),
    invalidateExchangeDetail: (id) => queryClient.invalidateQueries(['exchangeDetail', id]),
    // ProductTrend invalidation helpers
    invalidateProductFeed: () => queryClient.invalidateQueries(['productFeed']),
    invalidateProductDetail: (id) => queryClient.invalidateQueries(['productDetail', id]),
    invalidateMyProducts: () => queryClient.invalidateQueries(['myProducts']),
    invalidateProductComments: (id) => queryClient.invalidateQueries(['productComments', id]),
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
      queryClient.invalidateQueries(['referrals']);
      queryClient.invalidateQueries(['dailyBonus']);
      queryClient.invalidateQueries(['growFeed']);
      queryClient.invalidateQueries(['myTasks']);
      queryClient.invalidateQueries(['availableTasks']);
      queryClient.invalidateQueries(['myExchanges']);
      queryClient.invalidateQueries(['productFeed']);
      queryClient.invalidateQueries(['myProducts']);
      // productDetail and productComments keys are dynamic, so skip here
    },
  };
}