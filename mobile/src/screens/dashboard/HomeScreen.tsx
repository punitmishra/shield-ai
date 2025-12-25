/**
 * Home Screen - Main Dashboard
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useProtectionStore } from '../../stores/protectionStore';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const {
    isVPNConnected,
    stats,
    privacyMetrics,
    isLoading,
    refreshAll,
    toggleVPN,
  } = useProtectionStore();

  useEffect(() => {
    refreshAll();
  }, []);

  const onRefresh = useCallback(() => {
    refreshAll();
  }, [refreshAll]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor="#3b82f6"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.email?.split('@')[0] || 'User'}</Text>
        </View>
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>{user?.tier?.toUpperCase() || 'FREE'}</Text>
        </View>
      </View>

      {/* VPN Status Card */}
      <TouchableOpacity style={styles.vpnCard} onPress={toggleVPN}>
        <View style={styles.vpnStatus}>
          <View style={[styles.vpnIndicator, isVPNConnected && styles.vpnConnected]} />
          <View>
            <Text style={styles.vpnLabel}>VPN Protection</Text>
            <Text style={styles.vpnState}>
              {isVPNConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
        </View>
        <Text style={styles.vpnIcon}>{isVPNConnected ? '🔒' : '🔓'}</Text>
      </TouchableOpacity>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {formatNumber(stats?.total_queries || 0)}
          </Text>
          <Text style={styles.statLabel}>Total Queries</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, styles.blockedValue]}>
            {formatNumber(stats?.blocked_queries || 0)}
          </Text>
          <Text style={styles.statLabel}>Blocked</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {((stats?.cache_hit_rate || 0) * 100).toFixed(0)}%
          </Text>
          <Text style={styles.statLabel}>Cache Hit</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {((stats?.block_rate || 0) * 100).toFixed(1)}%
          </Text>
          <Text style={styles.statLabel}>Block Rate</Text>
        </View>
      </View>

      {/* Privacy Score */}
      <View style={styles.privacyCard}>
        <View style={styles.privacyHeader}>
          <Text style={styles.privacyTitle}>Privacy Score</Text>
          <Text style={styles.privacyGrade}>{privacyMetrics?.privacy_grade || 'N/A'}</Text>
        </View>
        <View style={styles.privacyScore}>
          <Text style={styles.privacyValue}>{privacyMetrics?.privacy_score || 0}</Text>
          <Text style={styles.privacyMax}>/100</Text>
        </View>
        <View style={styles.privacyStats}>
          <View style={styles.privacyStat}>
            <Text style={styles.privacyStatValue}>
              {privacyMetrics?.trackers_blocked || 0}
            </Text>
            <Text style={styles.privacyStatLabel}>Trackers Blocked</Text>
          </View>
          <View style={styles.privacyStat}>
            <Text style={styles.privacyStatValue}>
              {privacyMetrics?.ad_requests_blocked || 0}
            </Text>
            <Text style={styles.privacyStatLabel}>Ads Blocked</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionLabel}>Analyze Domain</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>View History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>👨‍👩‍👧</Text>
            <Text style={styles.actionLabel}>Family</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionLabel}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    color: '#64748b',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  tierBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  vpnCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  vpnStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vpnIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  vpnConnected: {
    backgroundColor: '#22c55e',
  },
  vpnLabel: {
    color: '#64748b',
    fontSize: 14,
  },
  vpnState: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  vpnIcon: {
    fontSize: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  blockedValue: {
    color: '#ef4444',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  privacyCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  privacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  privacyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  privacyGrade: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: '800',
  },
  privacyScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  privacyValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
  },
  privacyMax: {
    color: '#64748b',
    fontSize: 24,
    marginLeft: 4,
  },
  privacyStats: {
    flexDirection: 'row',
    gap: 24,
  },
  privacyStat: {},
  privacyStatValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  privacyStatLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  quickActions: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
