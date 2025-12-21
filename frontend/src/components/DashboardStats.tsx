import { useState, useEffect, useRef, useCallback } from 'react'
import { Activity, Ban, Database, TrendingUp, AlertTriangle, Shield } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Stats {
  total_queries: number
  blocked_queries: number
  cache_hits: number
  cache_misses: number
  cache_hit_rate: number
  block_rate: number
  dga_detected?: number
  high_risk_count?: number
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: string
  subtitle?: string
  trend?: number
}

function StatCard({ title, value, icon: Icon, color, subtitle, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center mt-2 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`w-3 h-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-xl ${color}`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [previousStats, setPreviousStats] = useState<Stats | null>(null)

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const calculateTrend = (current: number, previous: number): number => {
    if (!previous) return 0
    return ((current - previous) / previous) * 100
  }

  const fetchStats = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch(`${API_BASE}/api/stats`)

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`)
      }

      const data = await response.json()
      setPreviousStats(stats)
      setStats(data)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
      setError('Failed to load statistics')
      setLoading(false)
    }
  }, [stats])

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
        console.log('DashboardStats WebSocket connected')
        setWsConnected(true)
        setError(null)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Stats
          setPreviousStats(stats)
          setStats(data)
          setLoading(false)
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      ws.onerror = () => {
        setWsConnected(false)
      }

      ws.onclose = () => {
        setWsConnected(false)
        wsRef.current = null

        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket()
        }, 3000)
      }

      wsRef.current = ws
    } catch (err) {
      console.error('Failed to create WebSocket:', err)
      setWsConnected(false)
    }
  }, [stats])

  useEffect(() => {
    fetchStats()
    connectWebSocket()

    const fallbackInterval = setInterval(() => {
      if (!wsConnected) {
        fetchStats()
      }
    }, 5000)

    return () => {
      clearInterval(fallbackInterval)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connectWebSocket, fetchStats, wsConnected])

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const queryTrend = previousStats ? calculateTrend(stats.total_queries, previousStats.total_queries) : 0
  const blockedTrend = previousStats ? calculateTrend(stats.blocked_queries, previousStats.blocked_queries) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Real-Time Statistics</h2>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            wsConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            {wsConnected ? 'Live' : 'Polling'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Queries"
          value={formatNumber(stats.total_queries)}
          icon={Activity}
          color="bg-blue-500"
          subtitle="DNS requests processed"
          trend={queryTrend}
        />

        <StatCard
          title="Blocked Queries"
          value={formatNumber(stats.blocked_queries)}
          icon={Ban}
          color="bg-red-500"
          subtitle={`${(stats.block_rate * 100).toFixed(1)}% of total`}
          trend={blockedTrend}
        />

        <StatCard
          title="Cache Hit Rate"
          value={`${(stats.cache_hit_rate * 100).toFixed(1)}%`}
          icon={Database}
          color="bg-green-500"
          subtitle={`${formatNumber(stats.cache_hits)} hits`}
        />

        {stats.dga_detected !== undefined && (
          <StatCard
            title="DGA Detected"
            value={formatNumber(stats.dga_detected)}
            icon={AlertTriangle}
            color="bg-orange-500"
            subtitle="Algorithm-generated domains"
          />
        )}

        {stats.high_risk_count !== undefined && (
          <StatCard
            title="High Risk Domains"
            value={formatNumber(stats.high_risk_count)}
            icon={Shield}
            color="bg-purple-500"
            subtitle="AI threat classification"
          />
        )}

        <StatCard
          title="Block Rate"
          value={`${(stats.block_rate * 100).toFixed(1)}%`}
          icon={Ban}
          color="bg-red-600"
          subtitle="Threat protection efficiency"
        />
      </div>
    </div>
  )
}
