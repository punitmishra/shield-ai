/**
 * Settings Screen
 * Account, preferences, and app settings
 */

import React, { useState, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import {
  ShieldIcon,
  BlockIcon,
  AllowIcon,
  FamilyIcon,
  BellIcon,
  AlertIcon,
  ChartIcon,
  DeviceIcon,
  LinkIcon,
  InfoIcon,
  DocumentIcon,
  LockIcon,
  MessageIcon,
  LogoutIcon,
} from '../../components/icons';

interface SettingRowProps {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
}

function SettingRow({ icon, label, onPress, value, toggle, toggleValue, onToggle, danger }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={toggle}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIconWrap}>{icon}</View>
        <Text style={[styles.settingLabel, danger && styles.dangerText]}>{label}</Text>
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: '#3f3f46', true: '#3b82f6' }}
          thumbColor="#fff"
        />
      ) : value ? (
        <Text style={styles.settingValue}>{value}</Text>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, logout, device } = useAuthStore();
  const { preferences, updatePreferences, setEnabled, clearToken } = useNotificationStore();
  const [autoBlockThreats, setAutoBlockThreats] = useState(true);

  const handleNotificationToggle = async (value: boolean) => {
    await setEnabled(value);
  };

  const handleThreatAlertsToggle = (value: boolean) => {
    updatePreferences({ threatAlerts: value });
  };

  const handleWeeklyReportsToggle = (value: boolean) => {
    updatePreferences({ weeklyReports: value });
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              clearToken(); // Clear push notification token
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const handleUpgrade = () => {
    Alert.alert(
      'Upgrade to Pro',
      'Get access to VPN, family controls, and premium features for just $0.99/month!',
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Upgrade Now', onPress: () => console.log('Navigate to upgrade screen') },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionContent}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.email?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileEmail}>{user?.email || 'Not logged in'}</Text>
              <View style={styles.tierRow}>
                <View style={[styles.tierBadge, user?.tier === 'pro' && styles.proBadge]}>
                  <Text style={styles.tierBadgeText}>
                    {user?.tier?.toUpperCase() || 'FREE'}
                  </Text>
                </View>
                {user?.tier === 'free' && (
                  <TouchableOpacity onPress={handleUpgrade}>
                    <Text style={styles.upgradeLink}>Upgrade</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Protection Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Protection</Text>
        <View style={styles.sectionContent}>
          <SettingRow
            icon={<ShieldIcon size={20} color="#22c55e" />}
            label="Auto-block Threats"
            toggle
            toggleValue={autoBlockThreats}
            onToggle={setAutoBlockThreats}
          />
          <SettingRow icon={<BlockIcon size={20} color="#ef4444" />} label="Blocked Domains" value="130" />
          <SettingRow icon={<AllowIcon size={20} color="#22c55e" />} label="Allowed Domains" value="5" />
          <SettingRow icon={<FamilyIcon size={20} color="#f59e0b" />} label="Family Profiles" />
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.sectionContent}>
          <SettingRow
            icon={<BellIcon size={20} color="#3b82f6" />}
            label="Push Notifications"
            toggle
            toggleValue={preferences.enabled}
            onToggle={handleNotificationToggle}
          />
          <SettingRow
            icon={<AlertIcon size={20} color="#f59e0b" />}
            label="Threat Alerts"
            toggle
            toggleValue={preferences.threatAlerts}
            onToggle={handleThreatAlertsToggle}
          />
          <SettingRow
            icon={<ChartIcon size={20} color="#8b5cf6" />}
            label="Weekly Reports"
            toggle
            toggleValue={preferences.weeklyReports}
            onToggle={handleWeeklyReportsToggle}
          />
        </View>
      </View>

      {/* Device Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device</Text>
        <View style={styles.sectionContent}>
          <SettingRow
            icon={<DeviceIcon size={20} color="#3b82f6" />}
            label="Device Name"
            value={device?.device_name || 'Not registered'}
          />
          <SettingRow icon={<LinkIcon size={20} color="#3b82f6" />} label="Manage Devices" />
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.sectionContent}>
          <SettingRow icon={<InfoIcon size={20} color="#3b82f6" />} label="Version" value="1.0.0" />
          <SettingRow icon={<DocumentIcon size={20} color="#64748b" />} label="Terms of Service" />
          <SettingRow icon={<LockIcon size={20} color="#22c55e" />} label="Privacy Policy" />
          <SettingRow icon={<MessageIcon size={20} color="#22c55e" />} label="Send Feedback" />
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <View style={styles.sectionContent}>
          <SettingRow
            icon={<LogoutIcon size={20} color="#ef4444" />}
            label="Log Out"
            onPress={handleLogout}
            danger
          />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Shield AI v1.0.0</Text>
        <Text style={styles.footerSubtext}>Open Source DNS Protection</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionContent: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierBadge: {
    backgroundColor: 'rgba(100, 116, 139, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  tierBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  upgradeLink: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
  },
  settingValue: {
    color: '#64748b',
    fontSize: 16,
  },
  chevron: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '300',
  },
  dangerText: {
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  footerSubtext: {
    color: '#475569',
    fontSize: 12,
    marginTop: 4,
  },
});
