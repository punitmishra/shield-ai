/**
 * Login Screen
 * Elegant authentication with SVG branding
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

// Shield AI Logo - View-based to avoid SVG issues in Expo Go
const ShieldLogo = () => (
  <View style={logoStyles.container}>
    <View style={logoStyles.shield}>
      <View style={logoStyles.shieldTop} />
      <View style={logoStyles.shieldBottom} />
      <View style={logoStyles.centerDot} />
      <View style={logoStyles.networkDots}>
        <View style={[logoStyles.smallDot, { backgroundColor: '#8b5cf6' }]} />
        <View style={[logoStyles.smallDot, { backgroundColor: '#22c55e' }]} />
      </View>
    </View>
  </View>
);

// Apple Icon - View-based
const AppleIcon = () => (
  <View style={socialIconStyles.container}>
    <Text style={socialIconStyles.appleIcon}></Text>
  </View>
);

// Google Icon - View-based with colored squares
const GoogleIcon = () => (
  <View style={socialIconStyles.container}>
    <View style={socialIconStyles.googleContainer}>
      <View style={[socialIconStyles.googleQuadrant, { backgroundColor: '#EA4335', borderTopLeftRadius: 4 }]} />
      <View style={[socialIconStyles.googleQuadrant, { backgroundColor: '#FBBC05', borderTopRightRadius: 4 }]} />
      <View style={[socialIconStyles.googleQuadrant, { backgroundColor: '#34A853', borderBottomLeftRadius: 4 }]} />
      <View style={[socialIconStyles.googleQuadrant, { backgroundColor: '#4285F4', borderBottomRightRadius: 4 }]} />
    </View>
  </View>
);

const logoStyles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shield: {
    width: 55,
    height: 65,
    borderWidth: 2.5,
    borderColor: '#3b82f6',
    borderRadius: 8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldTop: {
    position: 'absolute',
    top: 8,
    width: 35,
    height: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 1,
  },
  shieldBottom: {
    position: 'absolute',
    bottom: 12,
    width: 25,
    height: 2,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 1,
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    marginBottom: 8,
  },
  networkDots: {
    flexDirection: 'row',
    gap: 16,
  },
  smallDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.7,
  },
});

const socialIconStyles = StyleSheet.create({
  container: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleIcon: {
    fontSize: 18,
    color: '#f8fafc',
  },
  googleContainer: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  googleQuadrant: {
    width: 9,
    height: 9,
  },
});

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      await login(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Please check your credentials');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgBase} />
      <View style={styles.bgGlow} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoGlow} />
            <ShieldLogo />
            <Text style={styles.logoText}>Shield AI</Text>
            <Text style={styles.tagline}>AI-Powered DNS Protection</Text>
          </View>

          {/* Welcome Text */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to continue protecting your network</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#475569"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#475569"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.signInButton, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton}>
              <AppleIcon />
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <GoogleIcon />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signUpSection}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0f1a',
  },
  bgGlow: {
    position: 'absolute',
    top: -50,
    alignSelf: 'center',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 12,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  welcomeSection: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#64748b',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    color: '#64748b',
    paddingHorizontal: 16,
    fontSize: 13,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#f8fafc',
  },
  signUpSection: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 15,
    color: '#64748b',
  },
  signUpLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
