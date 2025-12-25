/**
 * Shield AI Mobile App
 * AI-Powered DNS Protection
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/stores/authStore';
import { useNotificationStore, setupNotificationListeners } from './src/stores/notificationStore';
import { getLastNotificationResponse } from './src/services/notifications';

export default function App() {
  const { isAuthenticated, device, registerDevice } = useAuthStore();
  const { initialize, expoPushToken, syncTokenWithBackend } = useNotificationStore();

  // Setup notification listeners on mount
  useEffect(() => {
    const cleanup = setupNotificationListeners();

    // Check if app was opened from a notification
    getLastNotificationResponse().then((response) => {
      if (response) {
        console.log('App opened from notification:', response);
      }
    });

    return cleanup;
  }, []);

  // Initialize notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      initialize();
    }
  }, [isAuthenticated]);

  // Register device with push token after auth
  useEffect(() => {
    const registerDeviceWithToken = async () => {
      if (isAuthenticated && expoPushToken && !device) {
        const deviceName = Device.deviceName || `${Platform.OS} Device`;
        const platform = Platform.OS;
        await registerDevice(deviceName, platform, expoPushToken);
      }
    };

    registerDeviceWithToken();
  }, [isAuthenticated, expoPushToken, device]);

  // Sync token with backend when device is registered and token changes
  useEffect(() => {
    if (device?.device_id && expoPushToken) {
      syncTokenWithBackend(device.device_id);
    }
  }, [device?.device_id, expoPushToken]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
