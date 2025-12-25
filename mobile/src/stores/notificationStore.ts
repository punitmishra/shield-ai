/**
 * Notification Store
 * Manages push notification state and preferences
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  removeNotificationListener,
  clearBadge,
} from '../services/notifications';
import { api } from '../api/client';

interface NotificationPreferences {
  enabled: boolean;
  threatAlerts: boolean;
  weeklyReports: boolean;
  familyAlerts: boolean;
}

interface NotificationState {
  // State
  expoPushToken: string | null;
  isRegistered: boolean;
  preferences: NotificationPreferences;
  lastNotification: Notifications.Notification | null;

  // Actions
  initialize: () => Promise<void>;
  registerToken: () => Promise<string | null>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  setEnabled: (enabled: boolean) => Promise<void>;
  handleNotificationReceived: (notification: Notifications.Notification) => void;
  handleNotificationResponse: (response: Notifications.NotificationResponse) => void;
  syncTokenWithBackend: (deviceId: string) => Promise<void>;
  clearToken: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      expoPushToken: null,
      isRegistered: false,
      preferences: {
        enabled: true,
        threatAlerts: true,
        weeklyReports: true,
        familyAlerts: true,
      },
      lastNotification: null,

      // Initialize notification system
      initialize: async () => {
        const { preferences } = get();

        // If notifications are disabled, don't register
        if (!preferences.enabled) {
          return;
        }

        // Register for push notifications
        const token = await get().registerToken();

        if (token) {
          set({ expoPushToken: token, isRegistered: true });
        }
      },

      // Register for push notifications and get token
      registerToken: async () => {
        try {
          const token = await registerForPushNotifications();
          if (token) {
            set({ expoPushToken: token, isRegistered: true });
            return token;
          }
          return null;
        } catch (error) {
          console.error('Failed to register for push notifications:', error);
          return null;
        }
      },

      // Update notification preferences
      updatePreferences: (prefs) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...prefs,
          },
        }));
      },

      // Enable or disable all notifications
      setEnabled: async (enabled) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            enabled,
          },
        }));

        if (enabled) {
          // Re-register for notifications
          await get().registerToken();
        } else {
          // Clear badge when disabling
          await clearBadge();
        }
      },

      // Handle notification received in foreground
      handleNotificationReceived: (notification) => {
        set({ lastNotification: notification });

        const data = notification.request.content.data;
        console.log('Notification received:', {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data,
        });
      },

      // Handle user tapping on notification
      handleNotificationResponse: (response) => {
        const data = response.notification.request.content.data;
        console.log('Notification tapped:', data);

        // Handle navigation based on notification type
        if (data?.type) {
          switch (data.type) {
            case 'threat_alert':
              // Navigate to Protection screen
              // navigation.navigate('Protection');
              break;
            case 'weekly_report':
              // Navigate to Analytics screen
              // navigation.navigate('Analytics');
              break;
            case 'family_alert':
              // Navigate to Family screen
              // navigation.navigate('Family');
              break;
            default:
              // Navigate to Home
              break;
          }
        }
      },

      // Sync push token with backend
      syncTokenWithBackend: async (deviceId) => {
        const { expoPushToken } = get();

        if (!expoPushToken || !deviceId) {
          return;
        }

        try {
          await api.devices.updatePushToken(deviceId, expoPushToken);
          console.log('Push token synced with backend');
        } catch (error) {
          console.error('Failed to sync push token:', error);
        }
      },

      // Clear push token (on logout)
      clearToken: () => {
        set({
          expoPushToken: null,
          isRegistered: false,
          lastNotification: null,
        });
      },
    }),
    {
      name: 'shield-ai-notifications',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        // Don't persist token - it should be re-registered on app start
      }),
    }
  )
);

// Notification listener subscriptions (managed outside store)
let notificationReceivedSubscription: Notifications.Subscription | null = null;
let notificationResponseSubscription: Notifications.Subscription | null = null;

/**
 * Setup notification listeners
 * Call this in App.tsx on mount
 */
export function setupNotificationListeners(): () => void {
  const store = useNotificationStore.getState();

  // Listen for notifications received while app is foregrounded
  notificationReceivedSubscription = addNotificationReceivedListener((notification) => {
    store.handleNotificationReceived(notification);
  });

  // Listen for user interactions with notifications
  notificationResponseSubscription = addNotificationResponseListener((response) => {
    store.handleNotificationResponse(response);
  });

  // Return cleanup function
  return () => {
    if (notificationReceivedSubscription) {
      removeNotificationListener(notificationReceivedSubscription);
    }
    if (notificationResponseSubscription) {
      removeNotificationListener(notificationResponseSubscription);
    }
  };
}
