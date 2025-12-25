/**
 * Analytics Screen
 * Query history, statistics, and charts
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

type TimeRange = '24h' | '7d' | '30d';

interface QueryLogEntry {
  id: string;
  domain: string;
  type: string;
  status: 'allowed' | 'blocked';
  category?: string;
  timestamp: Date;
  latency: number;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

// Mock data for demonstration
const mockQueryLog: QueryLogEntry[] = [
  { id: '1', domain: 'google.com', type: 'A', status: 'allowed', timestamp: new Date(), latency: 12 },
  { id: '2', domain: 'ads.doubleclick.net', type: 'A', status: 'blocked', category: 'Ads', timestamp: new Date(Date.now() - 60000), latency: 1 },
  { id: '3', domain: 'api.github.com', type: 'A', status: 'allowed', timestamp: new Date(Date.now() - 120000), latency: 45 },
  { id: '4', domain: 'tracker.analytics.com', type: 'A', status: 'blocked', category: 'Trackers', timestamp: new Date(Date.now() - 180000), latency: 1 },
  { id: '5', domain: 'cdn.cloudflare.com', type: 'AAAA', status: 'allowed', timestamp: new Date(Date.now() - 240000), latency: 8 },
  { id: '6', domain: 'malware.badsite.com', type: 'A', status: 'blocked', category: 'Malware', timestamp: new Date(Date.now() - 300000), latency: 1 },
  { id: '7', domain: 'facebook.com', type: 'A', status: 'allowed', timestamp: new Date(Date.now() - 360000), latency: 23 },
  { id: '8', domain: 'pixel.facebook.com', type: 'A', status: 'blocked', category: 'Trackers', timestamp: new Date(Date.now() - 420000), latency: 1 },
];

const categoryData: ChartData[] = [
  { label: 'Ads', value: 45, color: '#ef4444' },
  { label: 'Trackers', value: 32, color: '#f97316' },
  { label: 'Malware', value: 8, color: '#dc2626' },
  { label: 'Phishing', value: 3, color: '#7c3aed' },
];

function SimpleBarChart({ data }: { data: ChartData[] }) {
  const maxValue = Math.max(...data.map(d => d.value));

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

export default function AnalyticsScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [filter, setFilter] = useState<'all' | 'blocked' | 'allowed'>('all');

  const filteredLog = mockQueryLog.filter(entry => {
    if (filter === 'all') return true;
    return entry.status === filter;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          <StatCard label="Total Queries" value="12,847" subtext="+12% from yesterday" trend="up" />
          <StatCard label="Blocked" value="1,234" subtext="9.6% of total" trend="down" />
          <StatCard label="Avg Latency" value="8ms" subtext="P50 response time" trend="neutral" />
          <StatCard label="Cache Hit" value="87%" subtext="Efficiency rate" trend="up" />
        </View>
      </View>

      {/* Blocked by Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Blocked by Category</Text>
        <View style={styles.chartCard}>
          <SimpleBarChart data={categoryData} />
        </View>
      </View>

      {/* Top Blocked Domains */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Blocked Domains</Text>
        <View style={styles.topDomainsCard}>
          {[
            { domain: 'ads.doubleclick.net', count: 234 },
            { domain: 'tracker.analytics.com', count: 189 },
            { domain: 'pixel.facebook.com', count: 156 },
            { domain: 'ad.server.com', count: 98 },
            { domain: 'telemetry.microsoft.com', count: 67 },
          ].map((item, index) => (
            <View key={index} style={styles.topDomainRow}>
              <Text style={styles.topDomainRank}>#{index + 1}</Text>
              <Text style={styles.topDomainName} numberOfLines={1}>{item.domain}</Text>
              <Text style={styles.topDomainCount}>{item.count}</Text>
            </View>
          ))}
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
          {filteredLog.map((entry) => (
            <QueryLogItem key={entry.id} entry={entry} />
          ))}
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
    width: 70,
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
