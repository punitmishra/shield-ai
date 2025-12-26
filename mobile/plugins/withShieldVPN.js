/**
 * Expo Config Plugin for Shield AI VPN
 * Configures iOS Network Extension and Android VPN Service
 */

const { withInfoPlist, withEntitlementsPlist, withAndroidManifest, withAppBuildGradle } = require('@expo/config-plugins');

function withShieldVPNiOS(config) {
  // Add Network Extension entitlements
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.networking.networkextension'] = [
      'packet-tunnel-provider',
      'dns-settings',
    ];
    config.modResults['com.apple.developer.networking.vpn.api'] = ['allow-vpn'];
    config.modResults['keychain-access-groups'] = [
      '$(AppIdentifierPrefix)com.shieldai.app',
      '$(AppIdentifierPrefix)com.shieldai.app.PacketTunnel',
    ];
    return config;
  });

  // Add VPN usage description
  config = withInfoPlist(config, (config) => {
    config.modResults['NSVPNUsageDescription'] =
      'Shield AI uses a local VPN to filter DNS requests and protect your device from malware, trackers, and malicious domains.';
    config.modResults['UIBackgroundModes'] = [
      ...(config.modResults['UIBackgroundModes'] || []),
      'network-authentication',
    ];
    return config;
  });

  return config;
}

function withShieldVPNAndroid(config) {
  // Add VPN permissions to AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Add VPN permission
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const permissions = [
      'android.permission.INTERNET',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
    ];

    permissions.forEach((permission) => {
      const exists = manifest['uses-permission'].some(
        (p) => p.$?.['android:name'] === permission
      );
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    return config;
  });

  // Add Kotlin dependency to build.gradle
  config = withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('kotlin-android')) {
      config.modResults.contents = config.modResults.contents.replace(
        /apply plugin: "com.android.application"/,
        `apply plugin: "com.android.application"
apply plugin: "kotlin-android"`
      );
    }
    return config;
  });

  return config;
}

module.exports = function withShieldVPN(config) {
  config = withShieldVPNiOS(config);
  config = withShieldVPNAndroid(config);
  return config;
};
