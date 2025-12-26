/**
 * Home Screen - Premium Dashboard
 * Elite design with gradients, glassmorphism, and smooth animations
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../stores/authStore';
import { useProtectionStore } from '../../stores/protectionStore';
import {
  ShieldAILogo,
  VPNConnectedIcon,
  VPNDisconnectedIcon,
  AnalyticsIcon,
  PrivacyScoreIcon,
  SearchIcon,
  HistoryIcon,
  FamilyIcon,
  SettingsIcon,
} from '../../components/icons/ShieldIcon';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuthStore();
  const {
    isVPNConnected,
    vpnStatus,
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

  const getVPNStatusText = () => {
    switch (vpnStatus) {
      case 'connected': return 'Protected';
      case 'connecting': return 'Connecting...';
      case 'disconnecting': return 'Disconnecting...';
      default: return 'Not Protected';
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['#0f172a', '#1e1b4b', '#0f172a']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ShieldAILogo size={44} />
            <View style={styles.headerText}>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.userName}>
                {user?.email?.split('@')[0] || 'User'}
              </Text>
            </View>
          </View>
          <View style={styles.tierBadge}>
            <LinearGradient
              colors={['#3b82f6', '#8b5cf6']}
              style={styles.tierGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.tierText}>
                {user?.tier?.toUpperCase() || 'PRO'}
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* VPN Status Card */}
        <TouchableOpacity
          style={styles.vpnCard}
          onPress={toggleVPN}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isVPNConnected
              ? ['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)']
              : ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)']}
            style={styles.vpnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.vpnContent}>
              <View style={styles.vpnLeft}>
                <View style={[styles.vpnStatusDot, isVPNConnected && styles.vpnConnectedDot]} />
                <View>
                  <Text style={styles.vpnLabel}>Shield Protection</Text>
                  <Text style={[styles.vpnStatus, isVPNConnected && styles.vpnConnectedText]}>
                    {getVPNStatusText()}
                  </Text>
                </View>
              </View>
              {isVPNConnected ? (
                <VPNConnectedIcon size={48} />
              ) : (
                <VPNDisconnectedIcon size={48} />
              )}
            </View>
            <View style={styles.vpnStats}>
              <View style={styles.vpnStat}>
                <Text style={styles.vpnStatValue}>256-bit</Text>
                <Text style={styles.vpnStatLabel}>Encryption</Text>
              </View>
              <View style={styles.vpnDivider} />
              <View style={styles.vpnStat}>
                <Text style={styles.vpnStatValue}>&lt;1ms</Text>
                <Text style={styles.vpnStatLabel}>Latency</Text>
              </View>
              <View style={styles.vpnDivider} />
              <View style={styles.vpnStat}>
                <Text style={styles.vpnStatValue}>DoH</Text>
                <Text style={styles.vpnStatLabel}>Protocol</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.02)']}
              style={styles.statGradient}
            >
              <AnalyticsIcon size={24} color="#3b82f6" />
              <Text style={styles.statValue}>
                {formatNumber(stats?.total_queries || 0)}
              </Text>
              <Text style={styles.statLabel}>Total Queries</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.02)']}
              style={styles.statGradient}
            >
              <View style={styles.blockedIcon}>
                <Text style={styles.blockedIconText}>🛡️</Text>
              </View>
              <Text style={[styles.statValue, styles.blockedValue]}>
                {formatNumber(stats?.blocked_queries || 0)}
              </Text>
              <Text style={styles.statLabel}>Threats Blocked</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['rgba(34, 197, 94, 0.1)', 'rgba(34, 197, 94, 0.02)']}
              style={styles.statGradient}
            >
              <HistoryIcon size={24} color="#22c55e" />
              <Text style={[styles.statValue, { color: '#22c55e' }]}>
                {((stats?.cache_hit_rate || 0) * 100).toFixed(0)}%
              </Text>
              <Text style={styles.statLabel}>Cache Hit Rate</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(139, 92, 246, 0.02)']}
              style={styles.statGradient}
            >
              <PrivacyScoreIcon size={24} color="#8b5cf6" />
              <Text style={[styles.statValue, { color: '#8b5cf6' }]}>
                {((stats?.block_rate || 0) * 100).toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>Block Rate</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Privacy Score Card */}
        <View style={styles.privacyCard}>
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.15)', 'rgba(139, 92, 246, 0.15)', 'rgba(34, 197, 94, 0.1)']}
            style={styles.privacyGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.privacyHeader}>
              <View style={styles.privacyTitleRow}>
                <PrivacyScoreIcon size={28} />
                <Text style={styles.privacyTitle}>Privacy Score</Text>
              </View>
              <View style={styles.gradeContainer}>
                <Text style={styles.privacyGrade}>
                  {privacyMetrics?.privacy_grade || 'A+'}
                </Text>
              </View>
            </View>

            <View style={styles.scoreRow}>
              <Text style={styles.privacyValue}>
                {privacyMetrics?.privacy_score || 95}
              </Text>
              <Text style={styles.privacyMax}>/100</Text>
            </View>

            {/* Privacy Bar */}
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#3b82f6', '#8b5cf6', '#22c55e']}
                style={[styles.progressFill, { width: `${privacyMetrics?.privacy_score || 95}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>

            <View style={styles.privacyStats}>
              <View style={styles.privacyStat}>
                <Text style={styles.privacyStatValue}>
                  {privacyMetrics?.trackers_blocked || 247}
                </Text>
                <Text style={styles.privacyStatLabel}>Trackers Blocked</Text>
              </View>
              <View style={styles.privacyStatDivider} />
              <View style={styles.privacyStat}>
                <Text style={styles.privacyStatValue}>
                  {privacyMetrics?.ad_requests_blocked || 1.2}K
                </Text>
                <Text style={styles.privacyStatLabel}>Ads Blocked</Text>
              </View>
              <View style={styles.privacyStatDivider} />
              <View style={styles.privacyStat}>
                <Text style={styles.privacyStatValue}>
                  {privacyMetrics?.analytics_blocked || 89}
                </Text>
                <Text style={styles.privacyStatLabel}>Analytics Blocked</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
              <LinearGradient
                colors={['rgba(6, 182, 212, 0.1)', 'rgba(6, 182, 212, 0.02)']}
                style={styles.actionGradient}
              >
                <SearchIcon size={28} color="#06b6d4" />
                <Text style={styles.actionLabel}>Analyze</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.02)']}
                style={styles.actionGradient}
              >
                <HistoryIcon size={28} color="#10b981" />
                <Text style={styles.actionLabel}>History</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
              <LinearGradient
                colors={['rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0.02)']}
                style={styles.actionGradient}
              >
                <FamilyIcon size={28} color="#f59e0b" />
                <Text style={styles.actionLabel}>Family</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
              <LinearGradient
                colors={['rgba(100, 116, 139, 0.1)', 'rgba(100, 116, 139, 0.02)']}
                style={styles.actionGradient}
              >
                <SettingsIcon size={28} color="#64748b" />
                <Text style={styles.actionLabel}>Settings</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Branding */}
        <View style={styles.footer}>
          <ShieldAILogo size={24} />
          <Text style={styles.footerText}>Shield AI v0.4.4</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    marginLeft: 4,
  },
  greeting: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tierBadge: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  tierGradient: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tierText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  vpnCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  vpnGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  vpnContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  vpnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  vpnStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  vpnConnectedDot: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
  },
  vpnLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  vpnStatus: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: '700',
  },
  vpnConnectedText: {
    color: '#22c55e',
  },
  vpnStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  vpnStat: {
    alignItems: 'center',
  },
  vpnStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  vpnStatLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  vpnDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  blockedIcon: {
    marginBottom: 4,
  },
  blockedIconText: {
    fontSize: 24,
  },
  statValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
    letterSpacing: -1,
  },
  blockedValue: {
    color: '#ef4444',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  privacyCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  privacyGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  privacyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  privacyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  privacyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  gradeContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  privacyGrade: {
    color: '#22c55e',
    fontSize: 20,
    fontWeight: '800',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  privacyValue: {
    color: '#fff',
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
  },
  privacyMax: {
    color: '#64748b',
    fontSize: 24,
    marginLeft: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  privacyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  privacyStat: {
    alignItems: 'center',
    flex: 1,
  },
  privacyStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  privacyStatValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  privacyStatLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  quickActions: {
    marginBottom: 24,
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
    minWidth: (width - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
  },
  footerText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
});
