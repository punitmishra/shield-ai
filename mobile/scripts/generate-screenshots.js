/**
 * Shield AI Screenshot Configuration
 *
 * This script defines the screenshot requirements and scenes for app store submission.
 * Use with Maestro or Detox for automated screenshot capture.
 */

const screenshots = {
  // iOS Screenshot Sizes (Required)
  ios: {
    sizes: [
      { name: 'iPhone 6.7"', width: 1290, height: 2796, devices: ['iPhone 15 Pro Max', 'iPhone 14 Pro Max'] },
      { name: 'iPhone 6.5"', width: 1284, height: 2778, devices: ['iPhone 14 Plus', 'iPhone 13 Pro Max'] },
      { name: 'iPhone 5.5"', width: 1242, height: 2208, devices: ['iPhone 8 Plus'] },
      { name: 'iPad 12.9"', width: 2048, height: 2732, devices: ['iPad Pro 12.9"'] },
    ],
  },

  // Android Screenshot Sizes (Required)
  android: {
    sizes: [
      { name: 'Phone', width: 1080, height: 1920, devices: ['Pixel 7'] },
      { name: '7" Tablet', width: 1200, height: 1920, devices: ['Nexus 7'] },
      { name: '10" Tablet', width: 1800, height: 2560, devices: ['Pixel Tablet'] },
    ],
  },

  // Screenshot Scenes (5-10 recommended)
  scenes: [
    {
      id: 1,
      name: 'protection-active',
      title: 'Real-Time Protection',
      subtitle: 'Stay protected 24/7',
      screen: 'HomeScreen',
      state: { isProtected: true },
      actions: [],
      caption: 'AI-powered protection keeps you safe from malware, phishing, and trackers',
    },
    {
      id: 2,
      name: 'threat-blocked',
      title: 'Threats Blocked',
      subtitle: 'See what we stopped',
      screen: 'HomeScreen',
      state: { showBlockedThreat: true },
      actions: [],
      caption: 'Get notified when Shield AI blocks dangerous content',
    },
    {
      id: 3,
      name: 'analytics-dashboard',
      title: 'Detailed Analytics',
      subtitle: 'Track your protection',
      screen: 'AnalyticsScreen',
      state: { timeRange: '7d' },
      actions: ['tap:7d-filter'],
      caption: 'See exactly what\'s being blocked with detailed charts and stats',
    },
    {
      id: 4,
      name: 'query-log',
      title: 'Query History',
      subtitle: 'Full transparency',
      screen: 'AnalyticsScreen',
      state: { filter: 'blocked' },
      actions: ['scroll:down', 'tap:blocked-filter'],
      caption: 'Browse your complete DNS query history with search and filters',
    },
    {
      id: 5,
      name: 'family-profiles',
      title: 'Family Profiles',
      subtitle: 'Protect everyone',
      screen: 'FamilyScreen',
      state: { profiles: 3 },
      actions: [],
      caption: 'Create custom protection profiles for each family member',
    },
    {
      id: 6,
      name: 'parental-controls',
      title: 'Parental Controls',
      subtitle: 'Keep kids safe',
      screen: 'FamilyScreen',
      state: { showEditor: true, profileType: 'child' },
      actions: ['tap:profile-card'],
      caption: 'Set content filters, screen time limits, and bedtime schedules',
    },
    {
      id: 7,
      name: 'vpn-connected',
      title: 'VPN Protection',
      subtitle: 'Encrypt everything',
      screen: 'ProtectionScreen',
      state: { vpnConnected: true },
      actions: ['tap:vpn-toggle'],
      caption: 'Encrypt all your traffic with our high-speed VPN servers',
    },
    {
      id: 8,
      name: 'dns-settings',
      title: 'DNS Settings',
      subtitle: 'Customize protection',
      screen: 'ProtectionScreen',
      state: {},
      actions: ['scroll:down'],
      caption: 'Toggle malware, ad, tracker, and phishing protection with one tap',
    },
  ],

  // Frame/Device mockup settings
  framing: {
    deviceFrame: true,
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    accentColor: '#3b82f6',
    fontFamily: 'SF Pro Display',
    showStatusBar: true,
    showCaption: true,
  },

  // Export settings
  export: {
    format: 'png',
    quality: 100,
    outputDir: './assets/store/screenshots',
  },
};

// Maestro Flow Template
const maestroFlow = `
appId: com.shieldai.app
---
# Screenshot Flow for Shield AI

- launchApp

# Scene 1: Protection Active
- assertVisible: "Protection Active"
- takeScreenshot: screenshots/01-protection-active

# Scene 2: Analytics
- tapOn: "Analytics"
- waitForAnimationEnd
- takeScreenshot: screenshots/03-analytics-dashboard

# Scene 3: Query Log
- tapOn: "Blocked"
- scroll:
    direction: DOWN
    distance: 200
- takeScreenshot: screenshots/04-query-log

# Scene 4: Family
- tapOn: "Family"
- waitForAnimationEnd
- takeScreenshot: screenshots/05-family-profiles

# Scene 5: Profile Editor
- tapOn:
    id: "profile-card-0"
- waitForAnimationEnd
- takeScreenshot: screenshots/06-parental-controls

# Scene 6: Protection Settings
- tapOn: "Protection"
- waitForAnimationEnd
- takeScreenshot: screenshots/07-dns-settings
`;

// Output configuration
console.log('Screenshot Configuration:');
console.log('========================');
console.log(`iOS Sizes: ${screenshots.ios.sizes.length}`);
console.log(`Android Sizes: ${screenshots.android.sizes.length}`);
console.log(`Scenes: ${screenshots.scenes.length}`);
console.log(`\nTotal screenshots needed:`);
console.log(`  iOS: ${screenshots.ios.sizes.length * screenshots.scenes.length}`);
console.log(`  Android: ${screenshots.android.sizes.length * screenshots.scenes.length}`);

// Export for use in automation
module.exports = { screenshots, maestroFlow };
