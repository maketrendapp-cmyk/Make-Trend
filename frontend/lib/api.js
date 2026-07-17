// lib/api.js
import axios from 'axios';
import { auth } from '../services/firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://make-trend.onrender.com';

// Client‑side fetcher (adds token if available)
export const apiClient = axios.create({
  baseURL: API_BASE,
});

apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Simple fetch wrapper for server‑side (no token)
export const serverFetch = (url, options = {}) => {
  return fetch(`${API_BASE}${url}`, options).then(res => res.json());
};