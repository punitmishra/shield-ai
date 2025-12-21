import { useState, useEffect, useRef, useCallback } from 'react'
import { Network, RefreshCw, AlertTriangle, Shield, Ban, Activity } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface DNSNode {
  id: string
  label: string
  type: 'client' | 'server' | 'domain'
  x: number
  y: number
  vx: number
  vy: number
  status: 'allowed' | 'blocked' | 'monitored'
  riskScore?: number
  queryCount: number
}

interface DNSLink {
  source: string
  target: string
  status: 'allowed' | 'blocked' | 'monitored'
  count: number
}

interface QueryData {
  domain: string
  client_ip: string
  blocked: boolean
  threat_score?: number
  timestamp: number
}

interface NetworkGraphProps {
  className?: string
}

export default function NetworkGraph({ className = '' }: NetworkGraphProps) {
  const [nodes, setNodes] = useState<DNSNode[]>([])
  const [links, setLinks] = useState<DNSLink[]>([])
  const [hoveredNode, setHoveredNode] = useState<DNSNode | null>(null)
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const wsRef = useRef<WebSocket | null>(null)
  const queryCacheRef = useRef<QueryData[]>([])

  const WIDTH = 800
  const HEIGHT = 600
  const SERVER_X = WIDTH / 2
  const SERVER_Y = HEIGHT / 2

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
        console.log('NetworkGraph WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'query' || data.domain) {
            const queryData: QueryData = {
              domain: data.domain || 'unknown',
              client_ip: data.client_ip || '0.0.0.0',
              blocked: data.blocked || false,
              threat_score: data.threat_score,
              timestamp: data.timestamp || Date.now() / 1000
            }
            queryCacheRef.current = [queryData, ...queryCacheRef.current].slice(0, 100)
            updateGraphFromQueries(queryCacheRef.current)
          }
        } catch (err) {
          console.error('WebSocket message parse error:', err)
        }
      }

      ws.onclose = () => {
        wsRef.current = null
        setTimeout(connectWebSocket, 3000)
      }

      wsRef.current = ws
    } catch (err) {
      console.error('WebSocket connection error:', err)
    }
  }, [])

  const updateGraphFromQueries = useCallback((queries: QueryData[]) => {
    const clientMap = new Map<string, { count: number; blocked: number }>()
    const domainMap = new Map<string, { count: number; blocked: boolean; riskScore?: number }>()
    const linkMap = new Map<string, { count: number; status: 'allowed' | 'blocked' | 'monitored' }>()

    queries.forEach(q => {
      const clientData = clientMap.get(q.client_ip) || { count: 0, blocked: 0 }
      clientData.count++
      if (q.blocked) clientData.blocked++
      clientMap.set(q.client_ip, clientData)

      const domainData = domainMap.get(q.domain) || { count: 0, blocked: false, riskScore: 0 }
      domainData.count++
      if (q.blocked) domainData.blocked = true
      if (q.threat_score !== undefined && q.threat_score > (domainData.riskScore || 0)) {
        domainData.riskScore = q.threat_score
      }
      domainMap.set(q.domain, domainData)

      const linkKey = `${q.client_ip}-${q.domain}`
      const linkData = linkMap.get(linkKey) || { count: 0, status: 'allowed' as const }
      linkData.count++
      if (q.blocked) {
        linkData.status = 'blocked'
      } else if (q.threat_score && q.threat_score > 0.5) {
        linkData.status = 'monitored'
      }
      linkMap.set(linkKey, linkData)
    })

    const newNodes: DNSNode[] = []

    newNodes.push({
      id: 'dns-server',
      label: 'DNS Server',
      type: 'server',
      x: SERVER_X,
      y: SERVER_Y,
      vx: 0,
      vy: 0,
      status: 'allowed',
      queryCount: queries.length
    })

    const topClients = Array.from(clientMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)

    topClients.forEach(([ip, data], idx) => {
      const angle = (Math.PI / 2) + (idx - 2) * (Math.PI / 6)
      newNodes.push({
        id: `client-${ip}`,
        label: ip.split('.').slice(-2).join('.'),
        type: 'client',
        x: SERVER_X - 250 + Math.cos(angle) * 80,
        y: SERVER_Y + Math.sin(angle) * 80,
        vx: 0,
        vy: 0,
        status: data.blocked > 0 ? 'monitored' : 'allowed',
        queryCount: data.count
      })
    })

    const topDomains = Array.from(domainMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)

    topDomains.forEach(([domain, data], idx) => {
      const angle = (idx - 4.5) * (Math.PI / 11)
      const radius = 250
      newNodes.push({
        id: `domain-${domain}`,
        label: domain.length > 20 ? domain.substring(0, 17) + '...' : domain,
        type: 'domain',
        x: SERVER_X + radius + Math.cos(angle) * 80,
        y: SERVER_Y + Math.sin(angle) * 100,
        vx: 0,
        vy: 0,
        status: data.blocked ? 'blocked' : (data.riskScore && data.riskScore > 0.5 ? 'monitored' : 'allowed'),
        riskScore: data.riskScore,
        queryCount: data.count
      })
    })

    const newLinks: DNSLink[] = []
    linkMap.forEach((data, key) => {
      const [clientIp, domain] = key.split('-')
      const sourceId = `client-${clientIp}`
      const targetId = `domain-${domain}`

      if (newNodes.find(n => n.id === sourceId) && newNodes.find(n => n.id === targetId)) {
        newLinks.push({
          source: sourceId,
          target: targetId,
          status: data.status,
          count: data.count
        })
      }
    })

    setNodes(newNodes)
    setLinks(newLinks)
  }, [])

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE}/api/history`)
        if (response.ok) {
          const data = await response.json()
          const queries = data.queries || []
          queryCacheRef.current = queries.slice(0, 100)
          updateGraphFromQueries(queries)
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
    connectWebSocket()

    return () => {
      if (wsRef.current) wsRef.current.close()
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [connectWebSocket, updateGraphFromQueries])

  useEffect(() => {
    if (nodes.length === 0) return

    const animate = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return

      ctx.clearRect(0, 0, WIDTH, HEIGHT)
      ctx.fillStyle = '#f9fafb'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 0.5
      for (let x = 0; x < WIDTH; x += 50) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, HEIGHT)
        ctx.stroke()
      }
      for (let y = 0; y < HEIGHT; y += 50) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(WIDTH, y)
        ctx.stroke()
      }

      links.forEach(link => {
        const source = nodes.find(n => n.id === link.source)
        const target = nodes.find(n => n.id === link.target)
        if (!source || !target) return

        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(SERVER_X, SERVER_Y)
        ctx.strokeStyle = link.status === 'blocked' ? '#ef4444' :
                         link.status === 'monitored' ? '#f59e0b' : '#d1d5db'
        ctx.lineWidth = Math.min(link.count / 2, 4)
        ctx.globalAlpha = 0.6
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(SERVER_X, SERVER_Y)
        ctx.lineTo(target.x, target.y)
        ctx.stroke()
        ctx.globalAlpha = 1
      })

      nodes.forEach(node => {
        const isHovered = hoveredNode?.id === node.id
        const radius = node.type === 'server' ? 20 :
                      (isHovered ? 16 : 12 + Math.min(node.queryCount / 10, 8))

        ctx.beginPath()
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)

        if (node.type === 'server') {
          ctx.fillStyle = '#3b82f6'
        } else if (node.status === 'blocked') {
          ctx.fillStyle = '#ef4444'
        } else if (node.status === 'monitored') {
          ctx.fillStyle = '#f59e0b'
        } else {
          ctx.fillStyle = node.type === 'client' ? '#6366f1' : '#10b981'
        }

        ctx.fill()
        ctx.strokeStyle = isHovered ? '#1f2937' : '#ffffff'
        ctx.lineWidth = isHovered ? 3 : 2
        ctx.stroke()

        ctx.fillStyle = '#374151'
        ctx.font = isHovered ? 'bold 12px system-ui' : '11px system-ui'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(node.label, node.x, node.y + radius + 6)

        if (node.queryCount > 5) {
          const badgeX = node.x + radius - 8
          const badgeY = node.y - radius + 2
          ctx.beginPath()
          ctx.arc(badgeX, badgeY, 10, 0, 2 * Math.PI)
          ctx.fillStyle = '#1f2937'
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 9px system-ui'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(node.queryCount > 99 ? '99+' : node.queryCount.toString(), badgeX, badgeY)
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [nodes, links, hoveredNode])

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    let found: DNSNode | null = null
    for (const node of nodes) {
      const radius = node.type === 'server' ? 20 : 12 + Math.min(node.queryCount / 10, 8)
      const dist = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2)
      if (dist <= radius) {
        found = node
        break
      }
    }

    setHoveredNode(found)
  }

  const handleMouseLeave = () => {
    setHoveredNode(null)
  }

  const refreshData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/history`)
      if (response.ok) {
        const data = await response.json()
        queryCacheRef.current = data.queries || []
        updateGraphFromQueries(data.queries || [])
      }
    } catch (err) {
      console.error('Refresh failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Network className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Network Graph</h2>
              <p className="text-sm text-gray-500">Real-time DNS query visualization</p>
            </div>
          </div>
          <button
            onClick={refreshData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">Allowed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">Blocked</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-600">Monitored</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-gray-600">Clients</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600">DNS Server</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading && nodes.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
            <span className="ml-3 text-gray-600">Loading network data...</span>
          </div>
        ) : (
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="border border-gray-200 rounded-lg cursor-pointer w-full"
              style={{ maxWidth: '100%', height: 'auto' }}
            />

            {hoveredNode && (
              <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-64">
                <div className="flex items-center space-x-2 mb-3">
                  {hoveredNode.type === 'client' && <Activity className="w-5 h-5 text-indigo-500" />}
                  {hoveredNode.type === 'server' && <Shield className="w-5 h-5 text-blue-500" />}
                  {hoveredNode.type === 'domain' && (
                    hoveredNode.status === 'blocked' ?
                      <Ban className="w-5 h-5 text-red-500" /> :
                      <Shield className="w-5 h-5 text-green-500" />
                  )}
                  <h3 className="font-semibold text-gray-900 capitalize">{hoveredNode.type}</h3>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <p className="font-medium text-gray-900 break-all">{hoveredNode.label}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Queries:</span>
                    <span className="ml-2 font-medium text-gray-900">{hoveredNode.queryCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                      hoveredNode.status === 'blocked' ? 'bg-red-100 text-red-700' :
                      hoveredNode.status === 'monitored' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {hoveredNode.status}
                    </span>
                  </div>
                  {hoveredNode.riskScore !== undefined && hoveredNode.riskScore > 0 && (
                    <div>
                      <span className="text-gray-500">Risk Score:</span>
                      <div className="flex items-center mt-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              hoveredNode.riskScore > 0.7 ? 'bg-red-500' :
                              hoveredNode.riskScore > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${hoveredNode.riskScore * 100}%` }}
                          />
                        </div>
                        <span className="ml-2 font-medium text-gray-900">
                          {(hoveredNode.riskScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {hoveredNode.status === 'blocked' && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-start space-x-2 text-xs text-red-600">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>This domain has been blocked due to security policy</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
