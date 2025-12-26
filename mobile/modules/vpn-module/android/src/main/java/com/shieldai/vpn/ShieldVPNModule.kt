package com.shieldai.vpn

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.VpnService
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class ShieldVPNModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext),
    ActivityEventListener {

    companion object {
        const val NAME = "ShieldVPN"
        const val VPN_REQUEST_CODE = 24601
        const val ACTION_VPN_STATUS_CHANGED = "com.shieldai.vpn.STATUS_CHANGED"
        const val ACTION_VPN_STATS_UPDATED = "com.shieldai.vpn.STATS_UPDATED"
        const val EXTRA_STATUS = "status"
        const val EXTRA_BYTES_IN = "bytesIn"
        const val EXTRA_BYTES_OUT = "bytesOut"
        const val EXTRA_CONNECTED_SINCE = "connectedSince"
    }

    private var pendingPermissionPromise: Promise? = null
    private var vpnConfig: ReadableMap? = null

    private val statusReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                ACTION_VPN_STATUS_CHANGED -> {
                    val status = intent.getStringExtra(EXTRA_STATUS) ?: "disconnected"
                    sendEvent("onVPNStatusChanged", status)
                }
                ACTION_VPN_STATS_UPDATED -> {
                    val stats = Arguments.createMap().apply {
                        putDouble("bytesIn", intent.getLongExtra(EXTRA_BYTES_IN, 0).toDouble())
                        putDouble("bytesOut", intent.getLongExtra(EXTRA_BYTES_OUT, 0).toDouble())
                        val connectedSince = intent.getLongExtra(EXTRA_CONNECTED_SINCE, 0)
                        if (connectedSince > 0) {
                            putDouble("connectedSince", connectedSince.toDouble())
                        } else {
                            putNull("connectedSince")
                        }
                        putDouble("serverLatency", 25.0) // Placeholder
                    }
                    sendEvent("onVPNStatsUpdated", stats)
                }
            }
        }
    }

    init {
        reactContext.addActivityEventListener(this)

        val filter = IntentFilter().apply {
            addAction(ACTION_VPN_STATUS_CHANGED)
            addAction(ACTION_VPN_STATS_UPDATED)
        }
        reactContext.registerReceiver(statusReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    }

    override fun getName(): String = NAME

    override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == VPN_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK) {
                pendingPermissionPromise?.resolve(true)
                // Start VPN service after permission granted
                vpnConfig?.let { startVpnService(it) }
            } else {
                pendingPermissionPromise?.reject("PERMISSION_DENIED", "VPN permission denied")
            }
            pendingPermissionPromise = null
        }
    }

    override fun onNewIntent(intent: Intent?) {}

    private fun sendEvent(eventName: String, params: Any) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun isSupported(promise: Promise) {
        // VPN is supported on Android 4.0+ (API 14+)
        promise.resolve(true)
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }

        val intent = VpnService.prepare(activity)
        if (intent != null) {
            pendingPermissionPromise = promise
            activity.startActivityForResult(intent, VPN_REQUEST_CODE)
        } else {
            // Permission already granted
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun hasPermission(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }

        val intent = VpnService.prepare(activity)
        promise.resolve(intent == null) // null means permission granted
    }

    @ReactMethod
    fun configure(config: ReadableMap, promise: Promise) {
        vpnConfig = config

        // Store configuration for the VPN service
        val prefs = reactApplicationContext.getSharedPreferences("shield_vpn", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("serverAddress", config.getString("serverAddress"))

            val dnsServers = config.getArray("dnsServers")
            val dnsString = (0 until (dnsServers?.size() ?: 0))
                .mapNotNull { dnsServers?.getString(it) }
                .joinToString(",")
            putString("dnsServers", dnsString)

            if (config.hasKey("mtu")) {
                putInt("mtu", config.getInt("mtu"))
            }
            if (config.hasKey("splitTunnel")) {
                putBoolean("splitTunnel", config.getBoolean("splitTunnel"))
            }
            apply()
        }

        promise.resolve(true)
    }

    @ReactMethod
    fun connect(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }

        val vpnIntent = VpnService.prepare(activity)
        if (vpnIntent != null) {
            pendingPermissionPromise = promise
            activity.startActivityForResult(vpnIntent, VPN_REQUEST_CODE)
        } else {
            vpnConfig?.let { startVpnService(it) }
            promise.resolve(true)
        }
    }

    private fun startVpnService(config: ReadableMap) {
        val intent = Intent(reactApplicationContext, ShieldVPNService::class.java).apply {
            action = ShieldVPNService.ACTION_CONNECT
        }
        reactApplicationContext.startService(intent)
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        val intent = Intent(reactApplicationContext, ShieldVPNService::class.java).apply {
            action = ShieldVPNService.ACTION_DISCONNECT
        }
        reactApplicationContext.startService(intent)
        promise.resolve(true)
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        val prefs = reactApplicationContext.getSharedPreferences("shield_vpn", Context.MODE_PRIVATE)
        val status = prefs.getString("status", "disconnected")
        promise.resolve(status)
    }

    @ReactMethod
    fun getStats(promise: Promise) {
        val prefs = reactApplicationContext.getSharedPreferences("shield_vpn", Context.MODE_PRIVATE)

        val stats = Arguments.createMap().apply {
            putDouble("bytesIn", prefs.getLong("bytesIn", 0).toDouble())
            putDouble("bytesOut", prefs.getLong("bytesOut", 0).toDouble())
            val connectedSince = prefs.getLong("connectedSince", 0)
            if (connectedSince > 0) {
                putDouble("connectedSince", connectedSince.toDouble())
            } else {
                putNull("connectedSince")
            }
            putDouble("serverLatency", 25.0)
        }

        promise.resolve(stats)
    }

    @ReactMethod
    fun setDNSServers(servers: ReadableArray, promise: Promise) {
        val prefs = reactApplicationContext.getSharedPreferences("shield_vpn", Context.MODE_PRIVATE)
        val dnsString = (0 until servers.size())
            .mapNotNull { servers.getString(it) }
            .joinToString(",")

        prefs.edit().putString("dnsServers", dnsString).apply()

        // If VPN is running, restart it with new DNS servers
        val currentStatus = prefs.getString("status", "disconnected")
        if (currentStatus == "connected") {
            val intent = Intent(reactApplicationContext, ShieldVPNService::class.java).apply {
                action = ShieldVPNService.ACTION_UPDATE_DNS
            }
            reactApplicationContext.startService(intent)
        }

        promise.resolve(true)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for RN event emitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for RN event emitter
    }
}
