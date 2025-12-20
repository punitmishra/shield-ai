import { useState, useEffect } from 'react'
import { Shield, Activity, Ban, Database, Clock, RefreshCw, Server, AlertTriangle } from 'lucide-react'

// Types
interface Stats {
  total_queries: number
  blocked_queries: number
  cache_hits: number
  cache_misses: number
  cache_hit_rate: number
  block_rate: number
}

interface HealthStatus {
  status: string
  version: string
  uptime_seconds: number
}

interface QueryLogEntry {
  timestamp: number
  domain: string
  client_ip: string
  blocked: boolean
  response_time_ms: number
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
  subtitle?: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const isHealthy = status === 'healthy'
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
      isHealthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      <span className={`w-2 h-2 rounded-full mr-2 ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
      {status}
    </span>
  )
}

// Progress Bar Component
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(value * 100, 100)}%` }}
      />
    </div>
  )
}

function App() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [queryHistory, setQueryHistory] = useState<QueryLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchData = async () => {
    try {
      setError(null)
      const [statsRes, healthRes, historyRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/health'),
        fetch('/api/history')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
      if (healthRes.ok) {
        const healthData = await healthRes.json()
        setHealth(healthData)
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json()
        setQueryHistory(historyData.queries || [])
      }
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError('Failed to connect to API server')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${mins}m`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m ${seconds % 60}s`
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading Shield AI Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Shield AI</h1>
                <p className="text-sm text-gray-500">DNS Protection Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {health && <StatusBadge status={health.status} />}
              <button
                onClick={fetchData}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Server Info */}
        {health && (
          <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Server className="w-5 h-5 text-gray-500" />
                <div>
                  <span className="text-gray-600">Version:</span>
                  <span className="ml-2 font-mono text-gray-900">{health.version}</span>
                </div>
                <div className="border-l border-gray-200 pl-4">
                  <span className="text-gray-600">Uptime:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {formatUptime(health.uptime_seconds)}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Queries"
                value={formatNumber(stats.total_queries)}
                icon={Activity}
                color="bg-blue-500"
                subtitle="All DNS requests"
              />
              <StatCard
                title="Blocked Queries"
                value={formatNumber(stats.blocked_queries)}
                icon={Ban}
                color="bg-red-500"
                subtitle={`${(stats.block_rate * 100).toFixed(1)}% block rate`}
              />
              <StatCard
                title="Cache Hits"
                value={formatNumber(stats.cache_hits)}
                icon={Database}
                color="bg-green-500"
                subtitle={`${(stats.cache_hit_rate * 100).toFixed(1)}% hit rate`}
              />
              <StatCard
                title="Cache Misses"
                value={formatNumber(stats.cache_misses)}
                icon={Clock}
                color="bg-orange-500"
                subtitle="Upstream lookups"
              />
            </div>

            {/* Rate Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cache Performance</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Hit Rate</span>
                      <span className="font-semibold text-green-600">
                        {(stats.cache_hit_rate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <ProgressBar value={stats.cache_hit_rate} color="bg-green-500" />
                  </div>
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Lookups</span>
                      <span className="text-gray-900">{formatNumber(stats.cache_hits + stats.cache_misses)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Threat Protection</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Block Rate</span>
                      <span className="font-semibold text-red-600">
                        {(stats.block_rate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <ProgressBar value={stats.block_rate} color="bg-red-500" />
                  </div>
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Threats Blocked</span>
                      <span className="text-gray-900">{formatNumber(stats.blocked_queries)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Query History Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Queries</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {queryHistory.length > 0 ? (
                  queryHistory.slice(0, 20).map((query, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(query.timestamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {query.domain}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          query.blocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {query.blocked ? 'Blocked' : 'Allowed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {query.response_time_ms}ms
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      No query history available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Shield AI - AI-Powered DNS Protection</p>
          <p className="mt-1">Open Source | Privacy-First | Ultra-Fast</p>
        </div>
      </main>
    </div>
  )
}

export default App
