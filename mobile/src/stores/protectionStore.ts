/**
 * Protection Store
 * Manages VPN and DNS protection state
 */

import { create } from 'zustand';
import { api } from '../api/client';

export interface Stats {
  total_queries: number;
  blocked_queries: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
  block_rate: number;
  blocklist_size: number;
}

export interface PrivacyMetrics {
  privacy_score: number;
  trackers_blocked: number;
  ad_requests_blocked: number;
  analytics_blocked: number;
  privacy_grade: string;
  trend_data: { time: string; score: number }[];
  tracker_categories: { name: string; count: number }[];
}

export interface ListStats {
  blocklistSize: number;
  allowlistSize: number;
}

interface ProtectionState {
  // State
  isVPNConnected: boolean;
  isDNSEnabled: boolean;
  isLoading: boolean;
  stats: Stats | null;
  privacyMetrics: PrivacyMetrics | null;
  listStats: ListStats | null;
  error: string | null;

  // Actions
  setVPNConnected: (connected: boolean) => void;
  setDNSEnabled: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Data fetching
  fetchStats: () => Promise<void>;
  fetchPrivacyMetrics: () => Promise<void>;
  fetchListStats: () => Promise<void>;
  refreshAll: () => Promise<void>;

  // VPN operations (stubs for native module integration)
  connectVPN: () => Promise<void>;
  disconnectVPN: () => Promise<void>;
  toggleVPN: () => Promise<void>;
}

export const useProtectionStore = create<ProtectionState>((set, get) => ({
  // Initial state
  isVPNConnected: false,
  isDNSEnabled: false,
  isLoading: false,
  stats: null,
  privacyMetrics: null,
  listStats: null,
  error: null,

  // State setters
  setVPNConnected: (isVPNConnected) => set({ isVPNConnected }),
  setDNSEnabled: (isDNSEnabled) => set({ isDNSEnabled }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Fetch stats
  fetchStats: async () => {
    try {
      const response = await api.stats.get();
      set({ stats: response.data });
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
      set({ error: 'Failed to fetch stats' });
    }
  },

  // Fetch privacy metrics
  fetchPrivacyMetrics: async () => {
    try {
      const response = await api.stats.privacyMetrics();
      set({ privacyMetrics: response.data });
    } catch (error: any) {
      console.error('Failed to fetch privacy metrics:', error);
    }
  },

  // Fetch blocklist/allowlist stats
  fetchListStats: async () => {
    try {
      const response = await api.lists.getBlocklistStats();
      set({
        listStats: {
          blocklistSize: response.data.total_blocked_domains || response.data.blocklist_size || 0,
          allowlistSize: response.data.allowlist_size || 0,
        },
      });
    } catch (error: any) {
      console.error('Failed to fetch list stats:', error);
    }
  },

  // Refresh all data
  refreshAll: async () => {
    set({ isLoading: true });
    try {
      await Promise.all([
        get().fetchStats(),
        get().fetchPrivacyMetrics(),
        get().fetchListStats(),
      ]);
    } finally {
      set({ isLoading: false });
    }
  },

  // VPN operations (to be implemented with native modules)
  connectVPN: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implement native VPN connection
      // await NativeModules.VPNModule.connect();
      set({ isVPNConnected: true, isDNSEnabled: true });
    } catch (error: any) {
      set({ error: 'Failed to connect VPN' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  disconnectVPN: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implement native VPN disconnection
      // await NativeModules.VPNModule.disconnect();
      set({ isVPNConnected: false });
    } catch (error: any) {
      set({ error: 'Failed to disconnect VPN' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  toggleVPN: async () => {
    const { isVPNConnected } = get();
    if (isVPNConnected) {
      await get().disconnectVPN();
    } else {
      await get().connectVPN();
    }
  },
}));
