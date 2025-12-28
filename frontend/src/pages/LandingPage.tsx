import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface HealthStatus {
  status: string
  version: string
  uptime_seconds: number
  blocklist_size: number
}

// Launch date: February 1st, 2026
const LAUNCH_DATE = new Date('2026-02-01T00:00:00')

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const diff = targetDate.getTime() - now.getTime()
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / (1000 * 60)) % 60),
          seconds: Math.floor((diff / 1000) % 60)
        })
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  return timeLeft
}

export default function LandingPage({ onEnterDashboard }: { onEnterDashboard: () => void }) {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'router'>('ios')
  const countdown = useCountdown(LAUNCH_DATE)

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(r => r.json())
      .then(setHealth)
      .catch(() => {})
  }, [])

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    if (days > 0) return `${days}d ${hours}h`
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"
                    fill="currentColor"
                    fillOpacity={0.2}
                    stroke="currentColor"
                    strokeWidth={1.5}
                  />
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xl font-bold">Shield AI</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/punitmishra/shield-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>
              <button
                onClick={onEnterDashboard}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Open Dashboard
              </button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 py-20 text-center">
          {/* Launch Countdown */}
          <div className="mb-8">
            <p className="text-sm text-slate-500 uppercase tracking-wider mb-3">Launching February 1st, 2026</p>
            <div className="flex items-center justify-center gap-4">
              <div className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-2xl font-bold text-white">{countdown.days}</p>
                <p className="text-xs text-slate-500">Days</p>
              </div>
              <div className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-2xl font-bold text-white">{countdown.hours}</p>
                <p className="text-xs text-slate-500">Hours</p>
              </div>
              <div className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-2xl font-bold text-white">{countdown.minutes}</p>
                <p className="text-xs text-slate-500">Mins</p>
              </div>
              <div className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <p className="text-2xl font-bold text-white">{countdown.seconds}</p>
                <p className="text-xs text-slate-500">Secs</p>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {health?.status === 'healthy' ? 'Beta Available Now' : 'Connecting...'}
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-emerald-200 bg-clip-text text-transparent">
            AI-Powered DNS Protection
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Block ads, trackers, and malware at the DNS level. Ultra-fast resolution with
            real-time AI threat detection. Privacy-first, open source.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <button
              onClick={onEnterDashboard}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 transition-all text-white font-medium"
            >
              View Dashboard
            </button>
            <a
              href="#setup"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-white font-medium"
            >
              Get Started
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="p-4 rounded-2xl bg-slate-800/50">
              <p className="text-3xl font-bold text-white">&lt;1ms</p>
              <p className="text-sm text-slate-500">Avg Latency</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/50">
              <p className="text-3xl font-bold text-white">{health?.blocklist_size || '130'}+</p>
              <p className="text-sm text-slate-500">Blocked Domains</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/50">
              <p className="text-3xl font-bold text-white">100K+</p>
              <p className="text-sm text-slate-500">QPS Capacity</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-800/50">
              <p className="text-3xl font-bold text-emerald-400">{health ? formatUptime(health.uptime_seconds) : '—'}</p>
              <p className="text-sm text-slate-500">Uptime</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-12">Why Shield AI?</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Ultra-Fast Resolution</h3>
              <p className="text-slate-400 text-sm">Sub-millisecond DNS resolution with intelligent caching and edge deployment.</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Threat Detection</h3>
              <p className="text-slate-400 text-sm">Machine learning models detect DGA domains, phishing, and emerging threats in real-time.</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Privacy First</h3>
              <p className="text-slate-400 text-sm">No logs retained, encrypted queries with DoH/DoT, and open-source transparency.</p>
            </div>
          </div>
        </section>

        {/* Setup Instructions */}
        <section id="setup" className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-4">Get Started</h2>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
            Set up Shield AI on your devices in minutes. Choose your platform below.
          </p>

          {/* Quick Install - DNS Profile */}
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-white">Quick Setup for macOS & iOS</p>
                <p className="text-sm text-slate-400">Download and install the DNS profile to get protected instantly</p>
              </div>
              <a
                href="/ShieldAI-DNS.mobileconfig"
                download="ShieldAI-DNS.mobileconfig"
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-sm font-medium whitespace-nowrap"
              >
                Download Profile
              </a>
            </div>
          </div>

          {/* Platform tabs */}
          <div className="flex justify-center gap-2 mb-8">
            {(['ios', 'android', 'router'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'ios' ? 'iOS / macOS' : tab === 'android' ? 'Android' : 'Router'}
              </button>
            ))}
          </div>

          {/* Setup content */}
          <div className="max-w-2xl mx-auto">
            {activeTab === 'ios' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">1</span>
                    Install DNS Profile
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Download and install the DNS configuration profile. This works on both iOS and macOS.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href="/ShieldAI-DNS.mobileconfig"
                      download="ShieldAI-DNS.mobileconfig"
                      className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      Download DNS Profile
                    </a>
                    <a
                      href="https://expo.dev/@punitmishra/shield-ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm"
                    >
                      Or get the App (Preview)
                    </a>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">2</span>
                    Approve the Profile
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    After downloading:
                  </p>
                  <ul className="text-slate-400 text-sm space-y-2 ml-4">
                    <li><strong className="text-white">iOS:</strong> Go to Settings → General → VPN & Device Management → Install</li>
                    <li><strong className="text-white">macOS:</strong> Open System Settings → Privacy & Security → Profiles → Install</li>
                  </ul>
                  <div className="mt-4 bg-slate-900/50 rounded-lg p-4 font-mono text-sm">
                    <p className="text-slate-500 mb-2"># DoH Endpoint (for manual config)</p>
                    <p className="text-emerald-400">https://api.shields-ai.greplabs.com/dns-query</p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">3</span>
                    Verify Protection
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Test that DNS blocking is working:
                  </p>
                  <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-xs space-y-2">
                    <p className="text-slate-500"># Should be blocked (no IP returned)</p>
                    <p className="text-white">curl "https://api.shields-ai.greplabs.com/api/dns/resolve/doubleclick.net"</p>
                    <p className="text-slate-500 mt-3"># Should resolve normally</p>
                    <p className="text-white">curl "https://api.shields-ai.greplabs.com/api/dns/resolve/google.com"</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'android' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-sm flex items-center justify-center">1</span>
                    Download the APK
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Download Shield AI APK directly or from the Play Store.
                  </p>
                  <div className="flex items-center gap-4">
                    <a href="#" className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm">
                      Play Store (Coming Soon)
                    </a>
                    <a
                      href="https://expo.dev/@punitmishra/shield-ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm"
                    >
                      Expo Preview
                    </a>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-400 text-xs">Build Status: In Progress - Check Expo dashboard for latest APK</p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-sm flex items-center justify-center">2</span>
                    Configure Private DNS
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Go to Settings → Network & Internet → Private DNS and enter:
                  </p>
                  <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm">
                    <p className="text-emerald-400">api.shields-ai.greplabs.com</p>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-sm flex items-center justify-center">3</span>
                    Enable Protection
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Open the Shield AI app and tap the shield to enable protection. The app will run as a VPN service.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'router' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center">1</span>
                    Access Router Settings
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Log into your router's admin panel (usually 192.168.1.1 or 192.168.0.1).
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center">2</span>
                    Configure DNS Servers
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Find DNS settings and configure the following servers:
                  </p>
                  <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm space-y-2">
                    <div>
                      <p className="text-slate-500"># Primary (Cloudflare)</p>
                      <p className="text-purple-400">1.1.1.1</p>
                    </div>
                    <div>
                      <p className="text-slate-500"># Secondary (Google)</p>
                      <p className="text-purple-400">8.8.8.8</p>
                    </div>
                    <div className="pt-2 border-t border-slate-700">
                      <p className="text-slate-500"># DNS-over-HTTPS (if supported)</p>
                      <p className="text-purple-400">https://api.shields-ai.greplabs.com/dns-query</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center">3</span>
                    Apply & Restart
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Save settings and restart your router. All devices on your network will now be protected.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* API Section */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center mb-4">API Access</h2>
          <p className="text-slate-400 text-center mb-8">
            Integrate Shield AI into your applications with our REST API.
          </p>

          <div className="max-w-2xl mx-auto bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <span className="text-sm font-medium">API Endpoints</span>
              <span className="text-xs text-slate-500">api.shields-ai.greplabs.com</span>
            </div>
            <div className="divide-y divide-slate-700/30">
              <div className="px-6 py-3 flex items-center gap-4">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/20 text-emerald-400">GET</span>
                <span className="font-mono text-sm">/health</span>
                <span className="text-xs text-slate-500 ml-auto">Health check</span>
              </div>
              <div className="px-6 py-3 flex items-center gap-4">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/20 text-emerald-400">GET</span>
                <span className="font-mono text-sm">/api/stats</span>
                <span className="text-xs text-slate-500 ml-auto">Query statistics</span>
              </div>
              <div className="px-6 py-3 flex items-center gap-4">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/20 text-emerald-400">GET</span>
                <span className="font-mono text-sm">/api/dns/resolve/:domain</span>
                <span className="text-xs text-slate-500 ml-auto">DNS resolution</span>
              </div>
              <div className="px-6 py-3 flex items-center gap-4">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-emerald-500/20 text-emerald-400">GET</span>
                <span className="font-mono text-sm">/api/ml/analyze/:domain</span>
                <span className="text-xs text-slate-500 ml-auto">ML threat analysis</span>
              </div>
              <div className="px-6 py-3 flex items-center gap-4">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/20 text-blue-400">GET</span>
                <span className="font-mono text-sm">/dns-query</span>
                <span className="text-xs text-slate-500 ml-auto">DNS-over-HTTPS (RFC 8484)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" />
                </svg>
              </div>
              <span className="font-semibold">Shield AI</span>
              <span className="text-slate-500 text-sm">v{health?.version || '0.1.0'}</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="https://github.com/punitmishra/shield-ai" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
            </div>
            <p className="text-xs text-slate-600">Open Source DNS Protection</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
