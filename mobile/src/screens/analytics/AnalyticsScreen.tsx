/**
 * Analytics Screen
 * Query history, statistics, and charts
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAnalyticsStore, QueryLogEntry } from '../../stores/analyticsStore';

const { width } = Dimensions.get('window');

type TimeRange = '24h' | '7d' | '30d';

interface ChartData {
  label: string;
  value: number;
  color: string;
}

// Category colors for chart
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

function SimpleBarChart({ data }: { data: ChartData[] }) {
  if (data.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.chartContainer}>
      {data.map((item, index) => (
        <View key={index} style={styles.barRow}>
          <Text style={styles.barLabel}>{item.label}</Text>
          <View style={styles.barBackground}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color
                }
              ]}
            />
          </View>
          <Text style={styles.barValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function StatCard({ label, value, subtext, trend }: {
  label: string;
  value: string;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {trend && (
          <Text style={[
            styles.trendIndicator,
            trend === 'up' && styles.trendUp,
            trend === 'down' && styles.trendDown,
          ]}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </Text>
        )}
      </View>
      {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
    </View>
  );
}

function QueryLogItem({ entry }: { entry: QueryLogEntry }) {
  const timeAgo = formatTimeAgo(entry.timestamp);

  return (
    <View style={styles.logItem}>
      <View style={[styles.statusIndicator, entry.status === 'blocked' && styles.blockedIndicator]} />
      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <Text style={styles.logDomain} numberOfLines={1}>{entry.domain}</Text>
          <Text style={styles.logTime}>{timeAgo}</Text>
        </View>
        <View style={styles.logDetails}>
          <Text style={styles.logType}>{entry.type}</Text>
          {entry.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{entry.category}</Text>
            </View>
          )}
          <Text style={styles.logLatency}>{entry.latency}ms</Text>
        </View>
      </View>
    </View>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export default function AnalyticsScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [filter, setFilter] = useState<'all' | 'blocked' | 'allowed'>('all');

  const {
    queryHistory,
    analytics,
    stats,
    trackerCategories,
    isLoading,
    refreshAll,
  } = useAnalyticsStore();

  // Fetch data on mount
  useEffect(() => {
    refreshAll();
  }, []);

  // Filter query log
  const filteredLog = queryHistory.filter(entry => {
    if (filter === 'all') return true;
    return entry.status === filter;
  });

  // Map tracker categories to chart data
  const categoryData: ChartData[] = trackerCategories.map(cat => ({
    label: cat.name,
    value: cat.count,
    color: categoryColors[cat.name] || '#64748b',
  }));

  // Get top blocked domains from analytics
  const topBlockedDomains = analytics?.topBlockedDomains || [];

  // Calculate stats display values
  const totalQueries = stats?.totalQueries || 0;
  const blockedQueries = stats?.blockedQueries || 0;
  const cacheHitRate = stats?.cacheHitRate || 0;
  const blockRate = stats?.blockRate || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshAll}
          tintColor="#3b82f6"
          colors={['#3b82f6']}
        />
      }
    >
      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            style={[styles.timeRangeButton, timeRange === range && styles.timeRangeActive]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>
              {range}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Queries"
            value={formatNumber(totalQueries)}
            subtext={`${blockRate.toFixed(1)}% blocked`}
            trend="neutral"
          />
          <StatCard
            label="Blocked"
            value={formatNumber(blockedQueries)}
            subtext={`${blockRate.toFixed(1)}% of total`}
            trend={blockRate > 10 ? 'up' : 'down'}
          />
          <StatCard
            label="Cache Hit"
            value={`${(cacheHitRate * 100).toFixed(0)}%`}
            subtext="Efficiency rate"
            trend={cacheHitRate > 0.8 ? 'up' : 'neutral'}
          />
          <StatCard
            label="Blocklist"
            value={formatNumber(stats?.blocklistSize || 0)}
            subtext="Domains blocked"
            trend="neutral"
          />
        </View>
      </View>

      {/* Blocked by Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Blocked by Category</Text>
        <View style={styles.chartCard}>
          {isLoading && categoryData.length === 0 ? (
            <ActivityIndicator color="#3b82f6" />
          ) : (
            <SimpleBarChart data={categoryData} />
          )}
        </View>
      </View>

      {/* Top Blocked Domains */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Blocked Domains</Text>
        <View style={styles.topDomainsCard}>
          {topBlockedDomains.length === 0 ? (
            <Text style={styles.emptyText}>No blocked domains yet</Text>
          ) : (
            topBlockedDomains.slice(0, 5).map((item, index) => (
              <View key={index} style={styles.topDomainRow}>
                <Text style={styles.topDomainRank}>#{index + 1}</Text>
                <Text style={styles.topDomainName} numberOfLines={1}>{item.domain}</Text>
                <Text style={styles.topDomainCount}>{item.count}</Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Query Log */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Query Log</Text>
          <View style={styles.filterButtons}>
            {(['all', 'blocked', 'allowed'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.logContainer}>
          {filteredLog.length === 0 ? (
            <View style={styles.emptyLog}>
              <Text style={styles.emptyText}>
                {isLoading ? 'Loading...' : 'No queries to display'}
              </Text>
            </View>
          ) : (
            filteredLog.slice(0, 20).map((entry) => (
              <QueryLogItem key={entry.id} entry={entry} />
            ))
          )}
        </View>
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeRangeActive: {
    backgroundColor: '#3b82f6',
  },
  timeRangeText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  timeRangeTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    width: (width - 44) / 2,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  trendIndicator: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendUp: {
    color: '#22c55e',
  },
  trendDown: {
    color: '#ef4444',
  },
  statSubtext: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
  },
  chartContainer: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    color: '#94a3b8',
    fontSize: 13,
    width: 80,
  },
  barBackground: {
    flex: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  topDomainsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
  },
  topDomainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  topDomainRank: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    width: 30,
  },
  topDomainName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  topDomainCount: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  logContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyLog: {
    padding: 20,
    alignItems: 'center',
  },
  logItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  statusIndicator: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#22c55e',
    marginRight: 12,
  },
  blockedIndicator: {
    backgroundColor: '#ef4444',
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logDomain: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  logTime: {
    color: '#64748b',
    fontSize: 12,
  },
  logDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logType: {
    color: '#64748b',
    fontSize: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '500',
  },
  logLatency: {
    color: '#64748b',
    fontSize: 12,
  },
  footer: {
    height: 40,
  },
});
