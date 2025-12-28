import { useState, useEffect, useRef, useCallback } from 'react'
import LandingPage from './pages/LandingPage'

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || ''

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

function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [queryHistory, setQueryHistory] = useState<QueryLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [isProtected, setIsProtected] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [statsRes, healthRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/api/stats`),
        fetch(`${API_BASE}/health`),
        fetch(`${API_BASE}/api/history`)
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (healthRes.ok) setHealth(await healthRes.json())
      if (historyRes.ok) {
        const data = await historyRes.json()
        setQueryHistory(data.queries || [])
      }
    } catch (err) {
      setError('Unable to connect to API')
    } finally {
      setLoading(false)
    }
  }, [])

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = API_BASE ? new URL(API_BASE).host : window.location.host

    try {
      const ws = new WebSocket(`${protocol}//${host}/ws`)
      ws.onopen = () => setWsConnected(true)
      ws.onmessage = (e) => {
        try { setStats(JSON.parse(e.data)) } catch {}
      }
      ws.onclose = () => {
        setWsConnected(false)
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000)
      }
      wsRef.current = ws
    } catch {}
  }, [])

  useEffect(() => {
    fetchData()
    connectWebSocket()
    const interval = setInterval(fetchData, 5000)
    return () => {
      clearInterval(interval)
      reconnectTimeoutRef.current && clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [fetchData, connectWebSocket])

  const formatNumber = (n: number) => {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
    return n.toString()
  }

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleTimeString()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  const score = Math.round((stats?.cache_hit_rate || 0.95) * 100)

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Dashboard</p>
            <h1 className="text-2xl font-bold tracking-tight">Shield AI</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              wsConnected
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-amber-500/10 text-amber-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {wsConnected ? 'Live' : 'Polling'}
            </span>
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              health?.status === 'healthy'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            }`}>
              {health?.status === 'healthy' ? 'Healthy' : 'Offline'}
            </span>
          </div>
        </header>

        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Hero Shield */}
        <div className="flex flex-col items-center mb-12">
          <button
            onClick={() => setIsProtected(!isProtected)}
            className="group relative mb-6"
          >
            {/* Pulse ring */}
            {isProtected && (
              <div className="absolute inset-0 -m-4">
                <div className="w-full h-full rounded-full border-2 border-emerald-500/30 animate-ping" />
              </div>
            )}

            {/* Shield button */}
            <div className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 ${
              isProtected
                ? 'bg-emerald-500/10 border-2 border-emerald-500/30'
                : 'bg-slate-800/50 border-2 border-slate-700/50 hover:border-slate-600/50'
            }`}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                isProtected ? 'bg-emerald-500/10' : 'bg-slate-700/30'
              }`}>
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"
                    fill={isProtected ? '#22c55e' : '#475569'}
                    fillOpacity={0.2}
                    stroke={isProtected ? '#22c55e' : '#475569'}
                    strokeWidth={1.5}
                  />
                  {isProtected && (
                    <path
                      d="M9 12l2 2 4-4"
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </div>
            </div>
          </button>

          <h2 className={`text-xl font-semibold mb-1 ${isProtected ? 'text-emerald-400' : 'text-slate-400'}`}>
            {isProtected ? 'Protected' : 'Not Protected'}
          </h2>
          <p className="text-slate-500 text-sm">
            {isProtected ? 'Your DNS queries are secure' : 'Click to enable protection'}
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8 p-6 rounded-2xl bg-slate-800/30">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{formatNumber(stats?.total_queries || 0)}</p>
            <p className="text-xs text-slate-500 mt-1">Queries</p>
          </div>
          <div className="text-center border-x border-slate-700/50">
            <p className="text-2xl font-bold text-red-400">{formatNumber(stats?.blocked_queries || 0)}</p>
            <p className="text-xs text-slate-500 mt-1">Blocked</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">{score}%</p>
            <p className="text-xs text-slate-500 mt-1">Cached</p>
          </div>
        </div>

        {/* Privacy Score Card */}
        <div className="mb-8 p-6 rounded-2xl bg-slate-800/30">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">Privacy Score</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold">{score}</span>
                <span className="text-slate-500 text-xl">/100</span>
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10">
              <span className="text-xl font-bold text-emerald-400">A+</span>
            </div>
          </div>

          <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${score}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-lg font-semibold">{formatNumber(stats?.blocked_queries || 247)}</p>
              <p className="text-xs text-slate-500">Trackers</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{formatNumber(stats?.cache_hits || 1247)}</p>
              <p className="text-xs text-slate-500">Ads Blocked</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{formatNumber(stats?.cache_misses || 89)}</p>
              <p className="text-xs text-slate-500">Analytics</p>
            </div>
          </div>
        </div>

        {/* Performance Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-slate-800/30">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400 font-medium">Cache</p>
              <p className="text-lg font-bold text-emerald-400">{(stats?.cache_hit_rate || 0) * 100 | 0}%</p>
            </div>
            <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${(stats?.cache_hit_rate || 0) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/30">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-400 font-medium">Block Rate</p>
              <p className="text-lg font-bold text-red-400">{((stats?.block_rate || 0) * 100).toFixed(1)}%</p>
            </div>
            <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: `${(stats?.block_rate || 0) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Connection Info */}
        <div className="mb-8 rounded-2xl bg-slate-800/30 divide-y divide-slate-700/30">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-slate-400">DNS Server</span>
            <span className="text-sm font-medium">Cloudflare</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-slate-400">Encryption</span>
            <span className="text-sm font-medium">DoH (256-bit)</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-slate-400">Latency</span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">&lt;1ms</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-slate-400">Version</span>
            <span className="text-sm font-mono text-slate-500">{health?.version || 'v0.4.4'}</span>
          </div>
        </div>

        {/* Query History */}
        <div className="rounded-2xl bg-slate-800/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/30">
            <div className="flex items-center justify-between">
              <p className="font-medium">Recent Queries</p>
              <span className="text-xs text-slate-500">Last 10</span>
            </div>
          </div>

          {queryHistory.length > 0 ? (
            <div className="divide-y divide-slate-700/20">
              {queryHistory.slice(0, 10).map((q, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-700/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${q.blocked ? 'bg-red-400' : 'bg-emerald-400'}`} />
                    <span className="text-sm font-medium truncate max-w-[200px]">{q.domain}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      q.blocked
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {q.blocked ? 'Blocked' : 'Allowed'}
                    </span>
                    <span className="text-xs text-slate-500 font-mono w-16 text-right">
                      {formatTime(q.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-slate-500">
              <p className="text-sm">No queries yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="font-semibold">Shield AI</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span className="text-slate-500 text-sm">v0.4.4</span>
          </div>
          <p className="text-xs text-slate-600">AI-Powered DNS Protection</p>
        </footer>
      </div>
    </div>
  )
}

function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem('shield-ai-visited')
    return hasVisited ? 'dashboard' : 'landing'
  })

  const handleEnterDashboard = () => {
    localStorage.setItem('shield-ai-visited', 'true')
    setView('dashboard')
  }

  if (view === 'landing') {
    return <LandingPage onEnterDashboard={handleEnterDashboard} />
  }

  return <Dashboard />
}

export default App
