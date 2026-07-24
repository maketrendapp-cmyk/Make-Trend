// lib/api.js
import axios from 'axios';
import { auth } from '../services/firebase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
if (!BACKEND_URL) throw new Error('Missing NEXT_PUBLIC_BACKEND_URL');
const API_BASE = `${BACKEND_URL}/api`;

// ── Client‑side fetcher (adds token if available) ──
export const apiClient = axios.create({
  baseURL: API_BASE,
});

apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Simple fetch wrapper for server‑side (no token) ──
export const serverFetch = (url, options = {}) => {
  return fetch(`${API_BASE}${url}`, options).then((res) => res.json());
};

// ── Default export for convenience ──
export default {
  apiClient,
  serverFetch,
};