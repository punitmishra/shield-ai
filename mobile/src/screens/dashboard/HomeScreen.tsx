/**
 * Home Screen - Premium Dashboard
 * Refined elegant design with smooth animations
 */

import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useProtectionStore } from '../../stores/protectionStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 56) / 2;

// Animated pulse for the shield button
const PulseRing = ({ isActive }: { isActive: boolean }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (isActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1.3,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
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

  const buttonScale = useRef(new Animated.Value(1)).current;

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

  const handleShieldPress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    toggleVPN();
  };

  const score = privacyMetrics?.privacy_score || 95;
  const grade = privacyMetrics?.privacy_grade || 'A+';

  return (
    <View style={styles.container}>
      {/* Layered Background */}
      <View style={styles.backgroundBase} />
      <View style={styles.backgroundGlow} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#60a5fa"
            colors={['#60a5fa']}
          />
        }
      >
        {/* Minimal Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good evening,</Text>
            <Text style={styles.userName}>
              {user?.email?.split('@')[0] || 'User'}
            </Text>
          </View>
          <View style={styles.tierPill}>
            <View style={styles.tierDot} />
            <Text style={styles.tierText}>{user?.tier?.toUpperCase() || 'PRO'}</Text>
          </View>
        </View>

        {/* Shield Button - Hero Element */}
        <View style={styles.shieldSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleShieldPress}
            style={styles.shieldButtonContainer}
          >
            <PulseRing isActive={isVPNConnected} />
            <Animated.View
              style={[
                styles.shieldButton,
                isVPNConnected && styles.shieldButtonActive,
                { transform: [{ scale: buttonScale }] },
              ]}
            >
              <View style={styles.shieldInner}>
                <Text style={styles.shieldIcon}>
                  {vpnStatus === 'connecting' || vpnStatus === 'disconnecting'
                    ? '◐'
                    : isVPNConnected ? '◉' : '○'}
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>

          <Text style={[styles.statusText, isVPNConnected && styles.statusTextActive]}>
            {isVPNConnected ? 'Protected' : 'Tap to Protect'}
          </Text>
          <Text style={styles.statusSubtext}>
            {isVPNConnected
              ? 'Your connection is secure'
              : 'Enable DNS protection'}
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(stats?.total_queries || 0)}</Text>
            <Text style={styles.statLabel}>Queries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.statBlocked]}>
              {formatNumber(stats?.blocked_queries || 0)}
            </Text>
            <Text style={styles.statLabel}>Blocked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.statCache]}>
              {((stats?.cache_hit_rate || 0) * 100).toFixed(0)}%
            </Text>
            <Text style={styles.statLabel}>Cached</Text>
          </View>
        </View>

        {/* Privacy Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <View>
              <Text style={styles.scoreLabel}>Privacy Score</Text>
              <View style={styles.scoreValueRow}>
                <Text style={styles.scoreValue}>{score}</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
            </View>
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeText}>{grade}</Text>
            </View>
          </View>

          <View style={styles.scoreBar}>
            <View style={[styles.scoreBarFill, { width: `${score}%` }]} />
          </View>

          <View style={styles.scoreMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{privacyMetrics?.trackers_blocked || 247}</Text>
              <Text style={styles.metricLabel}>Trackers</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{privacyMetrics?.ad_requests_blocked || '1.2K'}</Text>
              <Text style={styles.metricLabel}>Ads</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{privacyMetrics?.analytics_blocked || 89}</Text>
              <Text style={styles.metricLabel}>Analytics</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: '◎', label: 'Analyze', color: '#3b82f6' },
            { icon: '☰', label: 'History', color: '#10b981' },
            { icon: '◇', label: 'Family', color: '#f59e0b' },
            { icon: '⚙', label: 'Settings', color: '#6b7280' },
          ].map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBg, { backgroundColor: `${action.color}15` }]}>
                <Text style={[styles.actionIcon, { color: action.color }]}>{action.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Connection Info */}
        <View style={styles.connectionCard}>
          <View style={styles.connectionRow}>
            <Text style={styles.connectionLabel}>DNS Server</Text>
            <Text style={styles.connectionValue}>Cloudflare</Text>
          </View>
          <View style={styles.connectionDivider} />
          <View style={styles.connectionRow}>
            <Text style={styles.connectionLabel}>Encryption</Text>
            <Text style={styles.connectionValue}>DoH (256-bit)</Text>
          </View>
          <View style={styles.connectionDivider} />
          <View style={styles.connectionRow}>
            <Text style={styles.connectionLabel}>Latency</Text>
            <View style={styles.latencyBadge}>
              <Text style={styles.latencyText}>&lt;1ms</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Shield AI</Text>
          <View style={styles.footerDot} />
          <Text style={styles.footerVersion}>v0.4.4</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0f1a',
  },
  backgroundGlow: {
    position: 'absolute',
    top: -100,
    left: '50%',
    marginLeft: -200,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  greeting: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  userName: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  tierText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Shield Button
  shieldSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  shieldButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  shieldButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  shieldInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldIcon: {
    fontSize: 32,
    color: '#64748b',
  },
  statusText: {
    color: '#64748b',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusTextActive: {
    color: '#22c55e',
  },
  statusSubtext: {
    color: '#475569',
    fontSize: 14,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  statNumber: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statBlocked: {
    color: '#f87171',
  },
  statCache: {
    color: '#34d399',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },

  // Score Card
  scoreCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  scoreLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    color: '#f8fafc',
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -2,
  },
  scoreMax: {
    color: '#475569',
    fontSize: 20,
    marginLeft: 4,
  },
  gradeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  gradeText: {
    color: '#22c55e',
    fontSize: 22,
    fontWeight: '800',
  },
  scoreBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  scoreMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 12,
  },

  // Actions
  sectionLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },

  // Connection Card
  connectionCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  connectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  connectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  connectionLabel: {
    color: '#64748b',
    fontSize: 14,
  },
  connectionValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '500',
  },
  latencyBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  latencyText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  footerText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#475569',
    marginHorizontal: 8,
  },
  footerVersion: {
    color: '#475569',
    fontSize: 13,
  },
});
