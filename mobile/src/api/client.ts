/**
 * Shield AI API Client
 * Handles all HTTP requests with JWT authentication
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

// API base URL configuration
// For local development: http://localhost:8080
// For Expo Go on physical device: Use your machine's IP
// For production: Set EXPO_PUBLIC_API_URL environment variable
const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // Use localhost for emulators/simulators
  // Android emulator uses 10.0.2.2 to access host's localhost
  const Platform = require('react-native').Platform;
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080';
  }
  return 'http://localhost:8080';
};

const API_BASE_URL = getApiUrl();

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data.tokens;
          useAuthStore.getState().setTokens(access_token, refresh_token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// API endpoints
export const api = {
  // Auth
  auth: {
    register: (email: string, password: string) =>
      apiClient.post('/api/auth/register', { email, password }),
    login: (email: string, password: string) =>
      apiClient.post('/api/auth/login', { email, password }),
    refresh: (refreshToken: string) =>
      apiClient.post('/api/auth/refresh', { refresh_token: refreshToken }),
    logout: (refreshToken: string) =>
      apiClient.post('/api/auth/logout', { refresh_token: refreshToken }),
    me: () => apiClient.get('/api/auth/me'),
  },

  // Devices (authenticated)
  devices: {
    register: (data: { device_name: string; platform: string; push_token?: string }) =>
      apiClient.post('/api/auth/devices/register', data),
    updatePushToken: (deviceId: string, pushToken: string) =>
      apiClient.put(`/api/auth/devices/${deviceId}/push-token`, { push_token: pushToken }),
    getMyDevices: () => apiClient.get('/api/auth/devices'),
    unregister: (deviceId: string) => apiClient.delete(`/api/auth/devices/${deviceId}`),
  },

  // Stats & Dashboard
  stats: {
    get: () => apiClient.get('/api/stats'),
    history: () => apiClient.get('/api/history'),
    analytics: () => apiClient.get('/api/analytics'),
    privacyMetrics: () => apiClient.get('/api/privacy-metrics'),
  },

  // DNS & Protection
  dns: {
    resolve: (domain: string) => apiClient.get(`/api/dns/resolve/${domain}`),
    analyze: (domain: string) => apiClient.get(`/api/deep/${domain}`),
    threatCheck: (domain: string) => apiClient.get(`/api/threat/check/${domain}`),
  },

  // Blocklist/Allowlist
  lists: {
    addToBlocklist: (domain: string) => apiClient.post('/api/blocklist', { domain }),
    removeFromBlocklist: (domain: string) => apiClient.delete(`/api/blocklist/${domain}`),
    addToAllowlist: (domain: string) => apiClient.post('/api/allowlist', { domain }),
    removeFromAllowlist: (domain: string) => apiClient.delete(`/api/allowlist/${domain}`),
    getBlocklistStats: () => apiClient.get('/api/blocklist/stats'),
  },

  // Tiers & Subscription
  tiers: {
    getPricing: () => apiClient.get('/api/tiers/pricing'),
    getSubscription: (userId: string) => apiClient.get(`/api/tiers/${userId}`),
    getUsage: (userId: string) => apiClient.get(`/api/tiers/${userId}/usage`),
    upgrade: (userId: string, tier: string) => apiClient.put(`/api/tiers/${userId}/upgrade`, { tier }),
    startTrial: (userId: string) => apiClient.post(`/api/tiers/${userId}/trial`),
  },

  // Profiles (Family)
  profiles: {
    list: () => apiClient.get('/api/profiles'),
    get: (id: string) => apiClient.get(`/api/profiles/${id}`),
    create: (data: { name: string; protection_level: string }) =>
      apiClient.post('/api/profiles', data),
    delete: (id: string) => apiClient.delete(`/api/profiles/${id}`),
    assignDevice: (profileId: string, deviceId: string) =>
      apiClient.post('/api/profiles/device', { profile_id: profileId, device_id: deviceId }),
    getStats: () => apiClient.get('/api/profiles/stats'),
  },

  // Devices (network)
  networkDevices: {
    list: () => apiClient.get('/api/devices'),
    update: (id: string, data: { name?: string; profile?: string }) =>
      apiClient.put(`/api/devices/${id}`, data),
  },

  // Health
  health: () => apiClient.get('/health'),
};
