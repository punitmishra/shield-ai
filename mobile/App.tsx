/**
 * Shield AI Mobile App
 * AI-Powered DNS Protection
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import * as SplashScreenExpo from 'expo-splash-screen';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/stores/authStore';
import { useNotificationStore, setupNotificationListeners } from './src/stores/notificationStore';
import { getLastNotificationResponse } from './src/services/notifications';
import SplashScreen from './src/components/SplashScreen';

// Keep native splash screen visible while we load
SplashScreenExpo.preventAutoHideAsync();

export default function App() {
  const { isAuthenticated, device, registerDevice, checkAuth } = useAuthStore();
  const { initialize, expoPushToken, syncTokenWithBackend } = useNotificationStore();
  const [showSplash, setShowSplash] = useState(true);
  const [appIsReady, setAppIsReady] = useState(false);

  // Prepare app and hide native splash screen
  useEffect(() => {
    async function prepare() {
      try {
        // Check authentication status
        await checkAuth();
      } catch (e) {
        console.warn('Error preparing app:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Hide native splash when app is ready
  useEffect(() => {
    if (appIsReady) {
      SplashScreenExpo.hideAsync();
    }
  }, [appIsReady]);

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

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Show nothing until app is ready
  if (!appIsReady) {
    return null;
  }

  // Show animated splash screen
  if (showSplash) {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreen onFinish={handleSplashFinish} />
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
