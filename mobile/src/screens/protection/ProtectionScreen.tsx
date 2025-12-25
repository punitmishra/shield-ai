/**
 * Protection Screen
 * VPN toggle, DNS settings, and security controls
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
import { useProtectionStore } from '../../stores/protectionStore';
import { useAuthStore } from '../../stores/authStore';

interface SettingCardProps {
  icon: string;
  title: string;
  description: string;
  enabled?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  premium?: boolean;
}

function SettingCard({ icon, title, description, enabled, onToggle, onPress, premium }: SettingCardProps) {
  const { user } = useAuthStore();
  const isPro = user?.tier === 'pro' || user?.tier === 'enterprise';

  const handlePress = () => {
    if (premium && !isPro) {
      Alert.alert(
        'Pro Feature',
        'Upgrade to Pro to access this feature for just $0.99/month!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => console.log('Navigate to upgrade') },
        ]
      );
      return;
    }
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[styles.settingCard, premium && !isPro && styles.premiumCard]}
      onPress={handlePress}
      disabled={onToggle !== undefined}
    >
      <View style={styles.settingIcon}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.settingContent}>
        <View style={styles.settingHeader}>
          <Text style={styles.settingTitle}>{title}</Text>
          {premium && !isPro && (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      {onToggle !== undefined && (
        <Switch
          value={enabled}
          onValueChange={(value) => {
            if (premium && !isPro) {
              handlePress();
              return;
            }
            onToggle(value);
          }}
          trackColor={{ false: '#3f3f46', true: '#3b82f6' }}
          thumbColor="#fff"
        />
      )}
    </TouchableOpacity>
  );
}

export default function ProtectionScreen() {
  const { isVPNConnected, isDNSEnabled, toggleVPN } = useProtectionStore();
  const { user } = useAuthStore();

  const [malwareBlocking, setMalwareBlocking] = useState(true);
  const [adBlocking, setAdBlocking] = useState(true);
  const [trackerBlocking, setTrackerBlocking] = useState(true);
  const [phishingProtection, setPhishingProtection] = useState(true);
  const [cryptominerBlocking, setCryptominerBlocking] = useState(false);
  const [adultContentFilter, setAdultContentFilter] = useState(false);

  const isPro = user?.tier === 'pro' || user?.tier === 'enterprise';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* VPN Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>VPN Protection</Text>

        <TouchableOpacity
          style={[styles.vpnCard, isVPNConnected && styles.vpnCardConnected]}
          onPress={toggleVPN}
        >
          <View style={styles.vpnStatus}>
            <View style={[styles.vpnIndicator, isVPNConnected && styles.vpnIndicatorConnected]} />
            <View>
              <Text style={styles.vpnTitle}>
                {isVPNConnected ? 'VPN Connected' : 'VPN Disconnected'}
              </Text>
              <Text style={styles.vpnSubtitle}>
                {isVPNConnected
                  ? 'Your traffic is encrypted and protected'
                  : 'Tap to connect and secure your connection'}
              </Text>
            </View>
          </View>
          <Text style={styles.vpnIcon}>{isVPNConnected ? '🔒' : '🔓'}</Text>
        </TouchableOpacity>

        {isVPNConnected && (
          <View style={styles.vpnStats}>
            <View style={styles.vpnStat}>
              <Text style={styles.vpnStatValue}>256-bit</Text>
              <Text style={styles.vpnStatLabel}>Encryption</Text>
            </View>
            <View style={styles.vpnStatDivider} />
            <View style={styles.vpnStat}>
              <Text style={styles.vpnStatValue}>US-West</Text>
              <Text style={styles.vpnStatLabel}>Server</Text>
            </View>
            <View style={styles.vpnStatDivider} />
            <View style={styles.vpnStat}>
              <Text style={styles.vpnStatValue}>12ms</Text>
              <Text style={styles.vpnStatLabel}>Latency</Text>
            </View>
          </View>
        )}
      </View>

      {/* DNS Protection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DNS Protection</Text>

        <SettingCard
          icon="🦠"
          title="Malware Blocking"
          description="Block known malware and ransomware domains"
          enabled={malwareBlocking}
          onToggle={setMalwareBlocking}
        />

        <SettingCard
          icon="📢"
          title="Ad Blocking"
          description="Block intrusive ads and popups"
          enabled={adBlocking}
          onToggle={setAdBlocking}
        />

        <SettingCard
          icon="👁️"
          title="Tracker Blocking"
          description="Prevent tracking across websites"
          enabled={trackerBlocking}
          onToggle={setTrackerBlocking}
        />

        <SettingCard
          icon="🎣"
          title="Phishing Protection"
          description="Block phishing and scam websites"
          enabled={phishingProtection}
          onToggle={setPhishingProtection}
        />
      </View>

      {/* Advanced Protection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advanced Protection</Text>

        <SettingCard
          icon="⛏️"
          title="Cryptominer Blocking"
          description="Block cryptocurrency mining scripts"
          enabled={cryptominerBlocking}
          onToggle={setCryptominerBlocking}
          premium
        />

        <SettingCard
          icon="🔞"
          title="Adult Content Filter"
          description="Block adult and explicit content"
          enabled={adultContentFilter}
          onToggle={setAdultContentFilter}
          premium
        />

        <SettingCard
          icon="🎰"
          title="Gambling Sites"
          description="Block gambling and betting websites"
          enabled={false}
          onToggle={() => {}}
          premium
        />

        <SettingCard
          icon="🎮"
          title="Gaming Sites"
          description="Block gaming and entertainment sites"
          enabled={false}
          onToggle={() => {}}
          premium
        />
      </View>

      {/* Custom Lists */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Lists</Text>

        <TouchableOpacity style={styles.listCard}>
          <View style={styles.listInfo}>
            <Text style={styles.listIcon}>🚫</Text>
            <View>
              <Text style={styles.listTitle}>Blocklist</Text>
              <Text style={styles.listCount}>130 domains</Text>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.listCard}>
          <View style={styles.listInfo}>
            <Text style={styles.listIcon}>✅</Text>
            <View>
              <Text style={styles.listTitle}>Allowlist</Text>
              <Text style={styles.listCount}>5 domains</Text>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* DNS Server */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DNS Server</Text>

        <View style={styles.dnsCard}>
          <View style={styles.dnsInfo}>
            <Text style={styles.dnsLabel}>Primary DNS</Text>
            <Text style={styles.dnsValue}>dns.shield-ai.com</Text>
          </View>
          <View style={styles.dnsStatus}>
            <View style={styles.dnsStatusDot} />
            <Text style={styles.dnsStatusText}>Connected</Text>
          </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingLeft: 4,
  },
  vpnCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  vpnCardConnected: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  vpnStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vpnIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  vpnIndicatorConnected: {
    backgroundColor: '#22c55e',
  },
  vpnTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  vpnSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  vpnIcon: {
    fontSize: 32,
  },
  vpnStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  vpnStat: {
    flex: 1,
    alignItems: 'center',
  },
  vpnStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  vpnStatValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  vpnStatLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  settingCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  premiumCard: {
    opacity: 0.7,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  settingContent: {
    flex: 1,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  proBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  proBadgeText: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listIcon: {
    fontSize: 24,
  },
  listTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  listCount: {
    color: '#64748b',
    fontSize: 13,
  },
  chevron: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '300',
  },
  dnsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dnsInfo: {},
  dnsLabel: {
    color: '#64748b',
    fontSize: 13,
  },
  dnsValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  dnsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dnsStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  dnsStatusText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    height: 40,
  },
});
