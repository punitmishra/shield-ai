/**
 * Premium Shield AI Icon Components
 * SVG-based icons for elite UI experience
 */

import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  gradient?: boolean;
}

// Main Shield AI Logo
export function ShieldAILogo({ size = 48, gradient = true }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Defs>
        <LinearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#3b82f6" />
          <Stop offset="50%" stopColor="#8b5cf6" />
          <Stop offset="100%" stopColor="#22c55e" />
        </LinearGradient>
        <LinearGradient id="glowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {/* Outer glow */}
      <Circle cx="24" cy="24" r="22" fill="url(#glowGrad)" />
      {/* Shield shape */}
      <Path
        d="M24 4L6 12v12c0 11.05 7.68 21.38 18 24 10.32-2.62 18-12.95 18-24V12L24 4z"
        fill={gradient ? "url(#shieldGrad)" : "#3b82f6"}
        opacity="0.9"
      />
      {/* Inner shield */}
      <Path
        d="M24 8L10 14v10c0 8.84 5.97 17.1 14 19.2 8.03-2.1 14-10.36 14-19.2V14L24 8z"
        fill="#0f172a"
        opacity="0.8"
      />
      {/* AI neural nodes */}
      <Circle cx="24" cy="20" r="3" fill="#3b82f6" />
      <Circle cx="18" cy="28" r="2" fill="#8b5cf6" />
      <Circle cx="30" cy="28" r="2" fill="#22c55e" />
      <Circle cx="24" cy="34" r="2" fill="#3b82f6" />
      {/* Neural connections */}
      <Path d="M24 20L18 28M24 20L30 28M18 28L24 34M30 28L24 34" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.6" />
    </Svg>
  );
}

// VPN Connected Icon
export function VPNConnectedIcon({ size = 32, color = "#22c55e" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Defs>
        <LinearGradient id="vpnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#22c55e" />
          <Stop offset="100%" stopColor="#16a34a" />
        </LinearGradient>
      </Defs>
      <Circle cx="16" cy="16" r="14" fill="url(#vpnGrad)" opacity="0.15" />
      <Circle cx="16" cy="16" r="10" fill="url(#vpnGrad)" opacity="0.3" />
      <Path
        d="M16 6L8 10v6c0 5.52 3.42 10.69 8 12 4.58-1.31 8-6.48 8-12v-6l-8-4z"
        fill={color}
      />
      <Path
        d="M13 16l2 2 4-4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// VPN Disconnected Icon
export function VPNDisconnectedIcon({ size = 32, color = "#ef4444" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Defs>
        <LinearGradient id="vpnOffGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#ef4444" />
          <Stop offset="100%" stopColor="#dc2626" />
        </LinearGradient>
      </Defs>
      <Circle cx="16" cy="16" r="14" fill="url(#vpnOffGrad)" opacity="0.15" />
      <Path
        d="M16 6L8 10v6c0 5.52 3.42 10.69 8 12 4.58-1.31 8-6.48 8-12v-6l-8-4z"
        fill={color}
        opacity="0.5"
      />
      <Path
        d="M12 12l8 8M20 12l-8 8"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Analytics Icon
export function AnalyticsIcon({ size = 24, color = "#3b82f6" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20h16M4 20V4m0 16l4-4v4m4 0V10m0 10l4-6v6m4 0V6l-4 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Privacy Score Icon
export function PrivacyScoreIcon({ size = 24, color = "#8b5cf6" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id="privacyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#8b5cf6" />
          <Stop offset="100%" stopColor="#3b82f6" />
        </LinearGradient>
      </Defs>
      <Circle cx="12" cy="12" r="10" stroke="url(#privacyGrad)" strokeWidth="2" opacity="0.3" />
      <Path
        d="M12 2a10 10 0 0 1 0 20"
        stroke="url(#privacyGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Circle cx="12" cy="12" r="4" fill={color} />
    </Svg>
  );
}

// Threat Blocked Icon
export function ThreatBlockedIcon({ size = 24, color = "#ef4444" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// Settings Gear Icon
export function SettingsIcon({ size = 24, color = "#64748b" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  );
}

// Family/Users Icon
export function FamilyIcon({ size = 24, color = "#f59e0b" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" />
      <Path d="M5.5 21a6.5 6.5 0 0113 0" stroke={color} strokeWidth="2" />
      <Circle cx="19" cy="11" r="2.5" stroke={color} strokeWidth="1.5" opacity="0.6" />
      <Circle cx="5" cy="11" r="2.5" stroke={color} strokeWidth="1.5" opacity="0.6" />
    </Svg>
  );
}

// Search/Analyze Icon
export function SearchIcon({ size = 24, color = "#06b6d4" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" />
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// History Icon
export function HistoryIcon({ size = 24, color = "#10b981" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Path d="M12 6v6l4 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
