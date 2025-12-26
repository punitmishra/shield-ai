/**
 * Onboarding Screen
 * Elegant welcome flow for new users
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ShieldLockIcon,
  PrivacyIcon as PrivacyIconBase,
  SpeedIcon as SpeedIconBase,
  FamilyIcon as FamilyIconBase,
} from '../../components/icons';

const { width, height } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<any>;
  onComplete?: () => void;
};

// Onboarding icon wrappers with larger sizes
const ShieldIcon = () => (
  <View style={[iconStyles.container, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
    <ShieldLockIcon size={56} color="#22c55e" />
  </View>
);

const PrivacyIcon = () => (
  <View style={[iconStyles.container, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
    <PrivacyIconBase size={56} color="#8b5cf6" />
  </View>
);

const SpeedIcon = () => (
  <View style={[iconStyles.container, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
    <SpeedIconBase size={56} color="#f59e0b" />
  </View>
);

const FamilyIcon = () => (
  <View style={[iconStyles.container, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
    <FamilyIconBase size={56} color="#10b981" />
  </View>
);

const slides = [
  {
    id: '1',
    icon: ShieldIcon,
    title: 'DNS Protection',
    subtitle: 'Block threats before they reach you',
    description: 'Shield AI protects your devices by filtering malicious domains at the DNS level, stopping trackers, malware, and phishing attempts.',
    color: '#22c55e',
  },
  {
    id: '2',
    icon: PrivacyIcon,
    title: 'Complete Privacy',
    subtitle: 'Your data stays yours',
    description: 'Encrypted DNS queries ensure your browsing activity remains private. No logs, no tracking, no compromises.',
    color: '#8b5cf6',
  },
  {
    id: '3',
    icon: SpeedIcon,
    title: 'Lightning Fast',
    subtitle: 'Sub-millisecond response times',
    description: 'Our globally distributed infrastructure ensures the fastest DNS resolution without sacrificing security.',
    color: '#f59e0b',
  },
  {
    id: '4',
    icon: FamilyIcon,
    title: 'Protect Everyone',
    subtitle: 'Family-safe browsing',
    description: 'Create custom profiles for each family member with age-appropriate content filtering and screen time controls.',
    color: '#10b981',
  },
];

export default function OnboardingScreen({ navigation, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    // Use callback to trigger state update in RootNavigator
    if (onComplete) {
      onComplete();
    }
  };

  const renderSlide = ({ item }: { item: typeof slides[0] }) => {
    const Icon = item.icon;
    return (
      <View style={styles.slide}>
        <Icon />
        <Text style={styles.title}>{item.title}</Text>
        <Text style={[styles.subtitle, { color: item.color }]}>{item.subtitle}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  const renderDot = (_: any, index: number) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const dotWidth = scrollX.interpolate({
      inputRange,
      outputRange: [8, 24, 8],
      extrapolate: 'clamp',
    });
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.dot,
          { width: dotWidth, opacity },
        ]}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.bgBase} />
      <View style={styles.bgGlow} />

      {/* Skip Button */}
      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + 16 }]}
        onPress={handleSkip}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Bottom Section */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dots */}
        <View style={styles.dotsContainer}>
          {slides.map(renderDot)}
        </View>

        {/* Buttons */}
        <View style={styles.buttonsRow}>
          {currentIndex < slides.length - 1 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.getStartedButton} onPress={handleNext}>
              <Text style={styles.getStartedText}>Get Started</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const iconStyles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
});

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
    top: height * 0.15,
    alignSelf: 'center',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  skipButton: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: height * 0.18,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginHorizontal: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
  },
  nextButton: {
    flex: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
  },
  getStartedButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
