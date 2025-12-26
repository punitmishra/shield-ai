/**
 * Animated Icon Wrapper
 * Adds micro-animations to icons
 */

import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, Easing } from 'react-native';

interface AnimatedIconProps {
  children: React.ReactNode;
  animation?: 'pulse' | 'bounce' | 'spin' | 'shake' | 'glow' | 'none';
  duration?: number;
  delay?: number;
  loop?: boolean;
  style?: ViewStyle;
  active?: boolean;
}

/**
 * Pulse animation - subtle scale in/out
 */
export function PulseIcon({
  children,
  duration = 2000,
  active = true,
  style,
}: Omit<AnimatedIconProps, 'animation'>) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      scaleAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [active, duration, scaleAnim]);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Bounce animation - spring effect
 */
export function BounceIcon({
  children,
  duration = 1000,
  delay = 0,
  active = true,
  style,
}: Omit<AnimatedIconProps, 'animation'>) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      translateY.setValue(0);
      return;
    }

    const timeout = setTimeout(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -8,
            duration: duration / 4,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.delay(duration / 2),
        ])
      );
      animation.start();
    }, delay);

    return () => {
      clearTimeout(timeout);
      translateY.setValue(0);
    };
  }, [active, duration, delay, translateY]);

  return (
    <Animated.View style={[{ transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Spin animation - continuous rotation
 */
export function SpinIcon({
  children,
  duration = 2000,
  active = true,
  style,
}: Omit<AnimatedIconProps, 'animation'>) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      rotateAnim.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [active, duration, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[{ transform: [{ rotate }] }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Shake animation - error/attention effect
 */
export function ShakeIcon({
  children,
  duration = 500,
  active = true,
  style,
}: Omit<AnimatedIconProps, 'animation'>) {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      translateX.setValue(0);
      return;
    }

    const animation = Animated.sequence([
      Animated.timing(translateX, {
        toValue: 10,
        duration: duration / 5,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: -8,
        duration: duration / 5,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 6,
        duration: duration / 5,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: -4,
        duration: duration / 5,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: duration / 5,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
  }, [active, duration, translateX]);

  return (
    <Animated.View style={[{ transform: [{ translateX }] }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Glow animation - opacity fade for active states
 */
export function GlowIcon({
  children,
  duration = 1500,
  active = true,
  style,
}: Omit<AnimatedIconProps, 'animation'>) {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      opacityAnim.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [active, duration, opacityAnim]);

  return (
    <Animated.View style={[{ opacity: opacityAnim }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * General AnimatedIcon wrapper
 */
export default function AnimatedIcon({
  children,
  animation = 'none',
  duration = 1000,
  delay = 0,
  active = true,
  style,
}: AnimatedIconProps) {
  switch (animation) {
    case 'pulse':
      return (
        <PulseIcon duration={duration} active={active} style={style}>
          {children}
        </PulseIcon>
      );
    case 'bounce':
      return (
        <BounceIcon duration={duration} delay={delay} active={active} style={style}>
          {children}
        </BounceIcon>
      );
    case 'spin':
      return (
        <SpinIcon duration={duration} active={active} style={style}>
          {children}
        </SpinIcon>
      );
    case 'shake':
      return (
        <ShakeIcon duration={duration} active={active} style={style}>
          {children}
        </ShakeIcon>
      );
    case 'glow':
      return (
        <GlowIcon duration={duration} active={active} style={style}>
          {children}
        </GlowIcon>
      );
    default:
      return <>{children}</>;
  }
}
