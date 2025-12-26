import NetworkExtension
import os.log

class PacketTunnelProvider: NEPacketTunnelProvider {

    private var dnsServers: [String] = ["1.1.1.1", "8.8.8.8"]
    private var mtu: Int = 1400
    private let logger = Logger(subsystem: "com.shieldai.app.PacketTunnel", category: "VPN")

    override func startTunnel(options: [String : NSObject]?, completionHandler: @escaping (Error?) -> Void) {
        logger.info("Starting Shield AI DNS tunnel")

        // Load configuration from protocolConfiguration
        if let config = (protocolConfiguration as? NETunnelProviderProtocol)?.providerConfiguration {
            if let servers = config["dnsServers"] as? [String], !servers.isEmpty {
                dnsServers = servers
            }
            if let configMTU = config["mtu"] as? Int {
                mtu = configMTU
            }
        }

        let tunnelNetworkSettings = createTunnelSettings()

        setTunnelNetworkSettings(tunnelNetworkSettings) { [weak self] error in
            if let error = error {
                self?.logger.error("Failed to set tunnel settings: \(error.localizedDescription)")
                completionHandler(error)
                return
            }

            self?.logger.info("Shield AI DNS tunnel started successfully")
            completionHandler(nil)
        }
    }

    override func stopTunnel(with reason: NEProviderStopReason, completionHandler: @escaping () -> Void) {
        logger.info("Stopping Shield AI DNS tunnel, reason: \(String(describing: reason))")
        completionHandler()
    }

    override func handleAppMessage(_ messageData: Data, completionHandler: ((Data?) -> Void)?) {
        // Handle messages from the main app (e.g., update DNS servers)
        if let message = try? JSONDecoder().decode(AppMessage.self, from: messageData) {
            switch message.type {
            case "updateDNS":
                if let servers = message.dnsServers {
                    dnsServers = servers
                    updateTunnelSettings()
                }
            case "getStats":
                let stats = getConnectionStats()
                let responseData = try? JSONEncoder().encode(stats)
                completionHandler?(responseData)
                return
            default:
                break
            }
        }
        completionHandler?(nil)
    }

    // MARK: - Tunnel Configuration

    private func createTunnelSettings() -> NEPacketTunnelNetworkSettings {
        // Use a private IP range for the tunnel
        let tunnelAddress = "10.8.0.2"
        let tunnelSubnet = "255.255.255.0"

        let settings = NEPacketTunnelNetworkSettings(tunnelRemoteAddress: "10.8.0.1")

        // IPv4 settings
        let ipv4Settings = NEIPv4Settings(addresses: [tunnelAddress], subnetMasks: [tunnelSubnet])

        // Only route DNS traffic through the tunnel (split tunneling)
        // This provides DNS filtering without routing all traffic
        ipv4Settings.includedRoutes = []
        ipv4Settings.excludedRoutes = [NEIPv4Route.default()]

        settings.ipv4Settings = ipv4Settings

        // DNS settings - this is the key part for DNS filtering
        let dnsSettings = NEDNSSettings(servers: dnsServers)
        dnsSettings.matchDomains = [""] // Match all domains
        dnsSettings.matchDomainsNoSearch = true
        settings.dnsSettings = dnsSettings

        // MTU
        settings.mtu = NSNumber(value: mtu)

        return settings
    }

    private func updateTunnelSettings() {
        let settings = createTunnelSettings()
        setTunnelNetworkSettings(settings) { [weak self] error in
            if let error = error {
                self?.logger.error("Failed to update tunnel settings: \(error.localizedDescription)")
            }
        }
    }

    private func getConnectionStats() -> ConnectionStats {
        return ConnectionStats(
            bytesIn: 0,  // Would be tracked from packet flow
            bytesOut: 0,
            connectedSince: Date(),
            queriesBlocked: 0
        )
    }
}

// MARK: - Models

struct AppMessage: Codable {
    let type: String
    let dnsServers: [String]?
}

struct ConnectionStats: Codable {
    let bytesIn: Int64
    let bytesOut: Int64
    let connectedSince: Date
    let queriesBlocked: Int
}
