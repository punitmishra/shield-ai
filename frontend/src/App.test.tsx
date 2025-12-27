import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  readyState = 1
  close = vi.fn()
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('renders loading state initially', () => {
    // Mock fetch to delay response
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(<App />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders the header after loading', async () => {
    // Mock successful API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            total_queries: 1000,
            blocked_queries: 50,
            cache_hits: 800,
            cache_misses: 200,
            cache_hit_rate: 0.8,
            block_rate: 0.05,
          }),
        })
      }
      if (url.includes('/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'healthy',
            version: '1.0.0',
            uptime_seconds: 3600,
          }),
        })
      }
      if (url.includes('/api/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ queries: [] }),
        })
      }
      return Promise.reject(new Error('Not found'))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getAllByText('Shield AI')[0]).toBeInTheDocument()
    })
  })

  it('displays stats cards after loading', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            total_queries: 1000,
            blocked_queries: 50,
            cache_hits: 800,
            cache_misses: 200,
            cache_hit_rate: 0.8,
            block_rate: 0.05,
          }),
        })
      }
      if (url.includes('/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'healthy',
            version: '1.0.0',
            uptime_seconds: 3600,
          }),
        })
      }
      if (url.includes('/api/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ queries: [] }),
        })
      }
      return Promise.reject(new Error('Not found'))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Queries')).toBeInTheDocument()
      expect(screen.getByText('Blocked')).toBeInTheDocument()
      expect(screen.getByText('Cached')).toBeInTheDocument()
    })
  })

  it('shows healthy status badge', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            total_queries: 0,
            blocked_queries: 0,
            cache_hits: 0,
            cache_misses: 0,
            cache_hit_rate: 0,
            block_rate: 0,
          }),
        })
      }
      if (url.includes('/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'healthy',
            version: '1.0.0',
            uptime_seconds: 3600,
          }),
        })
      }
      if (url.includes('/api/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ queries: [] }),
        })
      }
      return Promise.reject(new Error('Not found'))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Healthy')).toBeInTheDocument()
    })
  })

  it('displays footer text', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            total_queries: 0,
            blocked_queries: 0,
            cache_hits: 0,
            cache_misses: 0,
            cache_hit_rate: 0,
            block_rate: 0,
          }),
        })
      }
      if (url.includes('/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'healthy',
            version: '1.0.0',
            uptime_seconds: 3600,
          }),
        })
      }
      if (url.includes('/api/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ queries: [] }),
        })
      }
      return Promise.reject(new Error('Not found'))
    })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('AI-Powered DNS Protection')).toBeInTheDocument()
    })
  })
})
