/**
 * Analytics Store
 * Manages query history, statistics, and analytics data
 */

import { create } from 'zustand';
import { api } from '../api/client';

export interface QueryLogEntry {
  id: string;
  domain: string;
  type: string;
  status: 'allowed' | 'blocked';
  category?: string;
  timestamp: Date;
  latency: number;
}

export interface DomainCount {
  domain: string;
  count: number;
}

export interface HourlyStats {
  hour: number;
  queries: number;
  blocked: number;
}

export interface TrackerCategory {
  name: string;
  count: number;
}

export interface AnalyticsData {
  period: string;
  totalQueries: number;
  blockedQueries: number;
  blockRate: number;
  cacheHitRate: number;
  topBlockedDomains: DomainCount[];
  topAllowedDomains: DomainCount[];
  queriesByHour: HourlyStats[];
}

export interface StatsData {
  totalQueries: number;
  blockedQueries: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  blockRate: number;
  blocklistSize: number;
}

interface AnalyticsState {
  // State
  queryHistory: QueryLogEntry[];
  analytics: AnalyticsData | null;
  stats: StatsData | null;
  trackerCategories: TrackerCategory[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchHistory: () => Promise<void>;
  fetchAnalytics: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchTrackerCategories: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  // Initial state
  queryHistory: [],
  analytics: null,
  stats: null,
  trackerCategories: [],
  isLoading: false,
  error: null,

  // Fetch query history
  fetchHistory: async () => {
    try {
      const response = await api.stats.history();
      if (response.data.queries) {
        // Map API response to our format
        const history: QueryLogEntry[] = response.data.queries.map((q: any, index: number) => ({
          id: `${index}-${q.timestamp}`,
          domain: q.domain,
          type: 'A', // API doesn't return query type, default to A
          status: q.blocked ? 'blocked' : 'allowed',
          category: q.blocked ? 'Blocked' : undefined,
          timestamp: new Date(q.timestamp),
          latency: q.response_time_ms || 0,
        }));
        set({ queryHistory: history });
      }
    } catch (error: any) {
      console.error('Failed to fetch history:', error);
      set({ error: error.message });
    }
  },

  // Fetch analytics data
  fetchAnalytics: async () => {
    try {
      const response = await api.stats.analytics();
      const data = response.data;

      const analytics: AnalyticsData = {
        period: data.period || 'last_1000_queries',
        totalQueries: data.total_queries || 0,
        blockedQueries: data.blocked_queries || 0,
        blockRate: data.block_rate || 0,
        cacheHitRate: data.cache_hit_rate || 0,
        topBlockedDomains: (data.top_blocked_domains || []).map((d: any) => ({
          domain: d.domain,
          count: d.count,
        })),
        topAllowedDomains: (data.top_allowed_domains || []).map((d: any) => ({
          domain: d.domain,
          count: d.count,
        })),
        queriesByHour: (data.queries_by_hour || []).map((h: any) => ({
          hour: h.hour,
          queries: h.queries,
          blocked: h.blocked,
        })),
      };

      set({ analytics });
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      set({ error: error.message });
    }
  },

  // Fetch general stats
  fetchStats: async () => {
    try {
      const response = await api.stats.get();
      const data = response.data;

      const stats: StatsData = {
        totalQueries: data.total_queries || 0,
        blockedQueries: data.blocked_queries || 0,
        cacheHits: data.cache_hits || 0,
        cacheMisses: data.cache_misses || 0,
        cacheHitRate: data.cache_hit_rate || 0,
        blockRate: data.block_rate || 0,
        blocklistSize: data.blocklist_size || 0,
      };

      set({ stats });
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
      set({ error: error.message });
    }
  },

  // Fetch tracker categories from privacy metrics
  fetchTrackerCategories: async () => {
    try {
      const response = await api.stats.privacyMetrics();
      const data = response.data;

      // Map tracker categories with colors
      const categoryColors: Record<string, string> = {
        'Advertising': '#ef4444',
        'Analytics': '#f97316',
        'Social Media': '#7c3aed',
        'Other': '#64748b',
        'Ads': '#ef4444',
        'Trackers': '#f97316',
        'Malware': '#dc2626',
        'Phishing': '#7c3aed',
      };

      const categories: TrackerCategory[] = (data.tracker_categories || []).map((c: any) => ({
        name: c.name,
        count: c.count,
      }));

      set({ trackerCategories: categories });
    } catch (error: any) {
      console.error('Failed to fetch tracker categories:', error);
      set({ error: error.message });
    }
  },

  // Refresh all data
  refreshAll: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().fetchHistory(),
        get().fetchAnalytics(),
        get().fetchStats(),
        get().fetchTrackerCategories(),
      ]);
    } finally {
      set({ isLoading: false });
    }
  },
}));
