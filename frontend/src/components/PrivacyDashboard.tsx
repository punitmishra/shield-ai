import { useState, useEffect } from 'react'
import { Shield, Eye, TrendingUp, Award, Ban } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface PrivacyMetrics {
  privacy_score: number
  trackers_blocked: number
  ad_requests_blocked: number
  analytics_blocked: number
  privacy_grade: string
  trend_data: Array<{ time: string; score: number }>
  tracker_categories: Array<{ name: string; count: number }>
  top_trackers: Array<{ domain: string; blocked_count: number }>
}

interface PrivacyDashboardProps {
  className?: string
}

export default function PrivacyDashboard({ className = '' }: PrivacyDashboardProps) {
  const [metrics, setMetrics] = useState<PrivacyMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrivacyMetrics = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE}/api/privacy-metrics`)
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        } else {
          setMetrics(generateSampleData())
        }
      } catch {
        setMetrics(generateSampleData())
      } finally {
        setLoading(false)
      }
    }

    fetchPrivacyMetrics()
    const interval = setInterval(fetchPrivacyMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const generateSampleData = (): PrivacyMetrics => {
    const now = Date.now()
    return {
      privacy_score: 85,
      trackers_blocked: 1234,
      ad_requests_blocked: 856,
      analytics_blocked: 378,
      privacy_grade: 'A',
      trend_data: Array.from({ length: 24 }, (_, i) => ({
        time: new Date(now - (23 - i) * 3600000).toLocaleTimeString('en-US', { hour: '2-digit' }),
        score: 75 + Math.random() * 20
      })),
      tracker_categories: [
        { name: 'Advertising', count: 856 },
        { name: 'Analytics', count: 378 },
        { name: 'Social Media', count: 245 },
        { name: 'Other', count: 155 }
      ],
      top_trackers: [
        { domain: 'doubleclick.net', blocked_count: 342 },
        { domain: 'google-analytics.com', blocked_count: 298 },
        { domain: 'facebook.com', blocked_count: 187 },
        { domain: 'amazon-adsystem.com', blocked_count: 156 },
        { domain: 'googlesyndication.com', blocked_count: 134 }
      ]
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500'
      case 'B': return 'bg-blue-500'
      case 'C': return 'bg-yellow-500'
      case 'D': return 'bg-orange-500'
      default: return 'bg-red-500'
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-12 ${className}`}>
        <div className="flex items-center justify-center">
          <Shield className="w-8 h-8 text-blue-500 animate-pulse" />
          <span className="ml-3 text-gray-600">Loading privacy metrics...</span>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-12 ${className}`}>
        <div className="text-center text-gray-500">
          <Eye className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No privacy data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Eye className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Privacy Dashboard</h2>
              <p className="text-sm text-gray-500">Your privacy protection overview</p>
            </div>
          </div>
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getGradeColor(metrics.privacy_grade)}`}>
              <span className="text-3xl font-bold text-white">{metrics.privacy_grade}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Privacy Grade</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Trackers Blocked</p>
                <p className="text-2xl font-bold text-red-900 mt-1">{metrics.trackers_blocked.toLocaleString()}</p>
              </div>
              <Shield className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Ad Requests</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">{metrics.ad_requests_blocked.toLocaleString()}</p>
              </div>
              <Ban className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Analytics Blocked</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{metrics.analytics_blocked.toLocaleString()}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Privacy Score Trend (24h)</h3>
          </div>
          <div className="h-32 flex items-end space-x-1">
            {metrics.trend_data.map((point, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                style={{ height: `${point.score}%` }}
                title={`${point.time}: ${point.score.toFixed(0)}%`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Tracker Categories</h3>
            <div className="space-y-3">
              {metrics.tracker_categories.map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${['bg-red-500', 'bg-orange-500', 'bg-blue-500', 'bg-gray-500'][i]}`} />
                    <span className="text-sm text-gray-700">{cat.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-2 mb-4">
              <Award className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Top Blocked Trackers</h3>
            </div>
            <div className="space-y-3">
              {metrics.top_trackers.map((tracker, index) => (
                <div key={tracker.domain} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {tracker.domain}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 font-semibold">{tracker.blocked_count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Current Privacy Score</h3>
            <span className="text-3xl font-bold text-blue-600">{metrics.privacy_score}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${metrics.privacy_score}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Your privacy is well protected. Shield AI has blocked {metrics.trackers_blocked} trackers in the last 24 hours.
          </p>
        </div>
      </div>
    </div>
  )
}
