/**
 * Family Store
 * Manages family profiles and parental controls
 */

import { create } from 'zustand';
import { api } from '../api/client';

export interface TimeRule {
  id: string;
  name: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  action: string;
  domainPatterns: string[];
}

export interface ProfileSettings {
  safeSearch: boolean;
  adultContentFilter: boolean;
  gamblingFilter: boolean;
  socialMediaFilter: boolean;
  gamingFilter: boolean;
  screenTimeLimit?: number;
  bedtime?: { start: string; end: string };
}

export interface FamilyProfile {
  id: string;
  name: string;
  avatar: string;
  type: 'adult' | 'teen' | 'child';
  devices: number;
  protectionLevel: string;
  enabled: boolean;
  settings: ProfileSettings;
  customBlocklists: string[];
  customAllowlists: string[];
  timeRules: TimeRule[];
  deviceIds: string[];
  createdAt: string;
}

export interface ProfileStats {
  totalProfiles: number;
  assignedDevices: number;
  totalRules: number;
}

interface FamilyState {
  // State
  profiles: FamilyProfile[];
  profileStats: ProfileStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProfiles: () => Promise<void>;
  fetchProfileStats: () => Promise<void>;
  createProfile: (name: string, protectionLevel: string) => Promise<FamilyProfile | null>;
  deleteProfile: (id: string) => Promise<boolean>;
  assignDevice: (profileId: string, deviceId: string) => Promise<boolean>;
  refreshAll: () => Promise<void>;
}

// Map protection level to profile type
function protectionLevelToType(level: string): 'adult' | 'teen' | 'child' {
  switch (level?.toLowerCase()) {
    case 'kid':
      return 'child';
    case 'teen':
      return 'teen';
    case 'adult':
    case 'custom':
    default:
      return 'adult';
  }
}

// Get avatar based on profile type
function getAvatarForType(type: 'adult' | 'teen' | 'child', index: number): string {
  const avatars = {
    adult: ['👨', '👩', '🧑'],
    teen: ['👦', '👧', '🧒'],
    child: ['👶', '🧒', '👧'],
  };
  return avatars[type][index % avatars[type].length];
}

// Map API profile to our format
function mapApiProfile(p: any, index: number): FamilyProfile {
  const type = protectionLevelToType(p.protection_level);

  // Build settings from protection level
  const settings: ProfileSettings = {
    safeSearch: type !== 'adult',
    adultContentFilter: type !== 'adult',
    gamblingFilter: type !== 'adult',
    socialMediaFilter: type === 'child',
    gamingFilter: type === 'child',
    screenTimeLimit: type === 'child' ? 120 : type === 'teen' ? 180 : undefined,
    bedtime: type !== 'adult' ? { start: '21:00', end: '07:00' } : undefined,
  };

  return {
    id: p.id,
    name: p.name,
    avatar: getAvatarForType(type, index),
    type,
    devices: p.device_ids?.length || 0,
    protectionLevel: p.protection_level,
    enabled: p.enabled ?? true,
    settings,
    customBlocklists: p.custom_blocklists || [],
    customAllowlists: p.custom_allowlists || [],
    timeRules: (p.time_rules || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      daysOfWeek: r.days_of_week,
      startTime: r.start_time,
      endTime: r.end_time,
      action: r.action,
      domainPatterns: r.domain_patterns,
    })),
    deviceIds: p.device_ids || [],
    createdAt: p.created_at,
  };
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  // Initial state
  profiles: [],
  profileStats: null,
  isLoading: false,
  error: null,

  // Fetch all profiles
  fetchProfiles: async () => {
    try {
      const response = await api.profiles.list();
      const profiles = (response.data || []).map(mapApiProfile);
      set({ profiles });
    } catch (error: any) {
      console.error('Failed to fetch profiles:', error);
      set({ error: error.message });
    }
  },

  // Fetch profile statistics
  fetchProfileStats: async () => {
    try {
      const response = await api.profiles.getStats();
      const data = response.data;

      set({
        profileStats: {
          totalProfiles: data.total_profiles || 0,
          assignedDevices: data.assigned_devices || 0,
          totalRules: data.total_rules || 0,
        },
      });
    } catch (error: any) {
      console.error('Failed to fetch profile stats:', error);
      set({ error: error.message });
    }
  },

  // Create a new profile
  createProfile: async (name, protectionLevel) => {
    try {
      const response = await api.profiles.create({ name, protection_level: protectionLevel });
      if (response.data.success && response.data.profile) {
        const profile = mapApiProfile(response.data.profile, get().profiles.length);
        set((state) => ({ profiles: [...state.profiles, profile] }));
        return profile;
      }
      return null;
    } catch (error: any) {
      console.error('Failed to create profile:', error);
      set({ error: error.message });
      return null;
    }
  },

  // Delete a profile
  deleteProfile: async (id) => {
    try {
      const response = await api.profiles.delete(id);
      if (response.data.success) {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
        }));
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Failed to delete profile:', error);
      set({ error: error.message });
      return false;
    }
  },

  // Assign device to profile
  assignDevice: async (profileId, deviceId) => {
    try {
      const response = await api.profiles.assignDevice(profileId, deviceId);
      if (response.data.success) {
        // Refresh profiles to get updated device assignments
        await get().fetchProfiles();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Failed to assign device:', error);
      set({ error: error.message });
      return false;
    }
  },

  // Refresh all data
  refreshAll: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([get().fetchProfiles(), get().fetchProfileStats()]);
    } finally {
      set({ isLoading: false });
    }
  },
}));
