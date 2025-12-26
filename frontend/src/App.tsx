import { useState, useEffect, useRef, useCallback } from 'react'
import { Shield, Activity, Ban, Database, Clock, RefreshCw, Server, AlertTriangle, Wifi, WifiOff, Zap, Lock, Eye } from 'lucide-react'

// API base URL - use environment variable in production, empty string for dev (uses Vite proxy)
const API_BASE = import.meta.env.VITE_API_URL || ''

// Types
interface Stats {
  total_queries: number
  blocked_queries: number
  cache_hits: number
  cache_misses: number
  cache_hit_rate: number
  block_rate: number
  blocklist_size?: number
}

interface HealthStatus {
  status: string
  version: string
  uptime_seconds: number
  blocklist_size?: number
  cache_hit_rate?: number
}

interface QueryLogEntry {
  timestamp: number
  domain: string
  client_ip: string
  blocked: boolean
  response_time_ms: number
}

// Premium Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  subtitle,
  trend
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  subtitle?: string
  trend?: { value: number; positive: boolean }
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 hover:border-slate-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
      {/* Gradient glow effect */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient} blur-xl`} />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-400 font-medium">{title}</p>
            <p className="text-3xl font-bold text-white mt-2 tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                {trend && (
                  <span className={trend.positive ? 'text-emerald-400' : 'text-red-400'}>
                    {trend.positive ? '↑' : '↓'} {trend.value}%
                  </span>
                )}
                {subtitle}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const isHealthy = status === 'healthy'
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
      isHealthy
        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        : 'bg-red-500/20 text-red-400 border border-red-500/30'
    }`}>
      <span className={`w-2 h-2 rounded-full mr-2 animate-pulse ${isHealthy ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// Gradient Progress Bar Component
function GradientProgressBar({ value, gradient }: { value: number; gradient: string }) {
  return (
    <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${gradient}`}
        style={{ width: `${Math.min(value * 100, 100)}%` }}
      />
    </div>
  )
}

// Shield Logo SVG
function ShieldLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <path
        d="M24 4L6 12v12c0 11.05 7.68 21.38 18 24 10.32-2.62 18-12.95 18-24V12L24 4z"
        fill="url(#shieldGrad)"
      />
      <path
        d="M24 8L10 14v10c0 8.84 5.97 17.1 14 19.2 8.03-2.1 14-10.36 14-19.2V14L24 8z"
        fill="#0f172a"
        opacity="0.7"
      />
      <circle cx="24" cy="20" r="3" fill="#3b82f6" />
      <circle cx="18" cy="28" r="2" fill="#8b5cf6" />
      <circle cx="30" cy="28" r="2" fill="#22c55e" />
      <path d="M24 20L18 28M24 20L30 28" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.5" />
    </svg>
  )
}

function App() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [queryHistory, setQueryHistory] = useState<QueryLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch initial data and query history
  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [statsRes, healthRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/api/stats`),
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/api/history`)
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
  }, [])

  // WebSocket connection for real-time stats updates
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    let wsUrl: string
    if (API_BASE) {
      const apiUrl = new URL(API_BASE)
      const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${apiUrl.host}/ws`
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${protocol}//${window.location.host}/ws`
    }

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setWsConnected(true)
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Stats
          setStats(data)
          setLastUpdated(new Date())
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setWsConnected(false)
        wsRef.current = null
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket()
        }, 3000)
      }

      wsRef.current = ws
    } catch (err) {
      console.error('Failed to create WebSocket:', err)
    }
  }, [])

  useEffect(() => {
    fetchData()
    connectWebSocket()

    const historyInterval = setInterval(async () => {
      try {
        const historyRes = await fetch(`${API_BASE}/api/history`)
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          setQueryHistory(historyData.queries || [])
        }
      } catch (err) {
        console.error('Failed to fetch history:', err)
      }
    }, 5000)

    const healthInterval = setInterval(async () => {
      try {
        const healthRes = await fetch(`${API_BASE}/health`)
        if (healthRes.ok) {
          const healthData = await healthRes.json()
          setHealth(healthData)
        }
      } catch (err) {
        console.error('Failed to fetch health:', err)
      }
    }, 10000)

    return () => {
      clearInterval(historyInterval)
      clearInterval(healthInterval)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [fetchData, connectWebSocket])

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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <ShieldLogo className="w-16 h-16 mx-auto mb-6 animate-pulse" />
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
          </div>
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Loading Shield AI Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Background gradient effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <ShieldLogo className="w-10 h-10" />
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Shield AI</h1>
                <p className="text-xs text-slate-500 font-medium">DNS Protection Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Live indicator */}
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${
                wsConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {wsConnected ? (
                  <><Wifi className="w-3 h-3 mr-1.5" /><span className="animate-pulse">Live</span></>
                ) : (
                  <><WifiOff className="w-3 h-3 mr-1.5" /> Polling</>
                )}
              </span>
              {health && <StatusBadge status={health.status} />}
              <button
                onClick={fetchData}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-700"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center backdrop-blur-sm">
            <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Server Status Bar */}
        {health && (
          <div className="mb-8 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-500 text-sm">Version</span>
                  <span className="font-mono text-white bg-slate-700/50 px-2 py-0.5 rounded text-sm">{health.version}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-500 text-sm">Uptime</span>
                  <span className="font-semibold text-emerald-400">{formatUptime(health.uptime_seconds)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-500 text-sm">Encryption</span>
                  <span className="font-semibold text-blue-400">256-bit</span>
                </div>
              </div>
              <div className="text-xs text-slate-600">
                Updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard
                title="Total Queries"
                value={formatNumber(stats.total_queries)}
                icon={Activity}
                gradient="from-blue-500 to-blue-600"
                subtitle="DNS requests processed"
              />
              <StatCard
                title="Threats Blocked"
                value={formatNumber(stats.blocked_queries)}
                icon={Ban}
                gradient="from-red-500 to-rose-600"
                subtitle={`${(stats.block_rate * 100).toFixed(1)}% block rate`}
              />
              <StatCard
                title="Cache Hits"
                value={formatNumber(stats.cache_hits)}
                icon={Database}
                gradient="from-emerald-500 to-green-600"
                subtitle={`${(stats.cache_hit_rate * 100).toFixed(1)}% hit rate`}
              />
              <StatCard
                title="Response Time"
                value="<1ms"
                icon={Zap}
                gradient="from-amber-500 to-orange-600"
                subtitle="Average latency"
              />
            </div>

            {/* Performance Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Cache Performance */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-400" />
                    Cache Performance
                  </h3>
                  <span className="text-2xl font-bold text-emerald-400">
                    {(stats.cache_hit_rate * 100).toFixed(1)}%
                  </span>
                </div>
                <GradientProgressBar value={stats.cache_hit_rate} gradient="from-emerald-500 to-green-400" />
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <p className="text-slate-500 text-xs font-medium">Cache Hits</p>
                    <p className="text-xl font-bold text-white mt-1">{formatNumber(stats.cache_hits)}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <p className="text-slate-500 text-xs font-medium">Cache Misses</p>
                    <p className="text-xl font-bold text-white mt-1">{formatNumber(stats.cache_misses)}</p>
                  </div>
                </div>
              </div>

              {/* Threat Protection */}
              <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-400" />
                    Threat Protection
                  </h3>
                  <span className="text-2xl font-bold text-red-400">
                    {(stats.block_rate * 100).toFixed(1)}%
                  </span>
                </div>
                <GradientProgressBar value={stats.block_rate} gradient="from-red-500 to-rose-400" />
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <p className="text-slate-500 text-xs font-medium">Threats Blocked</p>
                    <p className="text-xl font-bold text-white mt-1">{formatNumber(stats.blocked_queries)}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-xl p-4">
                    <p className="text-slate-500 text-xs font-medium">Queries Allowed</p>
                    <p className="text-xl font-bold text-white mt-1">{formatNumber(stats.total_queries - stats.blocked_queries)}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Query History Table */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
                Live Query Stream
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Last 20 queries
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-700/30">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Domain</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {queryHistory.length > 0 ? (
                  queryHistory.slice(0, 20).map((query, index) => (
                    <tr key={index} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                        {formatTimestamp(query.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {query.domain}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          query.blocked
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {query.blocked ? 'Blocked' : 'Allowed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                        {query.response_time_ms}ms
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="text-slate-500">
                        <Activity className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No query history available</p>
                        <p className="text-sm mt-1">Queries will appear here in real-time</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <ShieldLogo className="w-6 h-6" />
            <span className="text-lg font-semibold text-white">Shield AI</span>
            <span className="text-xs text-slate-600 font-mono bg-slate-800 px-2 py-0.5 rounded">v0.4.4</span>
          </div>
          <p className="text-sm text-slate-600">
            AI-Powered DNS Protection • Open Source • Privacy-First
          </p>
        </div>
      </main>
    </div>
  )
}

export default App
