// lib/queries.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '../services/firebase';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://make-trend.onrender.com/api';

async function apiRequest(endpoint, options = {}, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body) {
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

// ── Get user token ──
async function getToken() {
  const user = auth.currentUser;
  return user ? await user.getIdToken() : null;
}

// ── Queries ──
export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      const data = await apiRequest('/auth/me', {}, token);
      return data.user ? { ...data.user, completed: true } : null;
    },
    enabled: !!auth.currentUser,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return { totalCampaigns: 0, totalViews: 0, totalUnlocks: 0, totalShares: 0, totalCompletions: 0, successfulCampaigns: 0 };
      const data = await apiRequest('/stats', {}, token);
      return data.stats || {};
    },
    enabled: !!auth.currentUser,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const data = await apiRequest('/templates');
      return data.templates || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useFeaturedTemplates() {
  return useQuery({
    queryKey: ['featuredTemplates'],
    queryFn: async () => {
      const data = await apiRequest('/templates?highlight=true');
      return (data.templates || []).filter(t => t.isHighlight === true);
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      const data = await apiRequest('/campaigns?limit=25', {}, token);
      return data.campaigns || [];
    },
    enabled: !!auth.currentUser,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSupportTickets() {
  return useQuery({
    queryKey: ['supportTickets'],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      const data = await apiRequest('/support', {}, token);
      return data.tickets || [];
    },
    enabled: !!auth.currentUser,
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