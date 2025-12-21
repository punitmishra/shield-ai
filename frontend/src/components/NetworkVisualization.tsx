import { useState, useEffect, useRef, useCallback } from 'react'
import { Network, Zap, AlertTriangle, RefreshCw } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface Node {
  id: string
  label: string
  type: 'client' | 'domain' | 'upstream'
  blocked: boolean
  threat_score?: number
  query_count: number
  x?: number
  y?: number
}

interface Edge {
  source: string
  target: string
  count: number
}

interface NetworkVisualizationProps {
  className?: string
}

export default function NetworkVisualization({ className = '' }: NetworkVisualizationProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  const initializePositions = useCallback((nodeList: Node[]) => {
    const positions = new Map<string, { x: number; y: number }>()
    const width = 700
    const height = 500

    nodeList.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodeList.length
      const radius = node.type === 'client' ? 100 : 200
      positions.set(node.id, {
        x: width / 2 + radius * Math.cos(angle) + (Math.random() - 0.5) * 50,
        y: height / 2 + radius * Math.sin(angle) + (Math.random() - 0.5) * 50
      })
    })

    positionsRef.current = positions
  }, [])

  useEffect(() => {
    const fetchNetworkData = async () => {
      try {
        setLoading(true)
        const historyRes = await fetch(`${API_BASE}/api/history`)
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          generateNetworkFromHistory(historyData.queries || [])
        } else {
          setNodes([])
          setEdges([])
        }
      } catch {
        setNodes([])
        setEdges([])
      } finally {
        setLoading(false)
      }
    }

    fetchNetworkData()
    const interval = setInterval(fetchNetworkData, 10000)
    return () => clearInterval(interval)
  }, [])

  const generateNetworkFromHistory = (queries: Array<{ client_ip: string; domain: string; blocked: boolean; threat_score?: number }>) => {
    const domainCounts = new Map<string, { blocked: boolean; count: number; threat_score?: number }>()
    const clientSet = new Set<string>()

    queries.forEach(q => {
      clientSet.add(q.client_ip)
      const current = domainCounts.get(q.domain)
      if (current) {
        current.count++
      } else {
        domainCounts.set(q.domain, {
          blocked: q.blocked,
          count: 1,
          threat_score: q.threat_score
        })
      }
    })

    const nodeList: Node[] = [
      ...Array.from(clientSet).slice(0, 5).map(ip => ({
        id: `client-${ip}`,
        label: ip,
        type: 'client' as const,
        blocked: false,
        query_count: queries.filter(q => q.client_ip === ip).length
      })),
      ...Array.from(domainCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15)
        .map(([domain, data]) => ({
          id: `domain-${domain}`,
          label: domain.length > 25 ? domain.slice(0, 22) + '...' : domain,
          type: 'domain' as const,
          blocked: data.blocked,
          threat_score: data.threat_score,
          query_count: data.count
        }))
    ]

    const edgeMap = new Map<string, Edge>()
    queries.slice(0, 100).forEach(q => {
      const key = `${q.client_ip}-${q.domain}`
      const existing = edgeMap.get(key)
      if (existing) {
        existing.count++
      } else {
        edgeMap.set(key, {
          source: `client-${q.client_ip}`,
          target: `domain-${q.domain}`,
          count: 1
        })
      }
    })

    setNodes(nodeList)
    setEdges(Array.from(edgeMap.values()))
    initializePositions(nodeList)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || nodes.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#f9fafb'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw edges
      edges.forEach(edge => {
        const sourcePos = positionsRef.current.get(edge.source)
        const targetPos = positionsRef.current.get(edge.target)
        if (sourcePos && targetPos) {
          ctx.strokeStyle = '#d1d5db'
          ctx.lineWidth = Math.min(edge.count, 4)
          ctx.beginPath()
          ctx.moveTo(sourcePos.x, sourcePos.y)
          ctx.lineTo(targetPos.x, targetPos.y)
          ctx.stroke()
        }
      })

      // Draw nodes
      nodes.forEach(node => {
        const pos = positionsRef.current.get(node.id)
        if (!pos) return

        const radius = Math.max(8, Math.min(20, 5 + node.query_count / 10))

        ctx.beginPath()
        ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI)

        if (node.type === 'client') {
          ctx.fillStyle = '#3b82f6'
        } else if (node.blocked) {
          ctx.fillStyle = '#ef4444'
        } else if (node.threat_score && node.threat_score > 0.5) {
          ctx.fillStyle = '#f59e0b'
        } else {
          ctx.fillStyle = '#10b981'
        }

        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()

        // Labels for larger nodes
        if (node.query_count > 3) {
          ctx.fillStyle = '#374151'
          ctx.font = '11px system-ui'
          ctx.textAlign = 'center'
          ctx.fillText(node.label, pos.x, pos.y + radius + 14)
        }
      })
    }

    draw()
  }, [nodes, edges])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    let clicked: Node | null = null
    let minDist = Infinity

    nodes.forEach(node => {
      const pos = positionsRef.current.get(node.id)
      if (pos) {
        const dist = Math.sqrt((pos.x - x) ** 2 + (pos.y - y) ** 2)
        if (dist < 25 && dist < minDist) {
          minDist = dist
          clicked = node
        }
      }
    })

    setSelectedNode(clicked)
  }

  const refreshData = async () => {
    setLoading(true)
    try {
      const historyRes = await fetch(`${API_BASE}/api/history`)
      if (historyRes.ok) {
        const historyData = await historyRes.json()
        generateNetworkFromHistory(historyData.queries || [])
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Network className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Network Visualization</h2>
              <p className="text-sm text-gray-500">Real-time DNS query graph</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600">Clients</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-gray-600">Allowed</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-600">Blocked</span>
              </div>
            </div>
            <button
              onClick={refreshData}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              disabled={loading}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading && nodes.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <Zap className="w-8 h-8 text-blue-500 animate-pulse" />
            <span className="ml-3 text-gray-600">Loading network data...</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Network className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No network data available</p>
            <p className="text-sm mt-2">Query data will appear here as DNS requests are made</p>
          </div>
        ) : (
          <div className="flex gap-6">
            <div className="flex-1">
              <canvas
                ref={canvasRef}
                width={700}
                height={500}
                onClick={handleCanvasClick}
                className="border border-gray-200 rounded-lg cursor-pointer bg-gray-50 w-full"
              />
            </div>

            {selectedNode && (
              <div className="w-64 bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Node Details</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-medium capitalize">{selectedNode.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Label:</span>
                    <p className="font-medium break-all mt-1">{selectedNode.label}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Queries:</span>
                    <span className="ml-2 font-medium">{selectedNode.query_count}</span>
                  </div>
                  {selectedNode.blocked && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Blocked
                      </span>
                    </div>
                  )}
                  {selectedNode.threat_score !== undefined && selectedNode.threat_score > 0 && (
                    <div>
                      <span className="text-gray-500">Threat Score:</span>
                      <span className={`ml-2 font-medium ${selectedNode.threat_score > 0.5 ? 'text-orange-600' : 'text-gray-600'}`}>
                        {(selectedNode.threat_score * 100).toFixed(0)}%
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
