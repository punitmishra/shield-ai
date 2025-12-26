/**
 * Shield AI VPN Module
 * React Native bridge for iOS NetworkExtension and Android VpnService
 */

import { NativeModules, Platform, NativeEventEmitter } from 'react-native';

const { ShieldVPN } = NativeModules;

export type VPNStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

export interface VPNConfig {
  serverAddress: string;
  dnsServers: string[];
  mtu?: number;
  excludedApps?: string[];
  splitTunnel?: boolean;
}

export interface VPNStats {
  bytesIn: number;
  bytesOut: number;
  connectedSince: number | null;
  serverLatency: number;
}

export interface VPNError {
  code: string;
  message: string;
}

class ShieldVPNModule {
  private eventEmitter: NativeEventEmitter | null = null;
  private statusListeners: ((status: VPNStatus) => void)[] = [];
  private statsListeners: ((stats: VPNStats) => void)[] = [];

  constructor() {
    if (ShieldVPN) {
      this.eventEmitter = new NativeEventEmitter(ShieldVPN);
      this.setupListeners();
    }
  }

  private setupListeners() {
    if (!this.eventEmitter) return;

    this.eventEmitter.addListener('onVPNStatusChanged', (status: VPNStatus) => {
      this.statusListeners.forEach(listener => listener(status));
    });

    this.eventEmitter.addListener('onVPNStatsUpdated', (stats: VPNStats) => {
      this.statsListeners.forEach(listener => listener(stats));
    });
  }

  /**
   * Check if VPN is supported on this device
   */
  async isSupported(): Promise<boolean> {
    if (!ShieldVPN) return false;
    try {
      return await ShieldVPN.isSupported();
    } catch {
      return false;
    }
  }

  /**
   * Request VPN permission from the user
   */
  async requestPermission(): Promise<boolean> {
    if (!ShieldVPN) return false;
    try {
      return await ShieldVPN.requestPermission();
    } catch {
      return false;
    }
  }

  /**
   * Check if VPN permission is granted
   */
  async hasPermission(): Promise<boolean> {
    if (!ShieldVPN) return false;
    try {
      return await ShieldVPN.hasPermission();
    } catch {
      return false;
    }
  }

  /**
   * Configure the VPN tunnel
   */
  async configure(config: VPNConfig): Promise<void> {
    if (!ShieldVPN) throw new Error('VPN module not available');
    await ShieldVPN.configure(config);
  }

  /**
   * Connect to the VPN
   */
  async connect(): Promise<void> {
    if (!ShieldVPN) throw new Error('VPN module not available');
    await ShieldVPN.connect();
  }

  /**
   * Disconnect from the VPN
   */
  async disconnect(): Promise<void> {
    if (!ShieldVPN) throw new Error('VPN module not available');
    await ShieldVPN.disconnect();
  }

  /**
   * Get current VPN status
   */
  async getStatus(): Promise<VPNStatus> {
    if (!ShieldVPN) return 'disconnected';
    try {
      return await ShieldVPN.getStatus();
    } catch {
      return 'disconnected';
    }
  }

  /**
   * Get VPN connection statistics
   */
  async getStats(): Promise<VPNStats> {
    if (!ShieldVPN) {
      return {
        bytesIn: 0,
        bytesOut: 0,
        connectedSince: null,
        serverLatency: 0,
      };
    }
    return await ShieldVPN.getStats();
  }

  /**
   * Add listener for VPN status changes
   */
  addStatusListener(callback: (status: VPNStatus) => void): () => void {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== callback);
    };
  }

  /**
   * Add listener for VPN stats updates
   */
  addStatsListener(callback: (stats: VPNStats) => void): () => void {
    this.statsListeners.push(callback);
    return () => {
      this.statsListeners = this.statsListeners.filter(l => l !== callback);
    };
  }

  /**
   * Set custom DNS servers (for DNS-only mode without full VPN)
   */
  async setDNSServers(servers: string[]): Promise<void> {
    if (!ShieldVPN) throw new Error('VPN module not available');
    await ShieldVPN.setDNSServers(servers);
  }

  /**
   * Get platform-specific info
   */
  getPlatformInfo(): { platform: string; supportsPacketTunnel: boolean } {
    return {
      platform: Platform.OS,
      supportsPacketTunnel: Platform.OS === 'ios' || Platform.OS === 'android',
    };
  }
}

export const VPN = new ShieldVPNModule();
export default VPN;
