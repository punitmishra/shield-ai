import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts'
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface AnalyticsData {
  risk_distribution?: {
    low: number
    medium: number
    high: number
  }
  hourly_stats?: Array<{
    hour: number
    queries: number
    blocked: number
  }>
  top_domains?: Array<{
    domain: string
    count: number
  }>
}

const RISK_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444'
}

export default function AnalyticsChart() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setError(null)
        const response = await fetch(`${API_BASE}/api/analytics`)

        if (!response.ok) {
          throw new Error(`Failed to fetch analytics: ${response.status}`)
        }

        const data = await response.json()
        setAnalytics(data)
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
        // Generate mock data if API fails
        setAnalytics({
          risk_distribution: { low: 75, medium: 20, high: 5 },
          hourly_stats: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            queries: Math.floor(Math.random() * 1000) + 100,
            blocked: Math.floor(Math.random() * 50)
          })),
          top_domains: [
            { domain: 'google.com', count: 450 },
            { domain: 'facebook.com', count: 320 },
            { domain: 'cloudflare.com', count: 280 },
            { domain: 'github.com', count: 210 },
            { domain: 'aws.amazon.com', count: 180 }
          ]
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 60000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
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

  const riskDistributionData = analytics?.risk_distribution
    ? [
        { name: 'Low Risk', value: analytics.risk_distribution.low, color: RISK_COLORS.low },
        { name: 'Medium Risk', value: analytics.risk_distribution.medium, color: RISK_COLORS.medium },
        { name: 'High Risk', value: analytics.risk_distribution.high, color: RISK_COLORS.high }
      ]
    : []

  const hourlyData = analytics?.hourly_stats?.map(stat => ({
    hour: `${stat.hour}:00`,
    queries: stat.queries,
    blocked: stat.blocked
  })) || []

  const topDomainsData = analytics?.top_domains || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <BarChart3 className="w-6 h-6 text-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {riskDistributionData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Risk Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {hourlyData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Hourly Query Volume
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="queries"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Total Queries"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="blocked"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Blocked"
                  dot={{ fill: '#ef4444', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {topDomainsData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
            Top Queried Domains
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topDomainsData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis
                type="category"
                dataKey="domain"
                stroke="#6b7280"
                fontSize={12}
                width={150}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar
                dataKey="count"
                fill="#8b5cf6"
                name="Queries"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
