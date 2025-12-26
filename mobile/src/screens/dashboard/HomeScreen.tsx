/**
 * Home Screen - v1 Elite Dashboard
 * Redesigned with improved UX, live activity, and modern aesthetics
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useProtectionStore } from '../../stores/protectionStore';

const { width } = Dimensions.get('window');

// Animated Shield Component with gradient-like effect
const ShieldHero = ({
  active,
  onPress,
  isConnecting
}: {
  active: boolean;
  onPress: () => void;
  isConnecting: boolean;
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.3);
    }
  }, [active]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity activeOpacity={1} onPress={handlePress} style={styles.heroContainer}>
      {/* Outer glow rings */}
      {active && (
        <>
          <Animated.View
            style={[
              styles.glowRing,
              styles.glowRing1,
              { opacity: glowAnim, transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Animated.View
            style={[
              styles.glowRing,
              styles.glowRing2,
              { opacity: Animated.multiply(glowAnim, 0.5), transform: [{ scale: Animated.multiply(pulseAnim, 1.2) }] },
            ]}
          />
        </>
      )}

      {/* Main shield button */}
      <Animated.View
        style={[
          styles.shieldButton,
          active && styles.shieldButtonActive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[styles.shieldInner, active && styles.shieldInnerActive]}>
          <View style={[styles.shieldCore, active && styles.shieldCoreActive]}>
            {isConnecting ? (
              <View style={styles.connectingIndicator}>
                <View style={styles.connectingDot} />
              </View>
            ) : (
              <View style={styles.shieldIcon}>
                <View style={[styles.shieldShape, active && styles.shieldShapeActive]}>
                  {active && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Status text */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, active && styles.statusDotActive]} />
        <Text style={[styles.statusText, active && styles.statusTextActive]}>
          {isConnecting ? 'Connecting...' : active ? 'Protected' : 'Not Protected'}
        </Text>
      </View>
      <Text style={styles.statusHint}>
        {active ? 'Your network is secure' : 'Tap shield to enable protection'}
      </Text>
    </TouchableOpacity>
  );
};

// Live Stats Strip Component
const LiveStatsStrip = ({ stats, privacyMetrics }: { stats: any; privacyMetrics: any }) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const items = [
    { label: 'Queries Today', value: formatNumber(stats?.total_queries || 0), color: '#3b82f6' },
    { label: 'Threats Blocked', value: formatNumber(stats?.blocked_queries || 0), color: '#ef4444' },
    { label: 'Cache Hit', value: `${((stats?.cache_hit_rate || 0) * 100).toFixed(0)}%`, color: '#22c55e' },
    { label: 'Privacy Score', value: privacyMetrics?.privacy_score?.toString() || '95', color: '#8b5cf6' },
  ];

  return (
    <View style={styles.statsStrip}>
      {items.map((item, i) => (
        <View key={i} style={styles.statItem}>
          <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

// Recent Activity Component
const RecentActivity = ({ activities }: { activities: any[] }) => {
  const mockActivities = [
    { domain: 'ads.tracker.com', type: 'Ad', time: '2m ago', blocked: true },
    { domain: 'analytics.service.net', type: 'Tracker', time: '5m ago', blocked: true },
    { domain: 'malware-host.xyz', type: 'Malware', time: '12m ago', blocked: true },
    { domain: 'google.com', type: 'Allowed', time: '15m ago', blocked: false },
  ];

  const typeColors: Record<string, string> = {
    'Ad': '#f59e0b',
    'Tracker': '#8b5cf6',
    'Malware': '#ef4444',
    'Phishing': '#dc2626',
    'Allowed': '#22c55e',
  };

  return (
    <View style={styles.activityCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        <TouchableOpacity>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {mockActivities.slice(0, 4).map((activity, i) => (
        <View key={i} style={[styles.activityRow, i === mockActivities.length - 1 && styles.lastRow]}>
          <View style={[styles.activityIndicator, { backgroundColor: typeColors[activity.type] || '#64748b' }]} />
          <View style={styles.activityContent}>
            <Text style={styles.activityDomain} numberOfLines={1}>{activity.domain}</Text>
            <View style={styles.activityMeta}>
              <View style={[styles.activityBadge, { backgroundColor: (typeColors[activity.type] || '#64748b') + '20' }]}>
                <Text style={[styles.activityType, { color: typeColors[activity.type] || '#64748b' }]}>
                  {activity.type}
                </Text>
              </View>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

// Privacy Insights Card
const PrivacyInsights = ({ privacyMetrics, stats }: { privacyMetrics: any; stats: any }) => {
  const score = privacyMetrics?.privacy_score || 95;
  const grade = privacyMetrics?.privacy_grade || 'A+';
  const trackersBlocked = privacyMetrics?.trackers_blocked || 247;
  const adsBlocked = privacyMetrics?.ad_requests_blocked || '1.2K';

  return (
    <View style={styles.insightsCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Privacy Score</Text>
        <View style={styles.gradeBadge}>
          <Text style={styles.gradeText}>{grade}</Text>
        </View>
      </View>

      {/* Score ring visualization */}
      <View style={styles.scoreSection}>
        <View style={styles.scoreRing}>
          <View style={[styles.scoreRingProgress, { transform: [{ rotate: `${(score / 100) * 360}deg` }] }]} />
          <View style={styles.scoreRingInner}>
            <Text style={styles.scoreNumber}>{score}</Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>
        </View>

        <View style={styles.scoreBreakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownValue}>{trackersBlocked}</Text>
            <Text style={styles.breakdownLabel}>Trackers Blocked</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownValue}>{adsBlocked}</Text>
            <Text style={styles.breakdownLabel}>Ads Blocked</Text>
          </View>
        </View>
      </View>

      {/* Insight tip */}
      <View style={styles.insightTip}>
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>
          You've blocked 42% more trackers than the average user this week!
        </Text>
      </View>
    </View>
  );
};

// Connection Status Card
const ConnectionCard = ({ isConnected }: { isConnected: boolean }) => {
  return (
    <View style={styles.connectionCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Connection</Text>
        <View style={[styles.connectionBadge, isConnected && styles.connectionBadgeActive]}>
          <View style={[styles.connectionDot, isConnected && styles.connectionDotActive]} />
          <Text style={[styles.connectionStatus, isConnected && styles.connectionStatusActive]}>
            {isConnected ? 'Secure' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.connectionGrid}>
        <View style={styles.connectionItem}>
          <Text style={styles.connectionLabel}>DNS Server</Text>
          <Text style={styles.connectionValue}>Cloudflare</Text>
        </View>
        <View style={styles.connectionItem}>
          <Text style={styles.connectionLabel}>Protocol</Text>
          <Text style={styles.connectionValue}>DoH (HTTPS)</Text>
        </View>
        <View style={styles.connectionItem}>
          <Text style={styles.connectionLabel}>Encryption</Text>
          <Text style={styles.connectionValue}>256-bit TLS</Text>
        </View>
        <View style={styles.connectionItem}>
          <Text style={styles.connectionLabel}>Latency</Text>
          <Text style={[styles.connectionValue, styles.latencyValue]}>&lt;1ms</Text>
        </View>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
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

  const isConnecting = vpnStatus === 'connecting' || vpnStatus === 'disconnecting';

  useEffect(() => {
    refreshAll();
  }, []);

  const onRefresh = useCallback(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.bgBase} />
      <View style={styles.bgGradient} />
      {isVPNConnected && <View style={styles.bgGlow} />}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#60a5fa"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {getTimeOfDay()}</Text>
            <Text style={styles.headerTitle}>Shield AI</Text>
          </View>
          <TouchableOpacity style={styles.tierBadge}>
            <View style={[styles.tierDot, isVPNConnected && styles.tierDotActive]} />
            <Text style={styles.tierText}>{user?.tier?.toUpperCase() || 'PRO'}</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Shield */}
        <ShieldHero
          active={isVPNConnected}
          onPress={toggleVPN}
          isConnecting={isConnecting}
        />

        {/* Live Stats */}
        <LiveStatsStrip stats={stats} privacyMetrics={privacyMetrics} />

        {/* Recent Activity */}
        <RecentActivity activities={[]} />

        {/* Privacy Insights */}
        <PrivacyInsights privacyMetrics={privacyMetrics} stats={stats} />

        {/* Connection Status */}
        <ConnectionCard isConnected={isVPNConnected} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Shield AI v0.4.5</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0f1a',
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    backgroundColor: '#0a0f1a',
  },
  bgGlow: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -0.5,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  tierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748b',
    marginRight: 6,
  },
  tierDotActive: {
    backgroundColor: '#22c55e',
  },
  tierText: {
    fontSize: 11,
    color: '#60a5fa',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Hero Shield
  heroContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  glowRing1: {
    width: 180,
    height: 180,
  },
  glowRing2: {
    width: 220,
    height: 220,
  },
  shieldButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  shieldInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldInnerActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  shieldCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCoreActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  shieldIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldShape: {
    width: 40,
    height: 48,
    borderWidth: 2.5,
    borderColor: '#64748b',
    borderRadius: 6,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  shieldShapeActive: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
  },
  connectingIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f59e0b',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#22c55e',
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#94a3b8',
  },
  statusTextActive: {
    color: '#22c55e',
  },
  statusHint: {
    fontSize: 14,
    color: '#64748b',
  },

  // Stats Strip
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Activity Card
  activityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewAllText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  activityIndicator: {
    width: 3,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDomain: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '500',
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activityType: {
    fontSize: 11,
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 12,
    color: '#64748b',
  },

  // Insights Card
  insightsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  gradeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  scoreRingProgress: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: '#3b82f6',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  scoreRingInner: {
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f8fafc',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  scoreBreakdown: {
    flex: 1,
  },
  breakdownItem: {
    marginBottom: 12,
  },
  breakdownValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f8fafc',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 12,
  },
  insightTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  tipIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },

  // Connection Card
  connectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectionBadgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748b',
    marginRight: 6,
  },
  connectionDotActive: {
    backgroundColor: '#22c55e',
  },
  connectionStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  connectionStatusActive: {
    color: '#22c55e',
  },
  connectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  connectionItem: {
    width: '50%',
    paddingVertical: 12,
  },
  connectionLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  connectionValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#f8fafc',
  },
  latencyValue: {
    color: '#22c55e',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#475569',
  },
});
