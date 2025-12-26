/**
 * Root Navigator
 * Handles onboarding, auth state, and main app navigation
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/authStore';

// Onboarding
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Navigator
import MainNavigator from './MainNavigator';

const Stack = createNativeStackNavigator();

// DEV MODE: Set to true to bypass login for testing
const DEV_SKIP_AUTH = __DEV__ && true;
// DEV MODE: Set to true to always show onboarding
const DEV_SHOW_ONBOARDING = __DEV__ && false;

export default function RootNavigator() {
  const { isAuthenticated, checkAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Check onboarding status
        const onboardingComplete = await AsyncStorage.getItem('onboarding_complete');
        setHasSeenOnboarding(DEV_SHOW_ONBOARDING ? false : onboardingComplete === 'true');

        // Check auth status
        if (!DEV_SKIP_AUTH) {
          await checkAuth();
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Skip auth in dev mode for testing
  const showMainApp = DEV_SKIP_AUTH || isAuthenticated;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0f1a' },
          animation: 'fade',
        }}
      >
        {!hasSeenOnboarding ? (
          // Onboarding Flow
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : showMainApp ? (
          // Main App
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          // Auth Flow
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
