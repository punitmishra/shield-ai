import { useState, useEffect } from 'react'
import { Laptop, Smartphone, Tv, Watch, Server, Wifi, Activity, Settings, Shield, Ban } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Device {
  id: string
  name: string
  ip_address: string
  mac_address?: string
  type: 'laptop' | 'phone' | 'tablet' | 'tv' | 'iot' | 'other'
  last_seen: number
  query_count: number
  blocked_count: number
  profile?: string
  online: boolean
}

interface DeviceManagerProps {
  className?: string
}

export default function DeviceManager({ className = '' }: DeviceManagerProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingDevice, setEditingDevice] = useState<string | null>(null)
  const [deviceName, setDeviceName] = useState('')
  const [deviceProfile, setDeviceProfile] = useState('')

  const profiles = ['Default', 'Kids', 'Work', 'Gaming', 'IoT']

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE}/api/devices`)
        if (response.ok) {
          const data = await response.json()
          setDevices(data.devices || [])
        } else {
          setDevices(generateSampleDevices())
        }
      } catch {
        setDevices(generateSampleDevices())
      } finally {
        setLoading(false)
      }
    }

    fetchDevices()
    const interval = setInterval(fetchDevices, 15000)
    return () => clearInterval(interval)
  }, [])

  const generateSampleDevices = (): Device[] => {
    const now = Date.now() / 1000
    return [
      {
        id: '1',
        name: 'MacBook Pro',
        ip_address: '192.168.1.100',
        mac_address: '00:1B:44:11:3A:B7',
        type: 'laptop',
        last_seen: now - 30,
        query_count: 1234,
        blocked_count: 45,
        profile: 'Work',
        online: true
      },
      {
        id: '2',
        name: 'iPhone 14',
        ip_address: '192.168.1.101',
        mac_address: '00:1B:44:11:3A:B8',
        type: 'phone',
        last_seen: now - 60,
        query_count: 856,
        blocked_count: 123,
        profile: 'Default',
        online: true
      },
      {
        id: '3',
        name: 'Smart TV',
        ip_address: '192.168.1.102',
        type: 'tv',
        last_seen: now - 3600,
        query_count: 432,
        blocked_count: 89,
        profile: 'IoT',
        online: false
      }
    ]
  }

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'laptop': return <Laptop className="w-6 h-6" />
      case 'phone': return <Smartphone className="w-6 h-6" />
      case 'tablet': return <Smartphone className="w-6 h-6" />
      case 'tv': return <Tv className="w-6 h-6" />
      case 'iot': return <Watch className="w-6 h-6" />
      default: return <Server className="w-6 h-6" />
    }
  }

  const formatLastSeen = (timestamp: number) => {
    const now = Date.now() / 1000
    const diff = now - timestamp
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const handleUpdateDevice = async (deviceId: string) => {
    try {
      await fetch(`${API_BASE}/api/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deviceName, profile: deviceProfile })
      })
      setDevices(devices.map(d =>
        d.id === deviceId ? { ...d, name: deviceName, profile: deviceProfile } : d
      ))
      setEditingDevice(null)
    } catch {
      // Ignore errors
    }
  }

  const startEdit = (device: Device) => {
    setEditingDevice(device.id)
    setDeviceName(device.name)
    setDeviceProfile(device.profile || 'Default')
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-12 ${className}`}>
        <div className="flex items-center justify-center">
          <Wifi className="w-8 h-8 text-blue-500 animate-pulse" />
          <span className="ml-3 text-gray-600">Loading devices...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Wifi className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Device Manager</h2>
              <p className="text-sm text-gray-500">{devices.length} devices detected</p>
            </div>
          </div>
          <span className="text-sm text-gray-600">{devices.filter(d => d.online).length} online</span>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(device => (
            <div
              key={device.id}
              className={`border rounded-lg p-4 hover:shadow-md cursor-pointer ${
                selectedDevice?.id === device.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setSelectedDevice(device)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-lg ${device.online ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {getDeviceIcon(device.type)}
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  device.online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${device.online ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {device.online ? 'Online' : 'Offline'}
                </span>
              </div>

              {editingDevice === device.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    placeholder="Device name"
                  />
                  <select
                    value={deviceProfile}
                    onChange={(e) => setDeviceProfile(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    {profiles.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdateDevice(device.id)}
                      className="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingDevice(null)}
                      className="flex-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-gray-900 mb-1">{device.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">{device.ip_address}</p>

                  <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                    <span>Queries: {device.query_count}</span>
                    <span className="text-red-600">Blocked: {device.blocked_count}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{formatLastSeen(device.last_seen)}</span>
                    {device.profile && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{device.profile}</span>
                    )}
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(device) }}
                    className="mt-3 w-full flex items-center justify-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs"
                  >
                    <Settings className="w-3 h-3 mr-1.5" />
                    Configure
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {devices.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Wifi className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No devices found</p>
            <p className="text-sm mt-2">Devices will appear as they make DNS queries</p>
          </div>
        )}
      </div>

      {selectedDevice && (
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Device Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center space-x-2 mb-1">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-500">Total Queries</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{selectedDevice.query_count}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center space-x-2 mb-1">
                <Ban className="w-4 h-4 text-red-500" />
                <span className="text-xs text-gray-500">Blocked</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{selectedDevice.blocked_count}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center space-x-2 mb-1">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500">Block Rate</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {((selectedDevice.blocked_count / selectedDevice.query_count) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center space-x-2 mb-1">
                <Wifi className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500">Last Seen</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{formatLastSeen(selectedDevice.last_seen)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
