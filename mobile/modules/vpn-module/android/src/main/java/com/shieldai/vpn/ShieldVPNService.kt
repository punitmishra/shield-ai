package com.shieldai.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetSocketAddress
import java.nio.ByteBuffer
import java.nio.channels.DatagramChannel

class ShieldVPNService : VpnService() {

    companion object {
        const val ACTION_CONNECT = "com.shieldai.vpn.CONNECT"
        const val ACTION_DISCONNECT = "com.shieldai.vpn.DISCONNECT"
        const val ACTION_UPDATE_DNS = "com.shieldai.vpn.UPDATE_DNS"

        private const val NOTIFICATION_CHANNEL_ID = "shield_vpn_channel"
        private const val NOTIFICATION_ID = 1337

        private const val VPN_ADDRESS = "10.8.0.2"
        private const val VPN_ROUTE = "0.0.0.0"
        private const val VPN_DNS_DEFAULT = "1.1.1.1"
    }

    private var vpnInterface: ParcelFileDescriptor? = null
    private var isRunning = false
    private var tunnelThread: Thread? = null

    private var bytesIn: Long = 0
    private var bytesOut: Long = 0
    private var connectedSince: Long = 0

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_CONNECT -> startVpn()
            ACTION_DISCONNECT -> stopVpn()
            ACTION_UPDATE_DNS -> updateDns()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }

    private fun startVpn() {
        if (isRunning) return

        updateStatus("connecting")

        try {
            val prefs = getSharedPreferences("shield_vpn", Context.MODE_PRIVATE)
            val dnsServers = prefs.getString("dnsServers", VPN_DNS_DEFAULT)?.split(",") ?: listOf(VPN_DNS_DEFAULT)
            val mtu = prefs.getInt("mtu", 1400)
            val splitTunnel = prefs.getBoolean("splitTunnel", true)

            val builder = Builder()
                .setSession("Shield AI DNS Protection")
                .setMtu(mtu)
                .addAddress(VPN_ADDRESS, 24)

            // Add DNS servers
            dnsServers.forEach { dns ->
                if (dns.isNotBlank()) {
                    builder.addDnsServer(dns.trim())
                }
            }

            // Route configuration
            if (splitTunnel) {
                // Only route DNS traffic - don't route all traffic
                // This is more efficient for DNS-only filtering
                dnsServers.forEach { dns ->
                    if (dns.isNotBlank()) {
                        builder.addRoute(dns.trim(), 32)
                    }
                }
            } else {
                // Route all traffic through VPN
                builder.addRoute(VPN_ROUTE, 0)
            }

            // Allow apps to bypass VPN (for split tunneling)
            builder.setBlocking(true)

            // Build the VPN interface
            vpnInterface = builder.establish()

            if (vpnInterface == null) {
                updateStatus("error")
                return
            }

            isRunning = true
            connectedSince = System.currentTimeMillis()
            bytesIn = 0
            bytesOut = 0

            // Start the tunnel thread
            tunnelThread = Thread { runTunnel() }
            tunnelThread?.start()

            // Start foreground service with notification
            startForeground(NOTIFICATION_ID, createNotification())

            updateStatus("connected")
            saveStats()

        } catch (e: Exception) {
            e.printStackTrace()
            updateStatus("error")
        }
    }

    private fun stopVpn() {
        isRunning = false
        tunnelThread?.interrupt()
        tunnelThread = null

        vpnInterface?.close()
        vpnInterface = null

        connectedSince = 0

        updateStatus("disconnected")
        saveStats()

        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun updateDns() {
        if (!isRunning) return

        // Need to restart VPN with new DNS settings
        stopVpn()
        startVpn()
    }

    private fun runTunnel() {
        val vpnFd = vpnInterface?.fileDescriptor ?: return
        val inputStream = FileInputStream(vpnFd)
        val outputStream = FileOutputStream(vpnFd)

        val buffer = ByteBuffer.allocate(32767)

        try {
            while (isRunning && !Thread.interrupted()) {
                // Read from TUN device
                buffer.clear()
                val length = inputStream.channel.read(buffer)

                if (length > 0) {
                    buffer.flip()
                    bytesIn += length

                    // Process DNS packets
                    // In a full implementation, this would:
                    // 1. Parse the IP packet
                    // 2. Extract DNS queries
                    // 3. Forward to Shield AI DNS server
                    // 4. Apply filtering rules
                    // 5. Return response or block

                    // For now, we just forward all traffic
                    // Real implementation would filter DNS here

                    bytesOut += length
                    outputStream.channel.write(buffer)

                    // Periodically save stats
                    if (bytesIn % 10000 == 0L) {
                        saveStats()
                        broadcastStats()
                    }
                }
            }
        } catch (e: InterruptedException) {
            // Thread was interrupted, exit gracefully
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun updateStatus(status: String) {
        val prefs = getSharedPreferences("shield_vpn", Context.MODE_PRIVATE)
        prefs.edit().putString("status", status).apply()

        val intent = Intent(ShieldVPNModule.ACTION_VPN_STATUS_CHANGED).apply {
            putExtra(ShieldVPNModule.EXTRA_STATUS, status)
        }
        sendBroadcast(intent)
    }

    private fun saveStats() {
        val prefs = getSharedPreferences("shield_vpn", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putLong("bytesIn", bytesIn)
            putLong("bytesOut", bytesOut)
            putLong("connectedSince", connectedSince)
            apply()
        }
    }

    private fun broadcastStats() {
        val intent = Intent(ShieldVPNModule.ACTION_VPN_STATS_UPDATED).apply {
            putExtra(ShieldVPNModule.EXTRA_BYTES_IN, bytesIn)
            putExtra(ShieldVPNModule.EXTRA_BYTES_OUT, bytesOut)
            putExtra(ShieldVPNModule.EXTRA_CONNECTED_SINCE, connectedSince)
        }
        sendBroadcast(intent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Shield AI VPN",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows when Shield AI DNS protection is active"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val pendingIntent = packageManager.getLaunchIntentForPackage(packageName)?.let {
            PendingIntent.getActivity(
                this, 0, it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("Shield AI Active")
            .setContentText("DNS protection is enabled")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }
}
