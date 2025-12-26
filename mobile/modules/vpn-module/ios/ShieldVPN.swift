import Foundation
import NetworkExtension
import React

@objc(ShieldVPN)
class ShieldVPN: RCTEventEmitter {

    private var vpnManager: NEVPNManager?
    private var statusObserver: NSObjectProtocol?
    private var statsTimer: Timer?
    private var hasListeners = false

    override init() {
        super.init()
        setupVPNManager()
    }

    deinit {
        if let observer = statusObserver {
            NotificationCenter.default.removeObserver(observer)
        }
        statsTimer?.invalidate()
    }

    // MARK: - RCTEventEmitter

    override static func moduleName() -> String! {
        return "ShieldVPN"
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func supportedEvents() -> [String]! {
        return ["onVPNStatusChanged", "onVPNStatsUpdated"]
    }

    override func startObserving() {
        hasListeners = true
        startStatsTimer()
    }

    override func stopObserving() {
        hasListeners = false
        statsTimer?.invalidate()
        statsTimer = nil
    }

    // MARK: - Setup

    private func setupVPNManager() {
        vpnManager = NEVPNManager.shared()

        statusObserver = NotificationCenter.default.addObserver(
            forName: .NEVPNStatusDidChange,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.sendStatusUpdate()
        }

        vpnManager?.loadFromPreferences { [weak self] error in
            if let error = error {
                print("ShieldVPN: Failed to load preferences: \(error)")
            }
            self?.sendStatusUpdate()
        }
    }

    private func startStatsTimer() {
        statsTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.sendStatsUpdate()
        }
    }

    // MARK: - Event Sending

    private func sendStatusUpdate() {
        guard hasListeners else { return }
        let status = mapVPNStatus(vpnManager?.connection.status ?? .invalid)
        sendEvent(withName: "onVPNStatusChanged", body: status)
    }

    private func sendStatsUpdate() {
        guard hasListeners else { return }

        let stats: [String: Any] = [
            "bytesIn": getBytesIn(),
            "bytesOut": getBytesOut(),
            "connectedSince": getConnectedSince() ?? NSNull(),
            "serverLatency": getServerLatency()
        ]

        sendEvent(withName: "onVPNStatsUpdated", body: stats)
    }

    private func mapVPNStatus(_ status: NEVPNStatus) -> String {
        switch status {
        case .invalid, .disconnected:
            return "disconnected"
        case .connecting, .reasserting:
            return "connecting"
        case .connected:
            return "connected"
        case .disconnecting:
            return "disconnecting"
        @unknown default:
            return "disconnected"
        }
    }

    // MARK: - Stats Helpers (placeholder values - real implementation needs packet tunnel provider)

    private func getBytesIn() -> Int64 {
        // In a real implementation, this would come from the packet tunnel provider
        return 0
    }

    private func getBytesOut() -> Int64 {
        return 0
    }

    private func getConnectedSince() -> Double? {
        guard let connection = vpnManager?.connection,
              connection.status == .connected,
              let connectedDate = connection.connectedDate else {
            return nil
        }
        return connectedDate.timeIntervalSince1970 * 1000
    }

    private func getServerLatency() -> Double {
        // Placeholder - real implementation would ping the server
        return 25.0
    }

    // MARK: - Exported Methods

    @objc
    func isSupported(_ resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
        // VPN is supported on iOS 8+
        resolve(true)
    }

    @objc
    func requestPermission(_ resolve: @escaping RCTPromiseResolveBlock,
                           reject: @escaping RCTPromiseRejectBlock) {
        vpnManager?.loadFromPreferences { [weak self] error in
            if let error = error {
                reject("PERMISSION_ERROR", "Failed to request VPN permission", error)
                return
            }

            self?.vpnManager?.saveToPreferences { error in
                if let error = error {
                    reject("PERMISSION_ERROR", "Failed to save VPN preferences", error)
                    return
                }
                resolve(true)
            }
        }
    }

    @objc
    func hasPermission(_ resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {
        vpnManager?.loadFromPreferences { [weak self] error in
            if let error = error {
                reject("PERMISSION_ERROR", "Failed to check VPN permission", error)
                return
            }

            let hasConfig = self?.vpnManager?.protocolConfiguration != nil
            resolve(hasConfig)
        }
    }

    @objc
    func configure(_ config: NSDictionary,
                   resolve: @escaping RCTPromiseResolveBlock,
                   reject: @escaping RCTPromiseRejectBlock) {
        guard let serverAddress = config["serverAddress"] as? String,
              let dnsServers = config["dnsServers"] as? [String] else {
            reject("CONFIG_ERROR", "Invalid configuration: missing serverAddress or dnsServers", nil)
            return
        }

        vpnManager?.loadFromPreferences { [weak self] error in
            if let error = error {
                reject("CONFIG_ERROR", "Failed to load VPN preferences", error)
                return
            }

            guard let manager = self?.vpnManager else {
                reject("CONFIG_ERROR", "VPN manager not available", nil)
                return
            }

            // Configure NEPacketTunnelProtocol for DNS filtering
            let tunnelProtocol = NETunnelProviderProtocol()
            tunnelProtocol.providerBundleIdentifier = "com.shieldai.app.PacketTunnel"
            tunnelProtocol.serverAddress = serverAddress

            var providerConfig: [String: Any] = [
                "dnsServers": dnsServers
            ]

            if let mtu = config["mtu"] as? Int {
                providerConfig["mtu"] = mtu
            }

            if let splitTunnel = config["splitTunnel"] as? Bool {
                providerConfig["splitTunnel"] = splitTunnel
            }

            tunnelProtocol.providerConfiguration = providerConfig

            manager.protocolConfiguration = tunnelProtocol
            manager.localizedDescription = "Shield AI DNS Protection"
            manager.isEnabled = true

            manager.saveToPreferences { error in
                if let error = error {
                    reject("CONFIG_ERROR", "Failed to save VPN configuration", error)
                    return
                }
                resolve(true)
            }
        }
    }

    @objc
    func connect(_ resolve: @escaping RCTPromiseResolveBlock,
                 reject: @escaping RCTPromiseRejectBlock) {
        vpnManager?.loadFromPreferences { [weak self] error in
            if let error = error {
                reject("CONNECT_ERROR", "Failed to load VPN preferences", error)
                return
            }

            do {
                try self?.vpnManager?.connection.startVPNTunnel()
                resolve(true)
            } catch {
                reject("CONNECT_ERROR", "Failed to start VPN tunnel", error)
            }
        }
    }

    @objc
    func disconnect(_ resolve: @escaping RCTPromiseResolveBlock,
                    reject: @escaping RCTPromiseRejectBlock) {
        vpnManager?.connection.stopVPNTunnel()
        resolve(true)
    }

    @objc
    func getStatus(_ resolve: @escaping RCTPromiseResolveBlock,
                   reject: @escaping RCTPromiseRejectBlock) {
        let status = mapVPNStatus(vpnManager?.connection.status ?? .invalid)
        resolve(status)
    }

    @objc
    func getStats(_ resolve: @escaping RCTPromiseResolveBlock,
                  reject: @escaping RCTPromiseRejectBlock) {
        let stats: [String: Any] = [
            "bytesIn": getBytesIn(),
            "bytesOut": getBytesOut(),
            "connectedSince": getConnectedSince() ?? NSNull(),
            "serverLatency": getServerLatency()
        ]
        resolve(stats)
    }

    @objc
    func setDNSServers(_ servers: [String],
                       resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {
        // Update DNS servers in the existing configuration
        vpnManager?.loadFromPreferences { [weak self] error in
            if let error = error {
                reject("DNS_ERROR", "Failed to load VPN preferences", error)
                return
            }

            if let tunnelProtocol = self?.vpnManager?.protocolConfiguration as? NETunnelProviderProtocol {
                var config = tunnelProtocol.providerConfiguration ?? [:]
                config["dnsServers"] = servers
                tunnelProtocol.providerConfiguration = config

                self?.vpnManager?.saveToPreferences { error in
                    if let error = error {
                        reject("DNS_ERROR", "Failed to save DNS configuration", error)
                        return
                    }
                    resolve(true)
                }
            } else {
                reject("DNS_ERROR", "No VPN configuration found", nil)
            }
        }
    }
}
