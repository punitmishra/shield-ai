import { useState, useEffect } from 'react'
import { AlertTriangle, Shield, Clock, TrendingUp, Activity } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface ThreatItem {
  domain: string
  risk_score: number
  threat_category?: string
  timestamp?: number
  count?: number
}

interface MLAnalytics {
  top_threats?: ThreatItem[]
  recent_detections?: ThreatItem[]
  high_risk_count?: number
  dga_detected?: number
}

export default function ThreatFeed() {
  const [analytics, setAnalytics] = useState<MLAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchThreats = async () => {
    try {
      setError(null)
      const response = await fetch(`${API_BASE}/api/ml/analytics`)

      if (!response.ok) {
        throw new Error(`Failed to fetch threat feed: ${response.status}`)
      }

      const data = await response.json()
      setAnalytics(data)
      setLastUpdate(new Date())
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch threat feed:', err)
      setError('Failed to load threat feed')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchThreats()
    const interval = setInterval(fetchThreats, 30000)

    return () => clearInterval(interval)
  }, [])

  const getRiskColor = (score: number): string => {
    if (score >= 0.7) return 'bg-red-500'
    if (score >= 0.4) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getRiskTextColor = (score: number): string => {
    if (score >= 0.7) return 'text-red-700'
    if (score >= 0.4) return 'text-yellow-700'
    return 'text-green-700'
  }

  const getRiskBgColor = (score: number): string => {
    if (score >= 0.7) return 'bg-red-50'
    if (score >= 0.4) return 'bg-yellow-50'
    return 'bg-green-50'
  }

  const formatTimeAgo = (timestamp?: number): string => {
    if (!timestamp) return 'Just now'
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  const threats = analytics?.top_threats || analytics?.recent_detections || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Live Threat Feed</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-green-500 animate-pulse" />
            <span className="text-xs text-green-600 font-medium">Live</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {analytics?.high_risk_count !== undefined && (
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">High Risk Threats</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{analytics.high_risk_count}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        )}

        {analytics?.dga_detected !== undefined && (
          <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">DGA Detected</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">{analytics.dga_detected}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Active Monitoring</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{threats.length}</p>
            </div>
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />
            Top Threats
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {threats.length > 0 ? (
            threats.slice(0, 10).map((threat, index) => (
              <div
                key={index}
                className={`p-4 hover:bg-gray-50 transition-colors ${getRiskBgColor(threat.risk_score)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${getRiskColor(threat.risk_score)}`} />
                      <p className="font-mono text-sm font-medium text-gray-900">{threat.domain}</p>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 ml-5">
                      {threat.threat_category && (
                        <span className="text-xs text-gray-600">
                          Category: <span className="font-medium">{threat.threat_category}</span>
                        </span>
                      )}
                      {threat.count && (
                        <span className="text-xs text-gray-600">
                          Occurrences: <span className="font-medium">{threat.count}</span>
                        </span>
                      )}
                      {threat.timestamp && (
                        <span className="text-xs text-gray-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTimeAgo(threat.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className={`text-lg font-bold ${getRiskTextColor(threat.risk_score)}`}>
                      {(threat.risk_score * 100).toFixed(0)}%
                    </div>
                    <p className="text-xs text-gray-500">Risk Score</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No threats detected</p>
              <p className="text-sm mt-1">Your network is secure</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center text-sm text-gray-500">
        <Activity className="w-4 h-4 mr-2" />
        Auto-refreshes every 30 seconds
      </div>
    </div>
  )
}
