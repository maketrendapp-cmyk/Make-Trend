// lib/queries.js
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { auth } from '../services/firebase';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');

const requestCache = new Map();

async function apiRequest(endpoint, options = {}, token = null) {
  const method = options.method || 'GET';
  const cacheKey = `${endpoint}-${JSON.stringify(options)}-${token || 'no-token'}`;
  
  if (method === 'GET' && requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }

  const url = `${BACKEND_URL}/api${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body) options.body = JSON.stringify(options.body);

  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');

  if (method === 'GET') {
    requestCache.set(cacheKey, data);
    setTimeout(() => requestCache.delete(cacheKey), 5000);
  }
  
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

// ── Public Profile (Handles API responses properly without crashing) ──
export function usePublicProfile(uid) {
  return useQuery({
    queryKey: ['public-profile', uid],
    queryFn: async () => {
      if (!uid) return null;
      const res = await apiRequest(`/users/${uid}`, { method: 'GET' });
      return res.user || res.profile || res; // Safely handles differing backend formats
    },
    enabled: !!uid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Do not endlessly retry on a 404
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
      queryClient.invalidateQueries({ queryKey: ['mtCoins'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
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
    keepPreviousData: true,
  });
}

export function useProductDetail(id, enabled = true) {
  return useQuery({
    queryKey: ['productDetail', id],
    queryFn: async () => {
      const data = await apiRequest(`/productstrend/products/${id}`, {}, null);
      return data.product;
    },
    enabled: !!id && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

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

export function useProductComments(productId, enabled = true) {
  return useQuery({
    queryKey: ['productComments', productId],
    queryFn: async () => {
      const data = await apiRequest(`/productstrend/products/${productId}/comments`, {}, null);
      return data.comments || [];
    },
    enabled: !!productId && enabled,
    staleTime: 1 * 60 * 1000,
  });
}

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
      queryClient.invalidateQueries({ queryKey: ['productFeed'] });
      queryClient.invalidateQueries({ queryKey: ['myProducts'] });
      toast.success('Product launched successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to launch product');
    },
  });
}

export function useUpvoteProduct() {
  return useMutation({
    mutationFn: async (productId) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/productstrend/products/${productId}/upvote`, {
        method: 'POST',
      }, token);
      return data;
    },
  });
}

export function useAddProductComment() {
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
  });
}

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
      queryClient.invalidateQueries({ queryKey: ['productFeed'] });
      queryClient.invalidateQueries({ queryKey: ['myProducts'] });
      toast.success('Product deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });
}

// ── 🌍 COMMUNITY POSTS QUERIES ──

export function usePosts(category = null, type = null, enabled = true) {
  const queryKey = ['posts', category || 'all', type || 'all'];
  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      let url = '/posts?limit=20';
      if (category && category !== 'all') {
        url += `&category=${category}`;
      }
      if (type && type !== 'all') {
        url += `&type=${type}`;
      }
      if (pageParam) {
        url += `&lastId=${pageParam}`;
      }
      const data = await apiRequest(url, {}, null);
      return {
        posts: data.posts || [],
        nextCursor: data.hasMore ? data.lastId : null,
      };
    },
    enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
}

export function usePost(id, enabled = true) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const data = await apiRequest(`/posts/${id}`, {}, null);
      return data.post;
    },
    enabled: !!id && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest('/posts', {
        method: 'POST',
        body: payload,
      }, token);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myPosts'] }); 
      toast.success('Post created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create post');
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/posts/${id}`, {
        method: 'PUT',
        body: payload,
      }, token);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['myPosts'] }); 
      toast.success('Post updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update post');
    },
  });
}

export function useLikePost() {
  return useMutation({
    mutationFn: async (postId) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/posts/${postId}/like`, {
        method: 'POST',
      }, token);
      return data;
    },
  });
}


export function useAddComment() {
  return useMutation({
    mutationFn: async ({ postId, content }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/posts/${postId}/comments`, {
        method: 'POST',
        body: { content },
      }, token);
      return data;
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/posts/${postId}`, {
        method: 'DELETE',
      }, token);
      return data;
    },
    onSuccess: (data, postId) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['myPosts'] }); 
      toast.success('Post deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete post');
    },
  });
}

export function usePostComments(postId, enabled = true) {
  const queryKey = ['postComments', postId];
  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      let url = `/posts/${postId}/comments?limit=20`;
      if (pageParam) {
        url += `&lastId=${pageParam}`;
      }
      const data = await apiRequest(url, {}, null);
      return {
        comments: data.comments || [],
        nextCursor: data.hasMore ? data.lastId : null,
      };
    },
    enabled: !!postId && enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
}

export function useMyPosts(enabled = true) {
  return useQuery({
    queryKey: ['myPosts'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest('/my-posts', {}, token);
      return data.posts || [];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ── 🔔 NOTIFICATION QUERIES ──

export function useNotifications(enabled = true) {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam = null }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const url = pageParam
        ? `/notifications?limit=20&lastId=${pageParam}`
        : '/notifications?limit=20';
      const data = await apiRequest(url, {}, token);
      return {
        notifications: data.notifications || [],
        nextCursor: data.hasMore ? data.lastId : null,
      };
    },
    enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSystemNotifications(enabled = true) {
  return useQuery({
    queryKey: ['systemNotifications'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return { notifications: [], unreadCount: 0 };
      const data = await apiRequest('/notifications/system', {}, token);
      return { notifications: data.notifications || [], unreadCount: data.unreadCount || 0 };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/notifications/${id}/read`, {
        method: 'PUT',
      }, token);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark as read');
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest('/notifications/read-all', {
        method: 'PUT',
      }, token);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark all as read');
    },
  });
}

export function useMarkSystemNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest('/notifications/system/read', {
        method: 'POST',
      }, token);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemNotifications'] });
      toast.success('All system notifications marked as read');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark system notifications as read');
    },
  });
}

// ── Invalidation helper ──
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  return {
    invalidateProfile: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
    invalidateStats: () => queryClient.invalidateQueries({ queryKey: ['stats'] }),
    invalidateCampaigns: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
    invalidateTemplates: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
    invalidateFeaturedTemplates: () => queryClient.invalidateQueries({ queryKey: ['featuredTemplates'] }),
    invalidateSupportTickets: () => queryClient.invalidateQueries({ queryKey: ['supportTickets'] }),
    invalidateComments: () => queryClient.invalidateQueries({ queryKey: ['comments'] }),
    invalidateMtCoins: () => queryClient.invalidateQueries({ queryKey: ['mtCoins'] }),
    invalidateWithdrawals: () => queryClient.invalidateQueries({ queryKey: ['withdrawals'] }),
    invalidateWithdrawalMethods: () => queryClient.invalidateQueries({ queryKey: ['withdrawalMethods'] }),
    invalidateReferrals: () => queryClient.invalidateQueries({ queryKey: ['referrals'] }),
    invalidateDailyBonus: () => queryClient.invalidateQueries({ queryKey: ['dailyBonus'] }),
    invalidateGrowFeed: () => queryClient.invalidateQueries({ queryKey: ['growFeed'] }),
    invalidateMyTasks: () => queryClient.invalidateQueries({ queryKey: ['myTasks'] }),
    invalidateAvailableTasks: () => queryClient.invalidateQueries({ queryKey: ['availableTasks'] }),
    invalidateMyExchanges: () => queryClient.invalidateQueries({ queryKey: ['myExchanges'] }),
    invalidateExchangeDetail: (id) => queryClient.invalidateQueries({ queryKey: ['exchangeDetail', id] }),
    invalidateProductFeed: () => queryClient.invalidateQueries({ queryKey: ['productFeed'] }),
    invalidateProductDetail: (id) => queryClient.invalidateQueries({ queryKey: ['productDetail', id] }),
    invalidateMyProducts: () => queryClient.invalidateQueries({ queryKey: ['myProducts'] }),
    invalidateProductComments: (id) => queryClient.invalidateQueries({ queryKey: ['productComments', id] }),
    invalidateNotifications: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    invalidateSystemNotifications: () => queryClient.invalidateQueries({ queryKey: ['systemNotifications'] }),
    invalidateAllNotifications: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['systemNotifications'] });
    },
    invalidatePost: (id) => queryClient.invalidateQueries({ queryKey: ['post', id] }),
    invalidatePosts: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
    invalidatePostComments: (postId) => queryClient.invalidateQueries({ queryKey: ['postComments', postId] }),
    invalidateMyPosts: () => queryClient.invalidateQueries({ queryKey: ['myPosts'] }),
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['featuredTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['mtCoins'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawalMethods'] });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['dailyBonus'] });
      queryClient.invalidateQueries({ queryKey: ['growFeed'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      queryClient.invalidateQueries({ queryKey: ['availableTasks'] });
      queryClient.invalidateQueries({ queryKey: ['myExchanges'] });
      queryClient.invalidateQueries({ queryKey: ['productFeed'] });
      queryClient.invalidateQueries({ queryKey: ['myProducts'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['systemNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['myPosts'] });
    },
  };
}