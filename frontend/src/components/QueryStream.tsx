import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Filter, Shield, Ban, Database, Trash2, Plus } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface QueryEntry {
  id: string
  timestamp: number
  domain: string
  client_ip: string
  blocked: boolean
  cached: boolean
  response_time_ms: number
  query_type?: string
  threat_score?: number
}

interface QueryStreamProps {
  className?: string
}

export default function QueryStream({ className = '' }: QueryStreamProps) {
  const [queries, setQueries] = useState<QueryEntry[]>([])
  const [filteredQueries, setFilteredQueries] = useState<QueryEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'blocked' | 'allowed' | 'cached'>('all')
  const [wsConnected, setWsConnected] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        setWsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'query' || data.domain) {
            const newQuery: QueryEntry = {
              id: `${Date.now()}-${Math.random()}`,
              timestamp: data.timestamp || Date.now() / 1000,
              domain: data.domain || 'unknown',
              client_ip: data.client_ip || '0.0.0.0',
              blocked: data.blocked || false,
              cached: data.cached || false,
              response_time_ms: data.response_time_ms || 0,
              query_type: data.query_type || 'A',
              threat_score: data.threat_score
            }
            setQueries(prev => [newQuery, ...prev].slice(0, 1000))
          }
        } catch {
          // Ignore parse errors
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
        wsRef.current = null
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000)
      }

      wsRef.current = ws
    } catch {
      // Ignore connection errors
    }
  }, [])

  useEffect(() => {
    const fetchInitialQueries = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/history`)
        if (response.ok) {
          const data = await response.json()
          const mappedQueries = (data.queries || []).map((q: QueryEntry, idx: number) => ({
            id: `${q.timestamp}-${idx}`,
            timestamp: q.timestamp,
            domain: q.domain,
            client_ip: q.client_ip,
            blocked: q.blocked,
            cached: q.cached || false,
            response_time_ms: q.response_time_ms,
            query_type: q.query_type || 'A',
            threat_score: q.threat_score
          }))
          setQueries(mappedQueries)
        }
      } catch {
        // Ignore fetch errors
      }
    }

    fetchInitialQueries()
    connectWebSocket()

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connectWebSocket])

  useEffect(() => {
    let filtered = queries
    if (filterStatus === 'blocked') filtered = filtered.filter(q => q.blocked)
    else if (filterStatus === 'allowed') filtered = filtered.filter(q => !q.blocked)
    else if (filterStatus === 'cached') filtered = filtered.filter(q => q.cached)

    if (searchTerm) {
      filtered = filtered.filter(q => q.domain.toLowerCase().includes(searchTerm.toLowerCase()))
    }
    setFilteredQueries(filtered)
  }, [queries, searchTerm, filterStatus])

  useEffect(() => {
    if (autoScroll && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [filteredQueries, autoScroll])

  const handleAddToBlocklist = async (domain: string) => {
    try {
      await fetch(`${API_BASE}/api/blocklist/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      })
    } catch {
      // Ignore errors
    }
  }

  const handleAddToAllowlist = async (domain: string) => {
    try {
      await fetch(`${API_BASE}/api/allowlist/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      })
    } catch {
      // Ignore errors
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const getStatusColor = (query: QueryEntry) => {
    if (query.blocked) return 'bg-red-100 text-red-800 border-red-200'
    if (query.cached) return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getStatusIcon = (query: QueryEntry) => {
    if (query.blocked) return <Ban className="w-4 h-4" />
    if (query.cached) return <Database className="w-4 h-4" />
    return <Shield className="w-4 h-4" />
  }

  const getStatusText = (query: QueryEntry) => {
    if (query.blocked) return 'Blocked'
    if (query.cached) return 'Cached'
    return 'Allowed'
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold text-gray-900">Query Stream</h2>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              wsConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>
              {wsConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="mr-2 rounded border-gray-300"
              />
              Auto-scroll
            </label>
            <button
              onClick={() => setQueries([])}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search domains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'blocked' | 'allowed' | 'cached')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Queries</option>
              <option value="blocked">Blocked Only</option>
              <option value="allowed">Allowed Only</option>
              <option value="cached">Cached Only</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center space-x-6 text-sm text-gray-600">
          <span>Total: {filteredQueries.length}</span>
          <span className="text-red-600">Blocked: {filteredQueries.filter(q => q.blocked).length}</span>
          <span className="text-blue-600">Cached: {filteredQueries.filter(q => q.cached).length}</span>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '600px' }}>
        {filteredQueries.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No queries found</p>
            <p className="text-sm mt-2">Waiting for DNS queries...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredQueries.map((query) => (
              <div key={query.id} className="p-4 hover:bg-gray-50 group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(query)}`}>
                        {getStatusIcon(query)}
                        <span className="ml-1.5">{getStatusText(query)}</span>
                      </span>
                      <span className="text-xs text-gray-500 font-mono">{formatTimestamp(query.timestamp)}</span>
                      <span className="text-xs text-gray-400">{query.response_time_ms}ms</span>
                      {query.threat_score !== undefined && query.threat_score > 0.5 && (
                        <span className="text-xs text-orange-600 font-medium">
                          Threat: {(query.threat_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{query.domain}</p>
                      <span className="text-xs text-gray-400">{query.query_type || 'A'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Client: {query.client_ip}</p>
                  </div>
                  <div className="ml-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100">
                    {!query.blocked && (
                      <button
                        onClick={() => handleAddToBlocklist(query.domain)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Add to blocklist"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    {query.blocked && (
                      <button
                        onClick={() => handleAddToAllowlist(query.domain)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        title="Add to allowlist"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
