import { useState } from 'react'
import { Search, AlertCircle, Shield, Activity, TrendingUp, Eye } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface DeepAnalysis {
  domain: string
  risk_score: number
  risk_level: string
  dga_detection?: {
    is_dga: boolean
    confidence: number
  }
  threat_category?: string
  ml_analysis?: {
    features?: Record<string, number>
    prediction?: string
    confidence?: number
  }
  threat_intel?: {
    category?: string
    severity?: string
    confidence?: number
  }
}

export default function RiskAnalyzer() {
  const [domain, setDomain] = useState('')
  const [analysis, setAnalysis] = useState<DeepAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getRiskColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'low':
      case 'safe':
        return 'bg-green-500'
      case 'medium':
      case 'moderate':
        return 'bg-yellow-500'
      case 'high':
      case 'critical':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getRiskTextColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'low':
      case 'safe':
        return 'text-green-700'
      case 'medium':
      case 'moderate':
        return 'text-yellow-700'
      case 'high':
      case 'critical':
        return 'text-red-700'
      default:
        return 'text-gray-700'
    }
  }

  const getRiskBgColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'low':
      case 'safe':
        return 'bg-green-50 border-green-200'
      case 'medium':
      case 'moderate':
        return 'bg-yellow-50 border-yellow-200'
      case 'high':
      case 'critical':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const analyzeDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!domain.trim()) return

    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch(`${API_BASE}/api/deep/${encodeURIComponent(domain.trim())}`)

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`)
      }

      const data = await response.json()
      setAnalysis(data)
    } catch (err) {
      console.error('Failed to analyze domain:', err)
      setError('Failed to analyze domain. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Domain Risk Analyzer</h2>
        <Shield className="w-6 h-6 text-blue-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={analyzeDomain} className="space-y-4">
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Enter Domain to Analyze
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <button
                type="submit"
                disabled={loading || !domain.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Activity className="w-5 h-5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Analyze</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {analysis && (
          <div className="mt-6 space-y-4">
            <div className={`rounded-xl border-2 p-6 ${getRiskBgColor(analysis.risk_level)}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{analysis.domain}</h3>
                  <p className="text-sm text-gray-500 mt-1">Risk Assessment Results</p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${getRiskColor(analysis.risk_level)} text-white`}>
                    {analysis.risk_level.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-white bg-opacity-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Risk Score</span>
                    <span className={`text-2xl font-bold ${getRiskTextColor(analysis.risk_level)}`}>
                      {(analysis.risk_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getRiskColor(analysis.risk_level)}`}
                      style={{ width: `${analysis.risk_score * 100}%` }}
                    />
                  </div>
                </div>

                {analysis.threat_category && (
                  <div className="bg-white bg-opacity-50 rounded-lg p-4">
                    <span className="text-sm text-gray-600">Threat Category</span>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {analysis.threat_category}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {analysis.dga_detection && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Eye className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">DGA Detection</h4>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    analysis.dga_detection.is_dga ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {analysis.dga_detection.is_dga ? 'DGA Detected' : 'Not DGA'}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Confidence</span>
                  <span className="font-semibold text-gray-900">
                    {(analysis.dga_detection.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {analysis.ml_analysis && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">ML Analysis</h4>
                </div>
                <div className="space-y-2">
                  {analysis.ml_analysis.prediction && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Prediction</span>
                      <span className="font-semibold text-gray-900">{analysis.ml_analysis.prediction}</span>
                    </div>
                  )}
                  {analysis.ml_analysis.confidence !== undefined && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Confidence</span>
                      <span className="font-semibold text-gray-900">
                        {(analysis.ml_analysis.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {analysis.threat_intel && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center space-x-3 mb-3">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-gray-900">Threat Intelligence</h4>
                </div>
                <div className="space-y-2">
                  {analysis.threat_intel.category && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Category</span>
                      <span className="font-semibold text-gray-900">{analysis.threat_intel.category}</span>
                    </div>
                  )}
                  {analysis.threat_intel.severity && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Severity</span>
                      <span className={`font-semibold ${getRiskTextColor(analysis.threat_intel.severity)}`}>
                        {analysis.threat_intel.severity}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
