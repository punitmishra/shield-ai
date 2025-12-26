/**
 * Home Screen - Elite Dashboard
 * Professional design with refined alignment and polished UI
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useProtectionStore } from '../../stores/protectionStore';

const { width } = Dimensions.get('window');
const CARD_PADDING = 20;
const SECTION_GAP = 12;

// View-based Icon Components to avoid SVG issues in Expo Go
const ShieldIcon = ({ size = 36, active = false }: { size?: number; active?: boolean }) => {
  const scale = size / 36;
  return (
    <View style={[iconStyles.shieldContainer, { width: size, height: size }]}>
      <View
        style={[
          iconStyles.shield,
          {
            width: 28 * scale,
            height: 34 * scale,
            borderColor: active ? '#22c55e' : '#475569',
            backgroundColor: active ? 'rgba(34, 197, 94, 0.2)' : 'rgba(71, 85, 105, 0.1)',
            borderTopLeftRadius: 14 * scale,
            borderTopRightRadius: 14 * scale,
            borderRadius: 4 * scale,
          },
        ]}
      >
        {active && <Text style={[iconStyles.checkmark, { fontSize: 14 * scale }]}>✓</Text>}
      </View>
    </View>
  );
};

const AnalyzeIcon = ({ size = 22, color = '#3b82f6' }: { size?: number; color?: string }) => (
  <View style={[iconStyles.iconContainer, { width: size, height: size }]}>
    <View style={[iconStyles.searchCircle, { borderColor: color }]} />
    <View style={[iconStyles.searchHandle, { backgroundColor: color }]} />
  </View>
);

const HistoryIcon = ({ size = 22, color = '#10b981' }: { size?: number; color?: string }) => (
  <View style={[iconStyles.iconContainer, { width: size, height: size }]}>
    <View style={[iconStyles.clockCircle, { borderColor: color }]} />
    <View style={[iconStyles.clockHand, { backgroundColor: color }]} />
    <View style={[iconStyles.clockHandMin, { backgroundColor: color }]} />
  </View>
);

const FamilyIcon = ({ size = 22, color = '#f59e0b' }: { size?: number; color?: string }) => (
  <View style={[iconStyles.iconContainer, { width: size, height: size }]}>
    <View style={[iconStyles.personHead, { borderColor: color }]} />
    <View style={[iconStyles.personBody, { borderColor: color }]} />
    <View style={[iconStyles.smallPersonLeft, { borderColor: color }]} />
    <View style={[iconStyles.smallPersonRight, { borderColor: color }]} />
  </View>
);

const SettingsIcon = ({ size = 22, color = '#8b5cf6' }: { size?: number; color?: string }) => (
  <View style={[iconStyles.iconContainer, { width: size, height: size }]}>
    <View style={[iconStyles.gearCenter, { borderColor: color }]} />
    <View style={[iconStyles.gearTooth, iconStyles.gearTop, { backgroundColor: color }]} />
    <View style={[iconStyles.gearTooth, iconStyles.gearBottom, { backgroundColor: color }]} />
    <View style={[iconStyles.gearTooth, iconStyles.gearLeft, { backgroundColor: color }]} />
    <View style={[iconStyles.gearTooth, iconStyles.gearRight, { backgroundColor: color }]} />
  </View>
);

const iconStyles = StyleSheet.create({
  shieldContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#22c55e',
    fontWeight: '700',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    position: 'absolute',
    top: 2,
    left: 2,
  },
  searchHandle: {
    width: 6,
    height: 2,
    borderRadius: 1,
    position: 'absolute',
    bottom: 4,
    right: 2,
    transform: [{ rotate: '45deg' }],
  },
  clockCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  clockHand: {
    position: 'absolute',
    width: 2,
    height: 5,
    borderRadius: 1,
    top: 5,
  },
  clockHandMin: {
    position: 'absolute',
    width: 4,
    height: 2,
    borderRadius: 1,
    right: 5,
  },
  personHead: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    position: 'absolute',
    top: 2,
  },
  personBody: {
    width: 12,
    height: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 2,
    borderBottomWidth: 0,
    position: 'absolute',
    bottom: 2,
  },
  smallPersonLeft: {
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 1.5,
    position: 'absolute',
    left: 0,
    top: 4,
    opacity: 0.5,
  },
  smallPersonRight: {
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 1.5,
    position: 'absolute',
    right: 0,
    top: 4,
    opacity: 0.5,
  },
  gearCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  gearTooth: {
    position: 'absolute',
    width: 4,
    height: 2,
    borderRadius: 1,
  },
  gearTop: {
    top: 1,
    transform: [{ rotate: '90deg' }],
  },
  gearBottom: {
    bottom: 1,
    transform: [{ rotate: '90deg' }],
  },
  gearLeft: {
    left: 1,
  },
  gearRight: {
    right: 1,
  },
});

// Animated pulse ring for shield button
const PulseRing = ({ isActive }: { isActive: boolean }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (isActive) {
      const animation = Animated.loop(
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.5,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      scale.setValue(1);
      opacity.setValue(0);
    }
  }, [isActive, scale, opacity]);

  if (!isActive) return null;

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { transform: [{ scale }], opacity },
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
        toValue: 0.94,
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
  const isConnecting = vpnStatus === 'connecting' || vpnStatus === 'disconnecting';

  const quickActions = [
    { icon: <AnalyzeIcon />, label: 'Analyze', color: '#3b82f6' },
    { icon: <HistoryIcon />, label: 'History', color: '#10b981' },
    { icon: <FamilyIcon />, label: 'Family', color: '#f59e0b' },
    { icon: <SettingsIcon />, label: 'Settings', color: '#8b5cf6' },
  ];

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.bgBase} />
      <View style={styles.bgGlow} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
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
          <View style={styles.headerLeft}>
            <Text style={styles.headerSub}>Dashboard</Text>
            <Text style={styles.headerTitle}>Shield AI</Text>
          </View>
          <View style={styles.tierBadge}>
            <View style={[styles.tierDot, isVPNConnected && styles.tierDotActive]} />
            <Text style={styles.tierText}>{user?.tier?.toUpperCase() || 'PRO'}</Text>
          </View>
        </View>

        {/* Shield Button */}
        <View style={styles.shieldSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleShieldPress}
            style={styles.shieldWrapper}
          >
            <PulseRing isActive={isVPNConnected} />
            <Animated.View
              style={[
                styles.shieldOuter,
                isVPNConnected && styles.shieldOuterActive,
                { transform: [{ scale: buttonScale }] },
              ]}
            >
              <View style={[styles.shieldInner, isVPNConnected && styles.shieldInnerActive]}>
                <View style={[styles.shieldCore, isVPNConnected && styles.shieldCoreActive]}>
                  {isConnecting ? (
                    <View style={styles.loadingDot} />
                  ) : (
                    <ShieldIcon size={40} active={isVPNConnected} />
                  )}
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>

          <Text style={[styles.statusTitle, isVPNConnected && styles.statusTitleActive]}>
            {isConnecting ? 'Connecting...' : isVPNConnected ? 'Protected' : 'Not Protected'}
          </Text>
          <Text style={styles.statusSubtitle}>
            {isVPNConnected ? 'Your DNS queries are secure' : 'Tap the shield to enable protection'}
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statNumber}>{formatNumber(stats?.total_queries || 0)}</Text>
              <Text style={styles.statName}>Queries</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBlock}>
              <Text style={[styles.statNumber, styles.textRed]}>{formatNumber(stats?.blocked_queries || 0)}</Text>
              <Text style={styles.statName}>Blocked</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBlock}>
              <Text style={[styles.statNumber, styles.textGreen]}>{((stats?.cache_hit_rate || 0) * 100).toFixed(0)}%</Text>
              <Text style={styles.statName}>Cached</Text>
            </View>
          </View>
        </View>

        {/* Privacy Score Panel */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelLabel}>Privacy Score</Text>
          </View>
          <View style={styles.scoreSection}>
            <View style={styles.scoreLeft}>
              <Text style={styles.scoreNumber}>{score}</Text>
              <Text style={styles.scoreOf}>/100</Text>
            </View>
            <View style={styles.gradeBox}>
              <Text style={styles.gradeText}>{privacyMetrics?.privacy_grade || 'A+'}</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${score}%` }]} />
          </View>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownValue}>{privacyMetrics?.trackers_blocked || 247}</Text>
              <Text style={styles.breakdownLabel}>Trackers</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownValue}>{privacyMetrics?.ad_requests_blocked || '1.2K'}</Text>
              <Text style={styles.breakdownLabel}>Ads</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownValue}>{privacyMetrics?.analytics_blocked || 89}</Text>
              <Text style={styles.breakdownLabel}>Analytics</Text>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Cache Rate</Text>
              <Text style={styles.metricValueGreen}>{((stats?.cache_hit_rate || 0) * 100).toFixed(0)}%</Text>
            </View>
            <View style={styles.metricBar}>
              <View style={[styles.metricFillGreen, { width: `${(stats?.cache_hit_rate || 0) * 100}%` }]} />
            </View>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricTop}>
              <Text style={styles.metricLabel}>Block Rate</Text>
              <Text style={styles.metricValueRed}>{((stats?.block_rate || 0) * 100).toFixed(1)}%</Text>
            </View>
            <View style={styles.metricBar}>
              <View style={[styles.metricFillRed, { width: `${(stats?.block_rate || 0) * 100}%` }]} />
            </View>
          </View>
        </View>

        {/* Connection Info Panel */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelLabel}>Connection</Text>
          </View>
          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>DNS Server</Text>
              <Text style={styles.infoValue}>Cloudflare</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Encryption</Text>
              <Text style={styles.infoValue}>DoH (256-bit)</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Latency</Text>
              <View style={styles.latencyChip}>
                <Text style={styles.latencyValue}>&lt;1ms</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Status</Text>
              <View style={[styles.statusChip, isVPNConnected && styles.statusChipActive]}>
                <View style={[styles.statusIndicator, isVPNConnected && styles.statusIndicatorActive]} />
                <Text style={[styles.statusValue, isVPNConnected && styles.statusValueActive]}>
                  {isVPNConnected ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} activeOpacity={0.7}>
                <View style={[styles.actionIconWrap, { backgroundColor: `${action.color}15` }]}>
                  {action.icon}
                </View>
                <Text style={styles.actionName}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Shield AI</Text>
          <View style={styles.footerSep} />
          <Text style={styles.footerVer}>v0.4.4</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0f1a',
  },
  bgGlow: {
    position: 'absolute',
    top: -100,
    alignSelf: 'center',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {},
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    color: '#f8fafc',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  tierDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#64748b',
    marginRight: 5,
  },
  tierDotActive: {
    backgroundColor: '#22c55e',
  },
  tierText: {
    fontSize: 10,
    color: '#60a5fa',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Shield Button
  shieldSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  shieldWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pulseRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  shieldOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldOuterActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  shieldInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldInnerActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  shieldCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCoreActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  loadingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f59e0b',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  statusTitleActive: {
    color: '#22c55e',
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#475569',
  },

  // Stats Card
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 18,
    marginBottom: SECTION_GAP,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statSep: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 3,
  },
  textRed: {
    color: '#f87171',
  },
  textGreen: {
    color: '#34d399',
  },
  statName: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },

  // Panel
  panel: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 18,
    marginBottom: SECTION_GAP,
  },
  panelHeader: {
    marginBottom: 14,
  },
  panelLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Privacy Score
  scoreSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  scoreLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 40,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -1.5,
  },
  scoreOf: {
    fontSize: 16,
    color: '#475569',
    marginLeft: 3,
  },
  gradeBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#22c55e',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 2,
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#64748b',
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SECTION_GAP,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
  },
  metricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  metricValueGreen: {
    fontSize: 15,
    fontWeight: '700',
    color: '#34d399',
  },
  metricValueRed: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f87171',
  },
  metricBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  metricFillGreen: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  metricFillRed: {
    height: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 2,
  },

  // Connection Info
  infoList: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  infoKey: {
    fontSize: 13,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#f8fafc',
  },
  latencyChip: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  latencyValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22c55e',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusChipActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  statusIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#64748b',
    marginRight: 5,
  },
  statusIndicatorActive: {
    backgroundColor: '#22c55e',
  },
  statusValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  statusValueActive: {
    color: '#22c55e',
  },

  // Actions
  actionsSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    alignItems: 'center',
    width: (width - CARD_PADDING * 2 - 30) / 4,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionName: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  footerBrand: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  footerSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#475569',
    marginHorizontal: 8,
  },
  footerVer: {
    fontSize: 13,
    color: '#475569',
  },
});
