/**
 * Skeleton Loading Components
 * Animated placeholder components for loading states
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  Dimensions,
  DimensionValue,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Base Skeleton component with shimmer animation
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Circle skeleton for avatars
 */
export function SkeletonCircle({ size = 40, style }: { size?: number; style?: ViewStyle }) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}

/**
 * Text line skeleton
 */
export function SkeletonText({
  width = '100%',
  height = 14,
  borderRadius = 4,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  return <Skeleton width={width} height={height} borderRadius={borderRadius} style={style} />;
}

/**
 * Skeleton for stat cards on HomeScreen
 */
export function SkeletonStatCard() {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <SkeletonCircle size={40} />
        <View style={styles.statCardText}>
          <SkeletonText width={60} height={12} />
          <SkeletonText width={80} height={24} style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton for activity items
 */
export function SkeletonActivityItem() {
  return (
    <View style={styles.activityItem}>
      <SkeletonCircle size={32} />
      <View style={styles.activityContent}>
        <SkeletonText width="70%" height={14} />
        <SkeletonText width="40%" height={12} style={{ marginTop: 6 }} />
      </View>
      <SkeletonText width={50} height={12} />
    </View>
  );
}

/**
 * Skeleton for the protection status card
 */
export function SkeletonProtectionCard() {
  return (
    <View style={styles.protectionCard}>
      <SkeletonCircle size={80} />
      <View style={styles.protectionText}>
        <SkeletonText width={120} height={20} style={{ marginTop: 16 }} />
        <SkeletonText width={180} height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/**
 * Skeleton for profile cards in Family screen
 */
export function SkeletonProfileCard() {
  return (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <SkeletonCircle size={48} />
        <View style={styles.profileInfo}>
          <SkeletonText width={100} height={16} />
          <SkeletonText width={60} height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      <View style={styles.profileStats}>
        <SkeletonText width="30%" height={32} />
        <SkeletonText width="30%" height={32} />
        <SkeletonText width="30%" height={32} />
      </View>
    </View>
  );
}

/**
 * Skeleton for analytics chart
 */
export function SkeletonChart() {
  return (
    <View style={styles.chartContainer}>
      <SkeletonText width={100} height={16} style={{ marginBottom: 16 }} />
      <View style={styles.chartBars}>
        {[0.6, 0.8, 0.5, 0.9, 0.7, 0.4, 0.85].map((h, i) => (
          <Skeleton
            key={i}
            width={24}
            height={120 * h}
            borderRadius={4}
            style={{ marginHorizontal: 4 }}
          />
        ))}
      </View>
      <View style={styles.chartLabels}>
        {Array(7).fill(0).map((_, i) => (
          <SkeletonText key={i} width={20} height={10} />
        ))}
      </View>
    </View>
  );
}

/**
 * Skeleton for setting rows
 */
export function SkeletonSettingRow() {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <SkeletonCircle size={28} />
        <SkeletonText width={120} height={16} style={{ marginLeft: 12 }} />
      </View>
      <SkeletonText width={40} height={16} />
    </View>
  );
}

/**
 * Full HomeScreen skeleton
 */
export function HomeScreenSkeleton() {
  return (
    <View style={styles.screenContainer}>
      {/* Protection Status */}
      <SkeletonProtectionCard />

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <SkeletonStatCard />
        <SkeletonStatCard />
      </View>

      {/* Activity Section */}
      <View style={styles.sectionHeader}>
        <SkeletonText width={120} height={18} />
        <SkeletonText width={60} height={14} />
      </View>

      <View style={styles.activityList}>
        <SkeletonActivityItem />
        <SkeletonActivityItem />
        <SkeletonActivityItem />
        <SkeletonActivityItem />
      </View>
    </View>
  );
}

/**
 * Full Analytics skeleton
 */
export function AnalyticsScreenSkeleton() {
  return (
    <View style={styles.screenContainer}>
      {/* Time Filter */}
      <View style={styles.timeFilter}>
        <SkeletonText width={60} height={32} borderRadius={16} />
        <SkeletonText width={60} height={32} borderRadius={16} />
        <SkeletonText width={60} height={32} borderRadius={16} />
        <SkeletonText width={60} height={32} borderRadius={16} />
      </View>

      {/* Chart */}
      <SkeletonChart />

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </View>
    </View>
  );
}

/**
 * Full Family screen skeleton
 */
export function FamilyScreenSkeleton() {
  return (
    <View style={styles.screenContainer}>
      <View style={styles.sectionHeader}>
        <SkeletonText width={100} height={18} />
        <SkeletonCircle size={32} />
      </View>

      <SkeletonProfileCard />
      <SkeletonProfileCard />
      <SkeletonProfileCard />
    </View>
  );
}

/**
 * Full Settings skeleton
 */
export function SettingsScreenSkeleton() {
  return (
    <View style={styles.screenContainer}>
      {/* Account Card */}
      <View style={styles.accountCard}>
        <SkeletonCircle size={60} />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <SkeletonText width="80%" height={18} />
          <SkeletonText width={60} height={24} style={{ marginTop: 8 }} borderRadius={12} />
        </View>
      </View>

      {/* Settings Sections */}
      {[1, 2, 3].map((section) => (
        <View key={section} style={styles.settingsSection}>
          <SkeletonText width={80} height={13} style={{ marginBottom: 8 }} />
          <View style={styles.settingsCard}>
            <SkeletonSettingRow />
            <SkeletonSettingRow />
            <SkeletonSettingRow />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  // Protection Card
  protectionCard: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 16,
  },
  protectionText: {
    alignItems: 'center',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCardText: {
    marginLeft: 12,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  // Activity
  activityList: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  // Profile
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Chart
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 120,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  // Time Filter
  timeFilter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  // Settings
  settingsSection: {
    marginTop: 24,
  },
  settingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Account
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
});
