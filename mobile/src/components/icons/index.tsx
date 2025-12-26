/**
 * Shield AI Custom Icon Library
 * Unique, detailed View-based icons with layered designs
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface IconProps {
  size?: number;
  color?: string;
  secondaryColor?: string;
  active?: boolean;
}

// ============================================================================
// SHIELD ICONS
// ============================================================================

/**
 * Main Shield Icon - Hero element with layered design
 */
export const ShieldIcon = ({
  size = 32,
  color = '#3b82f6',
  active = false,
}: IconProps) => {
  const scale = size / 32;
  const activeColor = '#22c55e';
  const mainColor = active ? activeColor : color;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Outer glow layer */}
      <View
        style={[
          styles.shieldOuter,
          {
            width: 26 * scale,
            height: 30 * scale,
            borderTopLeftRadius: 13 * scale,
            borderTopRightRadius: 13 * scale,
            borderBottomLeftRadius: 4 * scale,
            borderBottomRightRadius: 4 * scale,
            backgroundColor: mainColor + '15',
            borderWidth: 2 * scale,
            borderColor: mainColor + '40',
          },
        ]}
      />
      {/* Main shield body */}
      <View
        style={[
          styles.shieldBody,
          {
            width: 22 * scale,
            height: 26 * scale,
            borderTopLeftRadius: 11 * scale,
            borderTopRightRadius: 11 * scale,
            borderBottomLeftRadius: 3 * scale,
            borderBottomRightRadius: 3 * scale,
            backgroundColor: mainColor + '25',
            borderWidth: 2 * scale,
            borderColor: mainColor,
          },
        ]}
      >
        {/* Inner highlight */}
        <View
          style={[
            styles.shieldHighlight,
            {
              width: 14 * scale,
              height: 3 * scale,
              borderRadius: 1.5 * scale,
              backgroundColor: mainColor + '30',
              top: 4 * scale,
            },
          ]}
        />
        {/* Center element */}
        {active ? (
          <Text style={[styles.checkmark, { fontSize: 12 * scale, color: mainColor }]}>✓</Text>
        ) : (
          <View
            style={[
              styles.shieldDot,
              {
                width: 6 * scale,
                height: 6 * scale,
                borderRadius: 3 * scale,
                backgroundColor: mainColor,
              },
            ]}
          />
        )}
      </View>
    </View>
  );
};

/**
 * Shield with Lock - Security focused
 */
export const ShieldLockIcon = ({
  size = 32,
  color = '#22c55e',
}: IconProps) => {
  const scale = size / 32;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Shield outline */}
      <View
        style={[
          styles.shieldBody,
          {
            width: 24 * scale,
            height: 28 * scale,
            borderTopLeftRadius: 12 * scale,
            borderTopRightRadius: 12 * scale,
            borderBottomLeftRadius: 4 * scale,
            borderBottomRightRadius: 4 * scale,
            backgroundColor: color + '15',
            borderWidth: 2 * scale,
            borderColor: color,
          },
        ]}
      >
        {/* Lock body */}
        <View
          style={{
            width: 10 * scale,
            height: 8 * scale,
            backgroundColor: color,
            borderRadius: 2 * scale,
            marginTop: 2 * scale,
          }}
        />
        {/* Lock shackle */}
        <View
          style={{
            position: 'absolute',
            top: 4 * scale,
            width: 8 * scale,
            height: 6 * scale,
            borderWidth: 2 * scale,
            borderBottomWidth: 0,
            borderColor: color,
            borderTopLeftRadius: 4 * scale,
            borderTopRightRadius: 4 * scale,
          }}
        />
        {/* Keyhole */}
        <View
          style={{
            position: 'absolute',
            bottom: 6 * scale,
            width: 3 * scale,
            height: 4 * scale,
            backgroundColor: color + '30',
            borderRadius: 1.5 * scale,
          }}
        />
      </View>
    </View>
  );
};

// ============================================================================
// NAVIGATION ICONS
// ============================================================================

/**
 * Home Icon - House with roof detail
 */
export const HomeIcon = ({
  size = 24,
  color = '#64748b',
  active = false,
}: IconProps) => {
  const scale = size / 24;
  const mainColor = active ? '#3b82f6' : color;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Roof */}
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 10 * scale,
          borderRightWidth: 10 * scale,
          borderBottomWidth: 8 * scale,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: mainColor,
          position: 'absolute',
          top: 2 * scale,
        }}
      />
      {/* Chimney */}
      <View
        style={{
          position: 'absolute',
          top: 3 * scale,
          right: 5 * scale,
          width: 3 * scale,
          height: 5 * scale,
          backgroundColor: mainColor,
          borderTopLeftRadius: 1 * scale,
          borderTopRightRadius: 1 * scale,
        }}
      />
      {/* House body */}
      <View
        style={{
          width: 14 * scale,
          height: 10 * scale,
          backgroundColor: active ? mainColor + '30' : 'transparent',
          borderWidth: 2 * scale,
          borderTopWidth: 0,
          borderColor: mainColor,
          borderBottomLeftRadius: 2 * scale,
          borderBottomRightRadius: 2 * scale,
          position: 'absolute',
          bottom: 2 * scale,
        }}
      >
        {/* Door */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            alignSelf: 'center',
            width: 4 * scale,
            height: 6 * scale,
            backgroundColor: mainColor,
            borderTopLeftRadius: 2 * scale,
            borderTopRightRadius: 2 * scale,
          }}
        />
      </View>
    </View>
  );
};

/**
 * Protection Icon - Shield with pulse
 */
export const ProtectionIcon = ({
  size = 24,
  color = '#64748b',
  active = false,
}: IconProps) => {
  const scale = size / 24;
  const mainColor = active ? '#22c55e' : color;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Outer ring */}
      {active && (
        <View
          style={{
            position: 'absolute',
            width: 22 * scale,
            height: 22 * scale,
            borderRadius: 11 * scale,
            borderWidth: 1.5 * scale,
            borderColor: mainColor + '40',
          }}
        />
      )}
      {/* Shield */}
      <View
        style={{
          width: 16 * scale,
          height: 18 * scale,
          borderTopLeftRadius: 8 * scale,
          borderTopRightRadius: 8 * scale,
          borderBottomLeftRadius: 2 * scale,
          borderBottomRightRadius: 2 * scale,
          backgroundColor: active ? mainColor + '25' : 'transparent',
          borderWidth: 2 * scale,
          borderColor: mainColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {active && (
          <Text style={{ fontSize: 10 * scale, color: mainColor, fontWeight: '700' }}>✓</Text>
        )}
      </View>
    </View>
  );
};

/**
 * Analytics Icon - Chart bars with trend
 */
export const AnalyticsIcon = ({
  size = 24,
  color = '#64748b',
  active = false,
}: IconProps) => {
  const scale = size / 24;
  const mainColor = active ? '#8b5cf6' : color;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Base line */}
      <View
        style={{
          position: 'absolute',
          bottom: 3 * scale,
          width: 18 * scale,
          height: 2 * scale,
          backgroundColor: mainColor + '40',
          borderRadius: 1 * scale,
        }}
      />
      {/* Bar 1 */}
      <View
        style={{
          position: 'absolute',
          left: 3 * scale,
          bottom: 5 * scale,
          width: 3 * scale,
          height: 6 * scale,
          backgroundColor: mainColor + (active ? '' : '80'),
          borderTopLeftRadius: 1.5 * scale,
          borderTopRightRadius: 1.5 * scale,
        }}
      />
      {/* Bar 2 */}
      <View
        style={{
          position: 'absolute',
          left: 8 * scale,
          bottom: 5 * scale,
          width: 3 * scale,
          height: 10 * scale,
          backgroundColor: mainColor,
          borderTopLeftRadius: 1.5 * scale,
          borderTopRightRadius: 1.5 * scale,
        }}
      />
      {/* Bar 3 */}
      <View
        style={{
          position: 'absolute',
          left: 13 * scale,
          bottom: 5 * scale,
          width: 3 * scale,
          height: 14 * scale,
          backgroundColor: mainColor + (active ? '' : '80'),
          borderTopLeftRadius: 1.5 * scale,
          borderTopRightRadius: 1.5 * scale,
        }}
      />
      {/* Trend line */}
      {active && (
        <View
          style={{
            position: 'absolute',
            top: 4 * scale,
            right: 3 * scale,
            width: 4 * scale,
            height: 4 * scale,
            borderTopWidth: 2 * scale,
            borderRightWidth: 2 * scale,
            borderColor: '#22c55e',
            transform: [{ rotate: '-45deg' }],
          }}
        />
      )}
    </View>
  );
};

/**
 * Family Icon - Connected people
 */
export const FamilyIcon = ({
  size = 24,
  color = '#64748b',
  active = false,
}: IconProps) => {
  const scale = size / 24;
  const mainColor = active ? '#f59e0b' : color;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Main person - center */}
      <View style={{ alignItems: 'center', position: 'absolute', top: 2 * scale }}>
        {/* Head */}
        <View
          style={{
            width: 8 * scale,
            height: 8 * scale,
            borderRadius: 4 * scale,
            backgroundColor: active ? mainColor : 'transparent',
            borderWidth: 2 * scale,
            borderColor: mainColor,
          }}
        />
        {/* Body */}
        <View
          style={{
            width: 12 * scale,
            height: 6 * scale,
            borderTopLeftRadius: 6 * scale,
            borderTopRightRadius: 6 * scale,
            backgroundColor: active ? mainColor + '30' : 'transparent',
            borderWidth: 2 * scale,
            borderBottomWidth: 0,
            borderColor: mainColor,
            marginTop: 1 * scale,
          }}
        />
      </View>
      {/* Left person - smaller */}
      <View style={{ position: 'absolute', left: 1 * scale, bottom: 2 * scale, alignItems: 'center' }}>
        <View
          style={{
            width: 5 * scale,
            height: 5 * scale,
            borderRadius: 2.5 * scale,
            borderWidth: 1.5 * scale,
            borderColor: mainColor + '70',
          }}
        />
        <View
          style={{
            width: 7 * scale,
            height: 4 * scale,
            borderTopLeftRadius: 3.5 * scale,
            borderTopRightRadius: 3.5 * scale,
            borderWidth: 1.5 * scale,
            borderBottomWidth: 0,
            borderColor: mainColor + '70',
            marginTop: 0.5 * scale,
          }}
        />
      </View>
      {/* Right person - smaller */}
      <View style={{ position: 'absolute', right: 1 * scale, bottom: 2 * scale, alignItems: 'center' }}>
        <View
          style={{
            width: 5 * scale,
            height: 5 * scale,
            borderRadius: 2.5 * scale,
            borderWidth: 1.5 * scale,
            borderColor: mainColor + '70',
          }}
        />
        <View
          style={{
            width: 7 * scale,
            height: 4 * scale,
            borderTopLeftRadius: 3.5 * scale,
            borderTopRightRadius: 3.5 * scale,
            borderWidth: 1.5 * scale,
            borderBottomWidth: 0,
            borderColor: mainColor + '70',
            marginTop: 0.5 * scale,
          }}
        />
      </View>
    </View>
  );
};

/**
 * Settings Icon - Gear with detail
 */
export const SettingsIcon = ({
  size = 24,
  color = '#64748b',
  active = false,
}: IconProps) => {
  const scale = size / 24;
  const mainColor = active ? '#3b82f6' : color;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Center circle */}
      <View
        style={{
          width: 8 * scale,
          height: 8 * scale,
          borderRadius: 4 * scale,
          backgroundColor: active ? mainColor + '30' : 'transparent',
          borderWidth: 2 * scale,
          borderColor: mainColor,
        }}
      />
      {/* Gear teeth - 8 teeth */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: 4 * scale,
            height: 4 * scale,
            backgroundColor: mainColor,
            borderRadius: 1 * scale,
            transform: [
              { rotate: `${angle}deg` },
              { translateY: -8 * scale },
            ],
          }}
        />
      ))}
      {/* Inner dot */}
      <View
        style={{
          position: 'absolute',
          width: 3 * scale,
          height: 3 * scale,
          borderRadius: 1.5 * scale,
          backgroundColor: mainColor,
        }}
      />
    </View>
  );
};

// ============================================================================
// ACTION ICONS
// ============================================================================

/**
 * Search/Analyze Icon - Magnifying glass with detail
 */
export const SearchIcon = ({
  size = 24,
  color = '#3b82f6',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Glass circle */}
      <View
        style={{
          width: 14 * scale,
          height: 14 * scale,
          borderRadius: 7 * scale,
          borderWidth: 2.5 * scale,
          borderColor: color,
          position: 'absolute',
          top: 2 * scale,
          left: 2 * scale,
        }}
      />
      {/* Shine */}
      <View
        style={{
          width: 4 * scale,
          height: 4 * scale,
          borderRadius: 2 * scale,
          backgroundColor: color + '30',
          position: 'absolute',
          top: 5 * scale,
          left: 5 * scale,
        }}
      />
      {/* Handle */}
      <View
        style={{
          width: 7 * scale,
          height: 3 * scale,
          backgroundColor: color,
          borderRadius: 1.5 * scale,
          position: 'absolute',
          bottom: 3 * scale,
          right: 2 * scale,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
};

/**
 * History/Clock Icon - Clock with segments
 */
export const HistoryIcon = ({
  size = 24,
  color = '#10b981',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Outer circle */}
      <View
        style={{
          width: 20 * scale,
          height: 20 * scale,
          borderRadius: 10 * scale,
          borderWidth: 2 * scale,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Hour markers */}
        {[0, 90, 180, 270].map((angle, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: 2 * scale,
              height: 2 * scale,
              borderRadius: 1 * scale,
              backgroundColor: color + '60',
              transform: [
                { rotate: `${angle}deg` },
                { translateY: -7 * scale },
              ],
            }}
          />
        ))}
        {/* Center dot */}
        <View
          style={{
            width: 3 * scale,
            height: 3 * scale,
            borderRadius: 1.5 * scale,
            backgroundColor: color,
          }}
        />
        {/* Hour hand */}
        <View
          style={{
            position: 'absolute',
            width: 2 * scale,
            height: 5 * scale,
            backgroundColor: color,
            borderRadius: 1 * scale,
            transform: [{ translateY: -2.5 * scale }],
          }}
        />
        {/* Minute hand */}
        <View
          style={{
            position: 'absolute',
            width: 2 * scale,
            height: 7 * scale,
            backgroundColor: color,
            borderRadius: 1 * scale,
            transform: [{ rotate: '90deg' }, { translateY: -3.5 * scale }],
          }}
        />
      </View>
    </View>
  );
};

/**
 * Block Icon - Circle with slash
 */
export const BlockIcon = ({
  size = 24,
  color = '#ef4444',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      <View
        style={{
          width: 18 * scale,
          height: 18 * scale,
          borderRadius: 9 * scale,
          borderWidth: 2 * scale,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Diagonal line */}
        <View
          style={{
            width: 14 * scale,
            height: 2.5 * scale,
            backgroundColor: color,
            borderRadius: 1.25 * scale,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    </View>
  );
};

/**
 * Allow/Check Icon - Circle with checkmark
 */
export const AllowIcon = ({
  size = 24,
  color = '#22c55e',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      <View
        style={{
          width: 18 * scale,
          height: 18 * scale,
          borderRadius: 9 * scale,
          backgroundColor: color + '20',
          borderWidth: 2 * scale,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 12 * scale, color: color, fontWeight: '700' }}>✓</Text>
      </View>
    </View>
  );
};

/**
 * Network Icon - Connected nodes
 */
export const NetworkIcon = ({
  size = 24,
  color = '#3b82f6',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Center node */}
      <View
        style={{
          width: 6 * scale,
          height: 6 * scale,
          borderRadius: 3 * scale,
          backgroundColor: color,
        }}
      />
      {/* Outer nodes */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <React.Fragment key={i}>
          {/* Connection line */}
          <View
            style={{
              position: 'absolute',
              width: 6 * scale,
              height: 1.5 * scale,
              backgroundColor: color + '60',
              transform: [
                { rotate: `${angle}deg` },
                { translateX: 5 * scale },
              ],
            }}
          />
          {/* Outer node */}
          <View
            style={{
              position: 'absolute',
              width: 4 * scale,
              height: 4 * scale,
              borderRadius: 2 * scale,
              backgroundColor: color + '80',
              transform: [
                { rotate: `${angle}deg` },
                { translateY: -8 * scale },
              ],
            }}
          />
        </React.Fragment>
      ))}
    </View>
  );
};

/**
 * Privacy Icon - Eye with slash
 */
export const PrivacyIcon = ({
  size = 24,
  color = '#8b5cf6',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Eye outline */}
      <View
        style={{
          width: 20 * scale,
          height: 12 * scale,
          borderRadius: 10 * scale,
          borderWidth: 2 * scale,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Pupil */}
        <View
          style={{
            width: 6 * scale,
            height: 6 * scale,
            borderRadius: 3 * scale,
            backgroundColor: color,
          }}
        />
        {/* Inner dot */}
        <View
          style={{
            position: 'absolute',
            width: 2 * scale,
            height: 2 * scale,
            borderRadius: 1 * scale,
            backgroundColor: '#fff',
            top: 3 * scale,
            left: 8 * scale,
          }}
        />
      </View>
      {/* Privacy slash */}
      <View
        style={{
          position: 'absolute',
          width: 20 * scale,
          height: 2 * scale,
          backgroundColor: color,
          borderRadius: 1 * scale,
          transform: [{ rotate: '-30deg' }],
        }}
      />
    </View>
  );
};

/**
 * Speed Icon - Gauge meter
 */
export const SpeedIcon = ({
  size = 24,
  color = '#f59e0b',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Gauge arc */}
      <View
        style={{
          width: 20 * scale,
          height: 10 * scale,
          borderTopLeftRadius: 10 * scale,
          borderTopRightRadius: 10 * scale,
          borderWidth: 2.5 * scale,
          borderBottomWidth: 0,
          borderColor: color + '40',
          position: 'absolute',
          top: 4 * scale,
        }}
      />
      {/* Active arc portion */}
      <View
        style={{
          width: 20 * scale,
          height: 10 * scale,
          borderTopLeftRadius: 10 * scale,
          borderTopRightRadius: 10 * scale,
          borderWidth: 2.5 * scale,
          borderBottomWidth: 0,
          borderColor: color,
          borderRightColor: 'transparent',
          position: 'absolute',
          top: 4 * scale,
          transform: [{ rotate: '-30deg' }],
        }}
      />
      {/* Needle */}
      <View
        style={{
          width: 2 * scale,
          height: 8 * scale,
          backgroundColor: color,
          borderRadius: 1 * scale,
          position: 'absolute',
          bottom: 5 * scale,
          transform: [{ rotate: '45deg' }, { translateY: -2 * scale }],
        }}
      />
      {/* Center dot */}
      <View
        style={{
          width: 4 * scale,
          height: 4 * scale,
          borderRadius: 2 * scale,
          backgroundColor: color,
          position: 'absolute',
          bottom: 5 * scale,
        }}
      />
    </View>
  );
};

/**
 * Lock Icon - Security lock
 */
export const LockIcon = ({
  size = 24,
  color = '#22c55e',
  active = false,
}: IconProps) => {
  const scale = size / 24;
  const mainColor = active ? '#22c55e' : color;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Lock body */}
      <View
        style={{
          width: 14 * scale,
          height: 10 * scale,
          backgroundColor: active ? mainColor + '30' : mainColor + '20',
          borderWidth: 2 * scale,
          borderColor: mainColor,
          borderRadius: 3 * scale,
          position: 'absolute',
          bottom: 3 * scale,
        }}
      />
      {/* Shackle */}
      <View
        style={{
          width: 10 * scale,
          height: 8 * scale,
          borderWidth: 2.5 * scale,
          borderBottomWidth: 0,
          borderColor: mainColor,
          borderTopLeftRadius: 5 * scale,
          borderTopRightRadius: 5 * scale,
          position: 'absolute',
          top: 4 * scale,
        }}
      />
      {/* Keyhole */}
      <View
        style={{
          width: 4 * scale,
          height: 4 * scale,
          borderRadius: 2 * scale,
          backgroundColor: mainColor,
          position: 'absolute',
          bottom: 6 * scale,
        }}
      />
    </View>
  );
};

/**
 * Unlock Icon - Open lock
 */
export const UnlockIcon = ({
  size = 24,
  color = '#ef4444',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Lock body */}
      <View
        style={{
          width: 14 * scale,
          height: 10 * scale,
          backgroundColor: color + '20',
          borderWidth: 2 * scale,
          borderColor: color,
          borderRadius: 3 * scale,
          position: 'absolute',
          bottom: 3 * scale,
        }}
      />
      {/* Open shackle */}
      <View
        style={{
          width: 10 * scale,
          height: 8 * scale,
          borderWidth: 2.5 * scale,
          borderBottomWidth: 0,
          borderRightWidth: 0,
          borderColor: color,
          borderTopLeftRadius: 5 * scale,
          position: 'absolute',
          top: 2 * scale,
          left: 3 * scale,
        }}
      />
    </View>
  );
};

/**
 * Malware/Bug Icon
 */
export const MalwareIcon = ({
  size = 24,
  color = '#ef4444',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Bug body */}
      <View
        style={{
          width: 12 * scale,
          height: 14 * scale,
          backgroundColor: color + '25',
          borderWidth: 2 * scale,
          borderColor: color,
          borderRadius: 6 * scale,
        }}
      />
      {/* Head */}
      <View
        style={{
          position: 'absolute',
          top: 2 * scale,
          width: 8 * scale,
          height: 6 * scale,
          backgroundColor: color,
          borderRadius: 4 * scale,
        }}
      />
      {/* Legs left */}
      {[0, 1, 2].map((i) => (
        <View
          key={`l${i}`}
          style={{
            position: 'absolute',
            left: 2 * scale,
            top: (6 + i * 4) * scale,
            width: 4 * scale,
            height: 2 * scale,
            backgroundColor: color,
            borderRadius: 1 * scale,
            transform: [{ rotate: '-30deg' }],
          }}
        />
      ))}
      {/* Legs right */}
      {[0, 1, 2].map((i) => (
        <View
          key={`r${i}`}
          style={{
            position: 'absolute',
            right: 2 * scale,
            top: (6 + i * 4) * scale,
            width: 4 * scale,
            height: 2 * scale,
            backgroundColor: color,
            borderRadius: 1 * scale,
            transform: [{ rotate: '30deg' }],
          }}
        />
      ))}
    </View>
  );
};

/**
 * Ad/Megaphone Icon
 */
export const AdIcon = ({
  size = 24,
  color = '#f59e0b',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Megaphone body */}
      <View
        style={{
          width: 14 * scale,
          height: 10 * scale,
          backgroundColor: color + '25',
          borderWidth: 2 * scale,
          borderColor: color,
          borderTopRightRadius: 5 * scale,
          borderBottomRightRadius: 5 * scale,
          position: 'absolute',
          right: 3 * scale,
        }}
      />
      {/* Handle */}
      <View
        style={{
          width: 6 * scale,
          height: 12 * scale,
          backgroundColor: color,
          borderRadius: 2 * scale,
          position: 'absolute',
          left: 4 * scale,
        }}
      />
      {/* Sound waves */}
      <View
        style={{
          position: 'absolute',
          right: 1 * scale,
          width: 4 * scale,
          height: 4 * scale,
          borderWidth: 1.5 * scale,
          borderLeftWidth: 0,
          borderColor: color + '60',
          borderRadius: 2 * scale,
        }}
      />
    </View>
  );
};

/**
 * Phishing/Hook Icon
 */
export const PhishingIcon = ({
  size = 24,
  color = '#dc2626',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Hook curve */}
      <View
        style={{
          width: 14 * scale,
          height: 14 * scale,
          borderWidth: 2.5 * scale,
          borderTopWidth: 0,
          borderRightWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: 10 * scale,
          position: 'absolute',
          bottom: 4 * scale,
          left: 5 * scale,
        }}
      />
      {/* Line */}
      <View
        style={{
          width: 2.5 * scale,
          height: 10 * scale,
          backgroundColor: color,
          position: 'absolute',
          top: 2 * scale,
          right: 7 * scale,
        }}
      />
      {/* Hook point */}
      <View
        style={{
          width: 4 * scale,
          height: 4 * scale,
          backgroundColor: color,
          borderRadius: 2 * scale,
          position: 'absolute',
          bottom: 3 * scale,
          left: 5 * scale,
        }}
      />
    </View>
  );
};

/**
 * Tracker/Eye Icon (different from PrivacyIcon)
 */
export const TrackerIcon = ({
  size = 24,
  color = '#8b5cf6',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Eye outline */}
      <View
        style={{
          width: 20 * scale,
          height: 12 * scale,
          borderRadius: 10 * scale,
          borderWidth: 2 * scale,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Iris */}
        <View
          style={{
            width: 8 * scale,
            height: 8 * scale,
            borderRadius: 4 * scale,
            backgroundColor: color + '40',
            borderWidth: 2 * scale,
            borderColor: color,
          }}
        />
        {/* Pupil */}
        <View
          style={{
            position: 'absolute',
            width: 4 * scale,
            height: 4 * scale,
            borderRadius: 2 * scale,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
};

/**
 * Tip/Lightbulb Icon
 */
export const TipIcon = ({
  size = 24,
  color = '#f59e0b',
}: IconProps) => {
  const scale = size / 24;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Bulb */}
      <View
        style={{
          width: 14 * scale,
          height: 14 * scale,
          borderRadius: 7 * scale,
          backgroundColor: color + '25',
          borderWidth: 2 * scale,
          borderColor: color,
          position: 'absolute',
          top: 2 * scale,
        }}
      />
      {/* Light rays */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            width: 3 * scale,
            height: 1.5 * scale,
            backgroundColor: color + '60',
            borderRadius: 0.75 * scale,
            top: 9 * scale,
            transform: [
              { rotate: `${angle}deg` },
              { translateY: -11 * scale },
            ],
          }}
        />
      ))}
      {/* Inner glow */}
      <View
        style={{
          width: 6 * scale,
          height: 6 * scale,
          borderRadius: 3 * scale,
          backgroundColor: color,
          position: 'absolute',
          top: 6 * scale,
        }}
      />
      {/* Base */}
      <View
        style={{
          width: 8 * scale,
          height: 4 * scale,
          backgroundColor: color,
          borderBottomLeftRadius: 2 * scale,
          borderBottomRightRadius: 2 * scale,
          position: 'absolute',
          bottom: 3 * scale,
        }}
      />
      {/* Base lines */}
      <View
        style={{
          width: 6 * scale,
          height: 1 * scale,
          backgroundColor: color + '60',
          position: 'absolute',
          bottom: 5 * scale,
        }}
      />
    </View>
  );
};

/**
 * Notification Bell Icon
 */
export const BellIcon = ({
  size = 24,
  color = '#64748b',
  active = false,
}: IconProps) => {
  const scale = size / 24;
  const mainColor = active ? '#f59e0b' : color;

  return (
    <View style={[styles.iconContainer, { width: size, height: size }]}>
      {/* Bell body */}
      <View
        style={{
          width: 14 * scale,
          height: 14 * scale,
          borderTopLeftRadius: 7 * scale,
          borderTopRightRadius: 7 * scale,
          backgroundColor: active ? mainColor + '30' : 'transparent',
          borderWidth: 2 * scale,
          borderBottomWidth: 0,
          borderColor: mainColor,
          position: 'absolute',
          top: 3 * scale,
        }}
      />
      {/* Bell bottom */}
      <View
        style={{
          width: 18 * scale,
          height: 3 * scale,
          backgroundColor: mainColor,
          borderRadius: 1.5 * scale,
          position: 'absolute',
          bottom: 5 * scale,
        }}
      />
      {/* Clapper */}
      <View
        style={{
          width: 4 * scale,
          height: 4 * scale,
          borderRadius: 2 * scale,
          backgroundColor: mainColor,
          position: 'absolute',
          bottom: 2 * scale,
        }}
      />
      {/* Top nub */}
      <View
        style={{
          width: 4 * scale,
          height: 3 * scale,
          borderRadius: 2 * scale,
          backgroundColor: mainColor,
          position: 'absolute',
          top: 1 * scale,
        }}
      />
      {/* Alert dot */}
      {active && (
        <View
          style={{
            width: 6 * scale,
            height: 6 * scale,
            borderRadius: 3 * scale,
            backgroundColor: '#ef4444',
            position: 'absolute',
            top: 2 * scale,
            right: 3 * scale,
          }}
        />
      )}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldOuter: {
    position: 'absolute',
  },
  shieldBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldHighlight: {
    position: 'absolute',
  },
  shieldDot: {},
  checkmark: {
    fontWeight: '700',
  },
});

// ============================================================================
// EXPORT ALL
// ============================================================================

export default {
  ShieldIcon,
  ShieldLockIcon,
  HomeIcon,
  ProtectionIcon,
  AnalyticsIcon,
  FamilyIcon,
  SettingsIcon,
  SearchIcon,
  HistoryIcon,
  BlockIcon,
  AllowIcon,
  NetworkIcon,
  PrivacyIcon,
  SpeedIcon,
  LockIcon,
  UnlockIcon,
  MalwareIcon,
  AdIcon,
  PhishingIcon,
  TrackerIcon,
  TipIcon,
  BellIcon,
};
