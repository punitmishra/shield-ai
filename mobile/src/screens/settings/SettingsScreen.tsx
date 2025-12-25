/**
 * Settings Screen
 * Account, preferences, and app settings
 */

import React, { useState } from 'react';
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
import { api } from '../../api/client';

interface SettingRowProps {
  icon: string;
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
        <Text style={styles.settingIcon}>{icon}</Text>
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoBlockThreats, setAutoBlockThreats] = useState(true);

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
            icon="🛡️"
            label="Auto-block Threats"
            toggle
            toggleValue={autoBlockThreats}
            onToggle={setAutoBlockThreats}
          />
          <SettingRow icon="🚫" label="Blocked Domains" value="130" />
          <SettingRow icon="✅" label="Allowed Domains" value="5" />
          <SettingRow icon="👨‍👩‍👧" label="Family Profiles" />
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.sectionContent}>
          <SettingRow
            icon="🔔"
            label="Push Notifications"
            toggle
            toggleValue={notificationsEnabled}
            onToggle={setNotificationsEnabled}
          />
          <SettingRow icon="⚠️" label="Threat Alerts" />
          <SettingRow icon="📊" label="Weekly Reports" />
        </View>
      </View>

      {/* Device Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device</Text>
        <View style={styles.sectionContent}>
          <SettingRow
            icon="📱"
            label="Device Name"
            value={device?.device_name || 'Not registered'}
          />
          <SettingRow icon="🔗" label="Manage Devices" />
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.sectionContent}>
          <SettingRow icon="ℹ️" label="Version" value="1.0.0" />
          <SettingRow icon="📜" label="Terms of Service" />
          <SettingRow icon="🔒" label="Privacy Policy" />
          <SettingRow icon="💬" label="Send Feedback" />
        </View>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <View style={styles.sectionContent}>
          <SettingRow
            icon="🚪"
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
  settingIcon: {
    fontSize: 20,
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
