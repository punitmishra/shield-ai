/**
 * Family Screen
 * Profile management and parental controls
 */

import React, { useState, useEffect, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useFamilyStore, FamilyProfile, ProfileSettings } from '../../stores/familyStore';
import { useProtectionStore } from '../../stores/protectionStore';
import {
  ClockIcon,
  MoonIcon,
  BlockIcon,
  SearchIcon,
  SocialIcon,
  GamingIcon,
  PauseIcon,
  ChartIcon,
  AlertIcon,
  UserIcon,
} from '../../components/icons';
import { FamilyScreenSkeleton } from '../../components/Skeleton';

function ProfileCard({ profile, onPress }: { profile: FamilyProfile; onPress: () => void }) {
  const typeColors = {
    adult: '#3b82f6',
    teen: '#8b5cf6',
    child: '#22c55e',
  };

  return (
    <TouchableOpacity style={styles.profileCard} onPress={onPress}>
      <View style={styles.profileHeader}>
        <View style={[styles.avatarContainer, { borderColor: typeColors[profile.type] }]}>
          <Text style={styles.avatar}>{profile.avatar}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <View style={styles.profileMeta}>
            <View style={[styles.typeBadge, { backgroundColor: typeColors[profile.type] + '20' }]}>
              <Text style={[styles.typeText, { color: typeColors[profile.type] }]}>
                {profile.type.charAt(0).toUpperCase() + profile.type.slice(1)}
              </Text>
            </View>
            <Text style={styles.deviceCount}>{profile.devices} devices</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>

      {(profile.settings.screenTimeLimit || profile.settings.bedtime) && (
        <View style={styles.profileControls}>
          {profile.settings.screenTimeLimit && (
            <View style={styles.controlChip}>
              <ClockIcon size={14} color="#f59e0b" />
              <Text style={styles.controlText}>{profile.settings.screenTimeLimit / 60}h limit</Text>
            </View>
          )}
          {profile.settings.bedtime && (
            <View style={styles.controlChip}>
              <MoonIcon size={14} color="#8b5cf6" />
              <Text style={styles.controlText}>
                {profile.settings.bedtime.start} - {profile.settings.bedtime.end}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.filterSummary}>
        {profile.settings.adultContentFilter && <BlockIcon size={16} color="#ef4444" />}
        {profile.settings.gamblingFilter && <BlockIcon size={16} color="#f59e0b" />}
        {profile.settings.socialMediaFilter && <SocialIcon size={16} color="#8b5cf6" />}
        {profile.settings.gamingFilter && <GamingIcon size={16} color="#22c55e" />}
        {profile.settings.safeSearch && <SearchIcon size={16} color="#3b82f6" />}
      </View>
    </TouchableOpacity>
  );
}

function ProfileEditor({
  profile,
  visible,
  onClose,
  onSave
}: {
  profile: FamilyProfile | null;
  visible: boolean;
  onClose: () => void;
  onSave: (profile: FamilyProfile) => void;
}) {
  const [settings, setSettings] = useState<ProfileSettings>(
    profile?.settings || {
      safeSearch: true,
      adultContentFilter: true,
      gamblingFilter: true,
      socialMediaFilter: false,
      gamingFilter: false,
    }
  );

  useEffect(() => {
    if (profile) {
      setSettings(profile.settings);
    }
  }, [profile]);

  if (!profile) return null;

  const updateSetting = (key: keyof ProfileSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{profile.name}'s Settings</Text>
          <TouchableOpacity onPress={() => onSave({ ...profile, settings })}>
            <Text style={styles.modalSave}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Profile Avatar */}
          <View style={styles.editorHeader}>
            <View style={styles.largeAvatar}>
              <Text style={styles.largeAvatarText}>{profile.avatar}</Text>
            </View>
            <Text style={styles.editorName}>{profile.name}</Text>
          </View>

          {/* Content Filters */}
          <View style={styles.editorSection}>
            <Text style={styles.editorSectionTitle}>Content Filters</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconWrap}>
                  <SearchIcon size={20} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Safe Search</Text>
                  <Text style={styles.settingDesc}>Force safe search on Google, Bing, etc.</Text>
                </View>
              </View>
              <Switch
                value={settings.safeSearch}
                onValueChange={(v) => updateSetting('safeSearch', v)}
                trackColor={{ false: '#3f3f46', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconWrap}>
                  <BlockIcon size={20} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Adult Content</Text>
                  <Text style={styles.settingDesc}>Block adult and explicit websites</Text>
                </View>
              </View>
              <Switch
                value={settings.adultContentFilter}
                onValueChange={(v) => updateSetting('adultContentFilter', v)}
                trackColor={{ false: '#3f3f46', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconWrap}>
                  <BlockIcon size={20} color="#f59e0b" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Gambling Sites</Text>
                  <Text style={styles.settingDesc}>Block betting and gambling websites</Text>
                </View>
              </View>
              <Switch
                value={settings.gamblingFilter}
                onValueChange={(v) => updateSetting('gamblingFilter', v)}
                trackColor={{ false: '#3f3f46', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconWrap}>
                  <SocialIcon size={20} color="#8b5cf6" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Social Media</Text>
                  <Text style={styles.settingDesc}>Block social media platforms</Text>
                </View>
              </View>
              <Switch
                value={settings.socialMediaFilter}
                onValueChange={(v) => updateSetting('socialMediaFilter', v)}
                trackColor={{ false: '#3f3f46', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconWrap}>
                  <GamingIcon size={20} color="#22c55e" />
                </View>
                <View>
                  <Text style={styles.settingLabel}>Gaming Sites</Text>
                  <Text style={styles.settingDesc}>Block gaming and entertainment sites</Text>
                </View>
              </View>
              <Switch
                value={settings.gamingFilter}
                onValueChange={(v) => updateSetting('gamingFilter', v)}
                trackColor={{ false: '#3f3f46', true: '#3b82f6' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Time Limits (for non-adults) */}
          {profile.type !== 'adult' && (
            <View style={styles.editorSection}>
              <Text style={styles.editorSectionTitle}>Time Controls</Text>

              <TouchableOpacity style={styles.timeControl}>
                <View style={styles.settingInfo}>
                  <View style={styles.settingIconWrap}>
                    <ClockIcon size={20} color="#f59e0b" />
                  </View>
                  <View>
                    <Text style={styles.settingLabel}>Daily Screen Time</Text>
                    <Text style={styles.settingDesc}>Maximum time allowed per day</Text>
                  </View>
                </View>
                <View style={styles.timeValue}>
                  <Text style={styles.timeValueText}>
                    {settings.screenTimeLimit ? `${settings.screenTimeLimit / 60}h` : 'Unlimited'}
                  </Text>
                  <Text style={styles.chevronSmall}>›</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.timeControl}>
                <View style={styles.settingInfo}>
                  <View style={styles.settingIconWrap}>
                    <MoonIcon size={20} color="#8b5cf6" />
                  </View>
                  <View>
                    <Text style={styles.settingLabel}>Bedtime</Text>
                    <Text style={styles.settingDesc}>Block internet during sleep hours</Text>
                  </View>
                </View>
                <View style={styles.timeValue}>
                  <Text style={styles.timeValueText}>
                    {settings.bedtime
                      ? `${settings.bedtime.start} - ${settings.bedtime.end}`
                      : 'Off'}
                  </Text>
                  <Text style={styles.chevronSmall}>›</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profiles, profileStats, isLoading, refreshAll, createProfile, deleteProfile } = useFamilyStore();
  const { stats } = useProtectionStore();
  const [selectedProfile, setSelectedProfile] = useState<FamilyProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const isPro = user?.tier === 'pro' || user?.tier === 'enterprise';

  // Fetch profiles on mount
  useEffect(() => {
    const load = async () => {
      await refreshAll();
      setInitialLoad(false);
    };
    load();
  }, []);

  // Show skeleton during initial load
  if (initialLoad) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <FamilyScreenSkeleton />
      </View>
    );
  }

  const handleAddProfile = async () => {
    if (!isPro && profiles.length >= 2) {
      Alert.alert(
        'Pro Feature',
        'Upgrade to Pro to add more than 2 family profiles for just $0.99/month!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => console.log('Navigate to upgrade') },
        ]
      );
      return;
    }

    Alert.prompt(
      'New Profile',
      'Enter a name for the new profile:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async (name: string | undefined) => {
            if (name && name.trim()) {
              const profile = await createProfile(name.trim(), 'kid');
              if (profile) {
                Alert.alert('Success', `Profile "${name}" created!`);
              }
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleDeleteProfile = (profile: FamilyProfile) => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete "${profile.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteProfile(profile.id);
            if (success) {
              Alert.alert('Deleted', `Profile "${profile.name}" has been deleted.`);
            }
          },
        },
      ]
    );
  };

  const handleProfilePress = (profile: FamilyProfile) => {
    setSelectedProfile(profile);
    setIsEditing(true);
  };

  const handleSaveProfile = (updatedProfile: FamilyProfile) => {
    // TODO: Implement profile update API
    setIsEditing(false);
    setSelectedProfile(null);
  };

  // Calculate stats
  const totalDevices = profileStats?.assignedDevices || profiles.reduce((sum, p) => sum + p.devices, 0);
  const threatsBlocked = stats?.blocked_queries || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refreshAll}
          tintColor="#3b82f6"
          colors={['#3b82f6']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Family Profiles</Text>
        <Text style={styles.headerSubtitle}>
          Manage protection settings for each family member
        </Text>
      </View>

      {/* Profiles */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profiles ({profiles.length})</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddProfile}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {isLoading && profiles.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#3b82f6" />
            <Text style={styles.loadingText}>Loading profiles...</Text>
          </View>
        ) : profiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No profiles yet</Text>
            <Text style={styles.emptySubtext}>Create a profile to get started</Text>
          </View>
        ) : (
          profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onPress={() => handleProfilePress(profile)}
            />
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionIconWrap}>
            <PauseIcon size={24} color="#ef4444" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Pause Internet</Text>
            <Text style={styles.actionDesc}>Temporarily disable internet for all kids</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionIconWrap}>
            <ChartIcon size={24} color="#8b5cf6" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Activity Report</Text>
            <Text style={styles.actionDesc}>View weekly usage summary</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard}>
          <View style={styles.actionIconWrap}>
            <AlertIcon size={24} color="#f59e0b" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Alert Settings</Text>
            <Text style={styles.actionDesc}>Configure notifications for blocked content</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Family Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Summary</Text>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{threatsBlocked}</Text>
            <Text style={styles.statLabel}>Threats Blocked</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalDevices}</Text>
            <Text style={styles.statLabel}>Devices</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profileStats?.totalProfiles || profiles.length}</Text>
            <Text style={styles.statLabel}>Profiles</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer} />

      {/* Profile Editor Modal */}
      <ProfileEditor
        profile={selectedProfile}
        visible={isEditing}
        onClose={() => {
          setIsEditing(false);
          setSelectedProfile(null);
        }}
        onSave={handleSaveProfile}
      />
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
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 15,
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
    paddingLeft: 4,
  },
  addButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 12,
  },
  emptyContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: 12,
  },
  avatar: {
    fontSize: 28,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deviceCount: {
    color: '#64748b',
    fontSize: 13,
  },
  chevron: {
    color: '#64748b',
    fontSize: 24,
    fontWeight: '300',
  },
  profileControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  controlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  controlText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  filterSummary: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  actionDesc: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  footer: {
    height: 40,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalCancel: {
    color: '#64748b',
    fontSize: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  modalSave: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  editorHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  largeAvatarText: {
    fontSize: 40,
  },
  editorName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  editorSection: {
    marginBottom: 24,
  },
  editorSectionTitle: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    fontWeight: '500',
  },
  settingDesc: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  timeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  timeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeValueText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  chevronSmall: {
    color: '#64748b',
    fontSize: 18,
  },
});
