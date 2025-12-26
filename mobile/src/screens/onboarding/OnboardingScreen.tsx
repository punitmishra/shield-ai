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
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width, height } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

// Elegant SVG Icons for each slide
const ShieldIcon = () => (
  <Svg width={120} height={120} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#3b82f6" />
        <Stop offset="100%" stopColor="#22c55e" />
      </LinearGradient>
    </Defs>
    <Path
      d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"
      fill="url(#shieldGrad)"
      fillOpacity={0.2}
      stroke="url(#shieldGrad)"
      strokeWidth={1.5}
    />
    <Path
      d="M9 12l2 2 4-4"
      stroke="#22c55e"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PrivacyIcon = () => (
  <Svg width={120} height={120} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="privacyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#8b5cf6" />
        <Stop offset="100%" stopColor="#3b82f6" />
      </LinearGradient>
    </Defs>
    <Circle cx="12" cy="12" r="10" stroke="url(#privacyGrad)" strokeWidth={1.5} strokeOpacity={0.3} />
    <Circle cx="12" cy="12" r="6" stroke="url(#privacyGrad)" strokeWidth={1.5} strokeOpacity={0.6} />
    <Circle cx="12" cy="12" r="2" fill="url(#privacyGrad)" />
    <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="url(#privacyGrad)" strokeWidth={1.5} strokeLinecap="round" strokeOpacity={0.4} />
  </Svg>
);

const SpeedIcon = () => (
  <Svg width={120} height={120} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="speedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#f59e0b" />
        <Stop offset="100%" stopColor="#ef4444" />
      </LinearGradient>
    </Defs>
    <Circle cx="12" cy="14" r="8" stroke="url(#speedGrad)" strokeWidth={1.5} strokeOpacity={0.3} />
    <Path d="M12 14l3-5" stroke="url(#speedGrad)" strokeWidth={2} strokeLinecap="round" />
    <Circle cx="12" cy="14" r="2" fill="url(#speedGrad)" />
    <Path d="M5 10l2 1M19 10l-2 1M12 6v2" stroke="url(#speedGrad)" strokeWidth={1.5} strokeLinecap="round" strokeOpacity={0.5} />
  </Svg>
);

const FamilyIcon = () => (
  <Svg width={120} height={120} viewBox="0 0 24 24" fill="none">
    <Defs>
      <LinearGradient id="familyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#10b981" />
        <Stop offset="100%" stopColor="#06b6d4" />
      </LinearGradient>
    </Defs>
    <Circle cx="12" cy="8" r="4" stroke="url(#familyGrad)" strokeWidth={1.5} />
    <Path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="url(#familyGrad)" strokeWidth={1.5} strokeLinecap="round" />
    <Circle cx="20" cy="8" r="2.5" stroke="url(#familyGrad)" strokeWidth={1} strokeOpacity={0.5} />
    <Circle cx="4" cy="8" r="2.5" stroke="url(#familyGrad)" strokeWidth={1} strokeOpacity={0.5} />
    <Path d="M20 14v2M4 14v2" stroke="url(#familyGrad)" strokeWidth={1} strokeLinecap="round" strokeOpacity={0.5} />
  </Svg>
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

export default function OnboardingScreen({ navigation }: Props) {
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
    navigation.replace('Login');
  };

  const renderSlide = ({ item, index }: { item: typeof slides[0]; index: number }) => {
    const Icon = item.icon;
    return (
      <View style={styles.slide}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconGlow, { backgroundColor: `${item.color}10` }]} />
          <Icon />
        </View>
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
    paddingTop: height * 0.15,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  iconGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
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
