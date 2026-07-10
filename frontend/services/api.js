// frontend/services/api.js
import axios from 'axios';
import { auth } from './firebase';

// Create Axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ============================================================
// REQUEST INTERCEPTOR: Automatically attach Firebase token
// ============================================================
api.interceptors.request.use(
  async (config) => {
    // Skip auth header for public endpoints (optional)
    const publicEndpoints = ['/auth/check-username', '/auth/check-email', '/auth/profile', '/campaigns'];
    const isPublic = publicEndpoints.some((endpoint) => config.url?.includes(endpoint));

    if (!isPublic) {
      try {
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken(true); // Force refresh if expired
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('[API] Failed to get token:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// RESPONSE INTERCEPTOR: Handle token expiration globally
// ============================================================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired (401) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const user = auth.currentUser;
        if (user) {
          const newToken = await user.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, user needs to login again
        console.error('[API] Token refresh failed:', refreshError);
        // Optionally redirect to login
        if (typeof window !== 'undefined') {
          // window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;