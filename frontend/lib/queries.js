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

// ── Public user profile (fetch by UID) ──
export function usePublicUser(uid) {
  return useQuery({
    queryKey: ['publicUser', uid],
    queryFn: async () => {
      if (!uid) return null;
      const data = await apiRequest(`/users/${uid}`, {}, null); // no token needed
      return data.user || null;
    },
    enabled: !!uid,
    staleTime: 5 * 60 * 1000, // matches backend cache
    retry: 1,
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

// ── Campaigns (with server-side filters, search, and pagination) ──
export function useCampaigns(filters = {}, enabled = true) {
  const { status, search, feature } = filters;
  // Build a stable query key that includes all filter values
  const queryKey = ['campaigns', { status, search, feature }];

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      const token = await getToken();
      if (!token) return { campaigns: [], nextCursor: null };

      const params = new URLSearchParams({ limit: 25 });
      if (status && status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      if (feature && feature !== 'all') params.append('feature', feature);
      if (pageParam) {
        params.append('lastCreatedAt', pageParam.lastCreatedAt);
        params.append('lastId', pageParam.lastId);
      }

      const url = `/campaigns?${params.toString()}`;
      const data = await apiRequest(url, {}, token);
      return {
        campaigns: data.campaigns || [],
        nextCursor: data.hasMore ? {
          lastCreatedAt: data.lastCreatedAt,
          lastId: data.lastId,
        } : null,
      };
    },
    enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true, // prevents flicker when filters change
  });
}

// ── Support Tickets (infinite scroll with pagination) ──
export function useSupportTickets(enabled = true) {
  return useInfiniteQuery({
    queryKey: ['supportTickets'],
    queryFn: async ({ pageParam = null }) => {
      const token = await getToken();
      if (!token) return { tickets: [], nextCursor: null };
      let url = `/support?limit=20`;
      if (pageParam) {
        url += `&lastId=${pageParam}`;
      }
      const data = await apiRequest(url, {}, token);
      return {
        tickets: data.tickets || [],
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

// ── Grow Feed (infinite scroll with filters) – PUBLIC ──
export function useGrowFeed(filters = {}, enabled = true) {
  const { platform, taskType, search } = filters; // ✅ Added 'search'
  const queryKey = ['growFeed', { platform, taskType, search }]; // ✅ Added 'search' to queryKey
  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams({ limit: 20 });
      if (platform) params.append('platform', platform);
      if (taskType) params.append('taskType', taskType);
      if (search) params.append('search', search); // ✅ Added search param
      if (pageParam) params.append('lastTaskId', pageParam);
      const url = `/grow-feed?${params.toString()}`;
      // Get token if logged in, otherwise null
      const token = await getToken().catch(() => null);
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
// ── My Tasks (infinite scroll with filters) ──
export function useMyTasks(filters = {}, enabled = true) {
  const { status, platform, taskType } = filters;
  const queryKey = ['myTasks', { status, platform, taskType }];

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      const token = await getToken();
      if (!token) return { tasks: [], nextCursor: null };

      const params = new URLSearchParams({
        limit: 20,
      });
      if (status && status !== 'all') params.append('status', status);
      if (platform) params.append('platform', platform);
      if (taskType) params.append('taskType', taskType);
      if (pageParam) params.append('lastId', pageParam);

      const url = `/social-tasks?${params.toString()}`;
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

// ── Update exchange status (done / cancel) ──
export function useUpdateExchangeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/exchanges/${id}/status`, {
        method: 'PUT',
        body: { status },
      }, token);
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate the exchange detail cache so the page refreshes
      queryClient.invalidateQueries(['exchangeDetail', variables.id]);
      // Also invalidate exchanges list caches if needed
      queryClient.invalidateQueries(['myExchanges']);
      toast.success('Exchange status updated!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update exchange status');
    },
  });
}

// ── 🚀 PRODUCT TREND QUERIES ──

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
      // ✅ Send token if available
      const token = await getToken().catch(() => null);
      const data = await apiRequest(url, {}, token);
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

// 2. Product Detail – PUBLIC
export function useProductDetail(id, enabled = true) {
  return useQuery({
    queryKey: ['productDetail', id],
    queryFn: async () => {
      // ✅ Send token if available
      const token = await getToken().catch(() => null);
      const data = await apiRequest(`/productstrend/products/${id}`, {}, token);
      return data.product;
    },
    enabled: !!id && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// 3. My Products (infinite scroll with filters)
export function useMyProducts(filters = {}, enabled = true) {
  const { status, category } = filters;
  const queryKey = ['myProducts', { status, category }];

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const params = new URLSearchParams({
        limit: 20,
      });
      if (status) params.append('status', status);
      if (category) params.append('category', category);
      if (pageParam) params.append('lastId', pageParam);

      const data = await apiRequest(`/productstrend/my-products?${params.toString()}`, {}, token);
      return {
        products: data.products || [],
        nextCursor: data.hasMore ? data.lastId : null,
      };
    },
    enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// 4. Product Comments – PUBLIC (infinite scroll)
export function useProductComments(productId, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['productComments', productId],
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams({ limit: 20 });
      if (pageParam) params.append('lastId', pageParam);
      const data = await apiRequest(`/productstrend/products/${productId}/comments?${params.toString()}`, {}, null);
      return {
        comments: data.comments || [],
        nextCursor: data.hasMore ? data.lastId : null,
      };
    },
    enabled: !!productId && enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
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
      queryClient.invalidateQueries({ queryKey: ['productFeed'] });
      queryClient.invalidateQueries({ queryKey: ['myProducts'] });
      // Optionally refetch the first page of myProducts immediately
      queryClient.refetchQueries({ queryKey: ['myProducts'], type: 'active', exact: false });
      toast.success('Product launched successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to launch product');
    },
  });
}

// 6. Upvote Product Mutation – Optimistic, no invalidations
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

// 7. Add Product Comment Mutation – Optimistic, no invalidations
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
      queryClient.invalidateQueries({ queryKey: ['productFeed'] });
      queryClient.invalidateQueries({ queryKey: ['myProducts'] });
      // Toast removed – component will handle it
    },
    onError: (error) => {
      // Toast removed – component will handle it
      console.error('Delete product error:', error);
    },
  });
}

// ── Buy Upvotes ──
export function useBuyUpvotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, amount }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/productstrend/products/${productId}/buy-upvote`, {
        method: 'POST',
        body: { amount },
      }, token);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['productDetail', variables.productId]);
      queryClient.invalidateQueries(['productFeed']);
      queryClient.invalidateQueries(['mtCoins']);
      queryClient.invalidateQueries(['myProducts']);
      queryClient.invalidateQueries(['notifications']);
      // Toast handled in component
    },
    onError: (error) => {
      // Toast handled in component
      console.error('Buy upvote error:', error);
    },
  });
}

// ── 🌍 COMMUNITY POSTS QUERIES ──

// 1. Fetch posts feed (infinite scroll, public, with category & type filters)
// Supports: search (text or @username), userId (filter by user), sort ('newest' or 'most-liked')
export function usePosts(filters = {}, enabled = true) {
  const { category, type, search, userId, sort, limit = 20 } = filters;
  const queryKey = ['posts', { category, type, search, userId, sort, limit }];
  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (category && category !== 'all') params.append('category', category);
      if (type && type !== 'all') params.append('type', type);
      if (search) params.append('search', search);
      if (userId) params.append('userId', userId);
      if (sort) params.append('sort', sort);
      if (pageParam) params.append('lastId', pageParam);
      const url = `/posts?${params.toString()}`;
      const token = await getToken().catch(() => null);
      const data = await apiRequest(url, {}, token);
      return {
        posts: data.posts || [],
        nextCursor: data.hasMore ? data.lastId : null,
      };
    },
    enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
}

// 2. Fetch a single post (public)
export function usePost(id, enabled = true) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const token = await getToken().catch(() => null);
      const data = await apiRequest(`/posts/${id}`, {}, token);
      return data.post;
    },
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// 3. Create a post (authenticated) – invalidates feed only
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
      queryClient.invalidateQueries(['posts']);
      queryClient.invalidateQueries(['myPosts']); // Add this line
      toast.success('Post created successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create post');
    },
  });
}

// 4. Update a post – invalidates feed + single post
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
      queryClient.invalidateQueries(['posts']);
      queryClient.invalidateQueries(['post', variables.id]);
      queryClient.invalidateQueries(['myPosts']); // Add this line
      toast.success('Post updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update post');
    },
  });
}

// 5. Like/unlike a post – Simple mutation, UI updates handled by components
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


// 6. Add a comment – simple mutation, UI updates handled by components
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

// 7. Delete a post – invalidates feed + single post + myPosts (with reset for infinite queries)
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
      queryClient.invalidateQueries({ queryKey: ['posts'], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['post', postId], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['myPosts'], refetchType: 'active' });
      queryClient.resetQueries({ queryKey: ['myPosts'] });
      // Toast is handled in the component
    },
    onError: (error) => {
      // Toast is handled in the component
      console.error('Delete post error:', error);
    },
  });
}

// 8. Get post comments (infinite scroll, public)
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

// 9. Get current user's posts (authenticated, with filters & pagination)
export function useMyPosts(filters = {}, enabled = true) {
  const { category, type, search } = filters;
  const queryKey = ['myPosts', { category, type, search }];

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = null }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const params = new URLSearchParams({ limit: 20 });
      if (category && category !== 'all') params.append('category', category);
      if (type && type !== 'all') params.append('type', type);
      if (search) params.append('search', search);
      if (pageParam) params.append('lastId', pageParam);

      const data = await apiRequest(`/my-posts?${params.toString()}`, {}, token);
      return {
        posts: data.posts || [],
        nextCursor: data.hasMore ? data.lastId : null,
      };
    },
    enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ── Buy Likes for Post ──
export function useBuyPostLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, amount }) => {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');
      const data = await apiRequest(`/posts/${postId}/buy-like`, {
        method: 'POST',
        body: { amount },
      }, token);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['post', variables.postId]);
      queryClient.invalidateQueries(['posts']);
      queryClient.invalidateQueries(['myPosts']);
      queryClient.invalidateQueries(['mtCoins']);
      queryClient.invalidateQueries(['notifications']);
      // Toast is handled in the component
    },
    onError: (error) => {
      // Toast is handled in the component
      console.error('Buy like error:', error);
    },
  });
}

// ── 🔔 NOTIFICATION QUERIES ──

// 1. Personal notifications (infinite scroll)
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

// 2. System notifications (global, read once per user)
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

// 3. Mark a single notification as read
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
      queryClient.invalidateQueries(['notifications']);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark as read');
    },
  });
}

// 4. Mark all personal notifications as read
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
      queryClient.invalidateQueries(['notifications']);
      toast.success('All notifications marked as read');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to mark all as read');
    },
  });
}

// 5. Mark all system notifications as read
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
      queryClient.invalidateQueries(['systemNotifications']);
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
    invalidateProductFeed: () => queryClient.invalidateQueries(['productFeed']),
    invalidateProductDetail: (id) => queryClient.invalidateQueries(['productDetail', id]),
    invalidateMyProducts: () => {
  queryClient.invalidateQueries({ queryKey: ['myProducts'], exact: false, refetchType: 'all' });
  // Force refetch all pages immediately
  queryClient.refetchQueries({ queryKey: ['myProducts'], exact: false });
},
    invalidateProductComments: (id) => queryClient.invalidateQueries(['productComments', id]),
    invalidateNotifications: () => queryClient.invalidateQueries(['notifications']),
    invalidateSystemNotifications: () => queryClient.invalidateQueries(['systemNotifications']),
    invalidateAllNotifications: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['systemNotifications']);
    },
    invalidatePost: (id) => queryClient.invalidateQueries(['post', id]),
    invalidatePosts: () => queryClient.invalidateQueries(['posts']),
    invalidatePostComments: (postId) => queryClient.invalidateQueries(['postComments', postId]),
    invalidateMyPosts: () => queryClient.invalidateQueries(['myPosts']),
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
     queryClient.invalidateQueries({ queryKey: ['productFeed'] });
queryClient.invalidateQueries({ queryKey: ['myProducts'] });
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['systemNotifications']);
      queryClient.invalidateQueries(['posts']);
      // Inside invalidateAll
      queryClient.invalidateQueries(['myPosts']);
      // productDetail, productComments, post, postComments, userProfile keys are dynamic, so skip here
    },
  };
}