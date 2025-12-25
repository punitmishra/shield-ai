/**
 * Main Navigator
 * Bottom tab navigation for authenticated users
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

// Screens
import HomeScreen from '../screens/dashboard/HomeScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Placeholder screens (to be implemented)
const ProtectionScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderIcon}>🔒</Text>
    <Text style={styles.placeholderText}>Protection</Text>
    <Text style={styles.placeholderSubtext}>VPN & DNS Settings</Text>
  </View>
);

const AnalyticsScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderIcon}>📊</Text>
    <Text style={styles.placeholderText}>Analytics</Text>
    <Text style={styles.placeholderSubtext}>Query History & Stats</Text>
  </View>
);

const FamilyScreen = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderIcon}>👨‍👩‍👧</Text>
    <Text style={styles.placeholderText}>Family</Text>
    <Text style={styles.placeholderSubtext}>Profiles & Controls</Text>
  </View>
);

const Tab = createBottomTabNavigator();

// Custom tab icon component
const TabIcon = ({ icon, focused }: { icon: string; focused: boolean }) => (
  <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
);

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Protection"
        component={ProtectionScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🛡️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Family"
        component={FamilyScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="👨‍👩‍👧" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1e293b',
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  placeholderSubtext: {
    color: '#64748b',
    fontSize: 16,
  },
});
