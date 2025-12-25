/**
 * Authentication Store
 * Manages user session, tokens, and authentication state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

export interface User {
  id: string;
  email: string;
  tier: 'free' | 'pro' | 'enterprise';
  email_verified: boolean;
  created_at: string;
}

export interface Device {
  device_id: string;
  device_name: string;
  platform: string;
  last_seen: string;
}

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  device: Device | null;
  error: string | null;

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setDevice: (device: Device) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Auth operations
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  registerDevice: (deviceName: string, platform: string, pushToken?: string) => Promise<void>;

  // Helpers
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      device: null,
      error: null,

      // State setters
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      setUser: (user) => {
        set({ user });
      },

      setDevice: (device) => {
        set({ device });
      },

      setLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error });
      },

      // Register new user
      register: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.auth.register(email, password);
          if (response.data.success) {
            // Auto-login after registration
            await get().login(email, password);
          } else {
            throw new Error(response.data.error || 'Registration failed');
          }
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Registration failed';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      // Login
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.auth.login(email, password);
          if (response.data.success) {
            const { access_token, refresh_token } = response.data.tokens;
            set({
              accessToken: access_token,
              refreshToken: refresh_token,
              isAuthenticated: true,
              isLoading: false,
            });

            // Fetch user info
            const userResponse = await api.auth.me();
            if (userResponse.data.success) {
              set({ user: userResponse.data.user });
            }
          } else {
            throw new Error(response.data.error || 'Login failed');
          }
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Login failed';
          set({ error: message, isLoading: false, isAuthenticated: false });
          throw new Error(message);
        }
      },

      // Logout
      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await api.auth.logout(refreshToken);
          }
        } catch (error) {
          // Ignore logout API errors
        } finally {
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            device: null,
            error: null,
          });
        }
      },

      // Refresh session
      refreshSession: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        try {
          const response = await api.auth.refresh(refreshToken);
          if (response.data.success) {
            const { access_token, refresh_token } = response.data.tokens;
            set({
              accessToken: access_token,
              refreshToken: refresh_token,
            });
          } else {
            throw new Error('Token refresh failed');
          }
        } catch (error) {
          await get().logout();
          throw error;
        }
      },

      // Register device
      registerDevice: async (deviceName, platform, pushToken) => {
        try {
          const response = await api.devices.register({
            device_name: deviceName,
            platform,
            push_token: pushToken,
          });
          if (response.data.success) {
            set({ device: response.data.device });
          }
        } catch (error: any) {
          console.error('Device registration failed:', error);
        }
      },

      // Check if user is authenticated
      checkAuth: async () => {
        const { accessToken, refreshToken } = get();

        if (!accessToken) {
          return false;
        }

        try {
          const response = await api.auth.me();
          if (response.data.success) {
            set({ user: response.data.user, isAuthenticated: true });
            return true;
          }
        } catch (error) {
          // Try to refresh
          if (refreshToken) {
            try {
              await get().refreshSession();
              return true;
            } catch {
              // Refresh failed
            }
          }
        }

        set({ isAuthenticated: false });
        return false;
      },
    }),
    {
      name: 'shield-ai-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        device: state.device,
      }),
    }
  )
);
