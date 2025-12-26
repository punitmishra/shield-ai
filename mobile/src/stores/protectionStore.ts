/**
 * Protection Store
 * Manages VPN and DNS protection state
 */

import { create } from 'zustand';
import { api } from '../api/client';
import { VPN, VPNStatus, VPNStats } from '../../modules/vpn-module/src';

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
  vpnStatus: VPNStatus;
  vpnStats: VPNStats | null;
  isDNSEnabled: boolean;
  isLoading: boolean;
  stats: Stats | null;
  privacyMetrics: PrivacyMetrics | null;
  listStats: ListStats | null;
  error: string | null;

  // Actions
  setVPNConnected: (connected: boolean) => void;
  setVPNStatus: (status: VPNStatus) => void;
  setVPNStats: (stats: VPNStats) => void;
  setDNSEnabled: (enabled: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Data fetching
  fetchStats: () => Promise<void>;
  fetchPrivacyMetrics: () => Promise<void>;
  fetchListStats: () => Promise<void>;
  refreshAll: () => Promise<void>;

  // VPN operations
  initializeVPN: () => Promise<void>;
  connectVPN: () => Promise<void>;
  disconnectVPN: () => Promise<void>;
  toggleVPN: () => Promise<void>;
}

export const useProtectionStore = create<ProtectionState>((set, get) => ({
  // Initial state
  isVPNConnected: false,
  vpnStatus: 'disconnected',
  vpnStats: null,
  isDNSEnabled: false,
  isLoading: false,
  stats: null,
  privacyMetrics: null,
  listStats: null,
  error: null,

  // State setters
  setVPNConnected: (isVPNConnected) => set({ isVPNConnected }),
  setVPNStatus: (vpnStatus) => set({
    vpnStatus,
    isVPNConnected: vpnStatus === 'connected',
    isDNSEnabled: vpnStatus === 'connected',
  }),
  setVPNStats: (vpnStats) => set({ vpnStats }),
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

  // Initialize VPN module and set up listeners
  initializeVPN: async () => {
    try {
      const isSupported = await VPN.isSupported();
      if (!isSupported) {
        console.log('VPN not supported on this device');
        return;
      }

      // Get initial status
      const status = await VPN.getStatus();
      set({
        vpnStatus: status,
        isVPNConnected: status === 'connected',
        isDNSEnabled: status === 'connected',
      });

      // Set up status listener
      VPN.addStatusListener((newStatus) => {
        set({
          vpnStatus: newStatus,
          isVPNConnected: newStatus === 'connected',
          isDNSEnabled: newStatus === 'connected',
        });
      });

      // Set up stats listener
      VPN.addStatsListener((stats) => {
        set({ vpnStats: stats });
      });
    } catch (error) {
      console.error('Failed to initialize VPN:', error);
    }
  },

  // VPN operations using native module
  connectVPN: async () => {
    set({ isLoading: true, error: null });
    try {
      // Check if VPN is supported
      const isSupported = await VPN.isSupported();
      if (!isSupported) {
        throw new Error('VPN not supported on this device');
      }

      // Request permission if needed
      const hasPermission = await VPN.hasPermission();
      if (!hasPermission) {
        const granted = await VPN.requestPermission();
        if (!granted) {
          throw new Error('VPN permission denied');
        }
      }

      // Configure VPN with Shield AI DNS servers
      await VPN.configure({
        serverAddress: 'shield-ai-dns.example.com', // Replace with actual server
        dnsServers: ['1.1.1.1', '8.8.8.8'], // Cloudflare + Google as fallback
        mtu: 1400,
        splitTunnel: true, // Only route DNS traffic
      });

      // Connect
      await VPN.connect();
    } catch (error: any) {
      set({ error: error.message || 'Failed to connect VPN' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  disconnectVPN: async () => {
    set({ isLoading: true, error: null });
    try {
      await VPN.disconnect();
    } catch (error: any) {
      set({ error: error.message || 'Failed to disconnect VPN' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  toggleVPN: async () => {
    const { vpnStatus } = get();
    if (vpnStatus === 'connected') {
      await get().disconnectVPN();
    } else if (vpnStatus === 'disconnected') {
      await get().connectVPN();
    }
    // If connecting/disconnecting, do nothing (already in transition)
  },
}));
