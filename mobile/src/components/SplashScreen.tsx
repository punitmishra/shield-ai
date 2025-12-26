/**
 * Animated Splash Screen
 * Branded loading screen with Shield AI logo animation
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Shield entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse and glow animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    // Text fade in
    setTimeout(() => {
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 300);

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    pulseLoop.start();
    glowLoop.start();

    // Finish splash after 2.5 seconds
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2500);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Background glow effects */}
      <Animated.View
        style={[
          styles.glowCircle,
          styles.glowCircle1,
          { opacity: glowAnim, transform: [{ scale: pulseAnim }] },
        ]}
      />
      <Animated.View
        style={[
          styles.glowCircle,
          styles.glowCircle2,
          { opacity: Animated.multiply(glowAnim, 0.5) },
        ]}
      />

      {/* Main content */}
      <View style={styles.content}>
        {/* Shield logo */}
        <Animated.View
          style={[
            styles.shieldContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.shieldOuter,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.shieldInner}>
              <View style={styles.shieldCore}>
                {/* Shield shape */}
                <View style={styles.shieldShape}>
                  <View style={styles.shieldTop} />
                  <View style={styles.shieldBottom} />
                  {/* Checkmark */}
                  <View style={styles.checkmark}>
                    <View style={styles.checkmarkShort} />
                    <View style={styles.checkmarkLong} />
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* App name */}
        <Animated.View style={[styles.textContainer, { opacity: textFadeAnim }]}>
          <Text style={styles.appName}>Shield AI</Text>
          <Text style={styles.tagline}>AI-Powered DNS Protection</Text>
        </Animated.View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View
              style={[styles.progressFill, { width: progressWidth }]}
            />
          </View>
          <Animated.Text style={[styles.loadingText, { opacity: textFadeAnim }]}>
            Initializing protection...
          </Animated.Text>
        </View>
      </View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: textFadeAnim }]}>
        <Text style={styles.footerText}>Open Source DNS Security</Text>
        <Text style={styles.version}>v1.0.0</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  glowCircle1: {
    width: 300,
    height: 300,
    top: height * 0.3 - 150,
  },
  glowCircle2: {
    width: 400,
    height: 400,
    top: height * 0.3 - 200,
  },
  content: {
    alignItems: 'center',
  },
  shieldContainer: {
    marginBottom: 32,
  },
  shieldOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldShape: {
    width: 40,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldTop: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#22c55e',
    backgroundColor: 'transparent',
  },
  shieldBottom: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    height: 28,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 3,
    borderTopWidth: 0,
    borderColor: '#22c55e',
    backgroundColor: 'transparent',
  },
  checkmark: {
    position: 'absolute',
    width: 20,
    height: 15,
  },
  checkmarkShort: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    width: 8,
    height: 3,
    backgroundColor: '#22c55e',
    borderRadius: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  checkmarkLong: {
    position: 'absolute',
    bottom: 4,
    right: 0,
    width: 14,
    height: 3,
    backgroundColor: '#22c55e',
    borderRadius: 1.5,
    transform: [{ rotate: '-45deg' }],
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  progressContainer: {
    alignItems: 'center',
    width: width * 0.6,
  },
  progressBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  version: {
    fontSize: 12,
    color: '#334155',
  },
});
