import { useState, useEffect } from 'react'
import { Laptop, Smartphone, Tv, Watch, Server, Shield, Activity, Tag } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Device {
  id: string
  name: string
  ip_address: string
  type: 'laptop' | 'phone' | 'tablet' | 'tv' | 'iot' | 'other'
  profile?: string
  query_count: number
  blocked_count: number
  last_seen: number
  online: boolean
}

interface DeviceListProps {
  className?: string
  compact?: boolean
}

export default function DeviceList({ className = '', compact = false }: DeviceListProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        // Try to get devices from history API
        const response = await fetch(`${API_BASE}/api/history`)
        if (response.ok) {
          const data = await response.json()
          const queries = data.queries || []

          // Extract unique clients from query history
          const clientMap = new Map<string, Device>()
          queries.forEach((q: { client_ip: string; blocked?: boolean; timestamp?: number }) => {
            const existing = clientMap.get(q.client_ip)
            if (existing) {
              existing.query_count++
              if (q.blocked) existing.blocked_count++
              if (q.timestamp && q.timestamp > existing.last_seen) {
                existing.last_seen = q.timestamp
              }
            } else {
              clientMap.set(q.client_ip, {
                id: q.client_ip,
                name: `Device ${q.client_ip.split('.').pop()}`,
                ip_address: q.client_ip,
                type: 'other',
                query_count: 1,
                blocked_count: q.blocked ? 1 : 0,
                last_seen: q.timestamp || Date.now() / 1000,
                online: true
              })
            }
          })

          setDevices(Array.from(clientMap.values()))
        }
      } catch (err) {
        console.error('Failed to fetch devices:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDevices()
    const interval = setInterval(fetchDevices, 10000)
    return () => clearInterval(interval)
  }, [])

  const getDeviceIcon = (type: Device['type']) => {
    const iconClass = compact ? 'w-4 h-4' : 'w-5 h-5'
    switch (type) {
      case 'laptop': return <Laptop className={iconClass} />
      case 'phone': return <Smartphone className={iconClass} />
      case 'tablet': return <Smartphone className={iconClass} />
      case 'tv': return <Tv className={iconClass} />
      case 'iot': return <Watch className={iconClass} />
      default: return <Server className={iconClass} />
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

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <Activity className="w-6 h-6 text-blue-500 animate-pulse" />
          <span className="ml-2 text-gray-600">Loading devices...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className={`${compact ? 'text-base' : 'text-lg'} font-bold text-gray-900`}>
            Connected Devices
          </h3>
          <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>
            {devices.filter(d => d.online).length} online
          </span>
        </div>
      </div>

      <div className={`${compact ? 'max-h-96' : 'max-h-[600px]'} overflow-y-auto`}>
        {devices.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No devices detected</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {devices.map(device => (
              <div
                key={device.id}
                className={`${compact ? 'p-3' : 'p-4'} hover:bg-gray-50 transition-colors`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`${
                    device.online ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  } ${compact ? 'p-2' : 'p-2.5'} rounded-lg flex-shrink-0`}>
                    {getDeviceIcon(device.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-900 truncate`}>
                        {device.name}
                      </h4>
                      {device.online && (
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 ml-2" />
                      )}
                    </div>

                    <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500 mb-2`}>
                      {device.ip_address}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {device.profile && (
                          <div className="flex items-center space-x-1">
                            <Tag className="w-3 h-3 text-blue-500" />
                            <span className={`${compact ? 'text-xs' : 'text-sm'} text-blue-600 font-medium`}>
                              {device.profile}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-600">
                        <span className="flex items-center">
                          <Activity className="w-3 h-3 mr-1" />
                          {device.query_count}
                        </span>
                        {device.blocked_count > 0 && (
                          <span className="text-red-600 font-medium">
                            {device.blocked_count} blocked
                          </span>
                        )}
                      </div>
                    </div>

                    {!compact && (
                      <div className="mt-2 text-xs text-gray-400">
                        Last seen: {formatLastSeen(device.last_seen)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!compact && devices.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
              <p className="text-xs text-gray-500">Total Devices</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{devices.filter(d => d.online).length}</p>
              <p className="text-xs text-gray-500">Online</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {devices.reduce((sum, d) => sum + d.query_count, 0)}
              </p>
              <p className="text-xs text-gray-500">Total Queries</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
