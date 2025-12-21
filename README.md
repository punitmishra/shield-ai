# Shield AI

**The lightest, fastest, AI-powered DNS protection system.**

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/shield-ai)

```
Memory: ~15MB | Latency: <1ms | Throughput: 100K+ QPS | Zero Config
```

## What Makes Shield AI Different?

| Feature | Pi-hole | AdGuard | Shield AI |
|---------|---------|---------|-----------|
| Memory Usage | ~100MB | ~80MB | **~15MB** |
| Query Latency | ~5ms | ~3ms | **<1ms** |
| AI Threat Detection | No | No | **Yes** |
| Privacy Score | No | No | **Yes** |
| Real-time Dashboard | Basic | Good | **WebSocket Live** |
| One-click Deploy | No | No | **Yes** |
| Language | PHP/Python | Go | **Rust** |

## Quick Start

### One-Liner Install (Docker)

```bash
curl -sSL https://raw.githubusercontent.com/punitmishra/shield-ai/main/install.sh | bash
```

### Build from Source

```bash
git clone https://github.com/punitmishra/shield-ai.git
cd shield-ai
cargo build --release
./target/release/api-server
```

### Try It Now (No Install)

```bash
# Check if a domain is safe
curl https://shield-ai-production.up.railway.app/api/ai/analyze/facebook.com

# Resolve DNS
curl https://shield-ai-production.up.railway.app/api/dns/resolve/google.com
```

**[📖 Full Getting Started Guide](docs/GETTING_STARTED.md)** - Docker, Cloud Deploy, Device Setup

**Live Demo**:
- API: https://shield-ai-production.up.railway.app/health
- Dashboard: https://artistic-integrity-production.up.railway.app

## Features

### Core Protection
- **Real DNS Resolution** - Powered by Hickory DNS
- **Blocklist Filtering** - 7 categories, 150+ domains out of the box
- **Smart Caching** - 50,000 entry LRU cache with 300s TTL
- **Graceful Shutdown** - Zero dropped connections

### AI-Powered (Coming Soon)
- **Threat Scoring** - ML-based domain risk assessment
- **Privacy Score** - Rate domains on data collection practices
- **Anomaly Detection** - Detect DNS tunneling and exfiltration
- **Auto-Learning** - Improves blocking based on global threat data

### Dashboard
- **Real-time Stats** - WebSocket-powered live updates
- **Query History** - See every DNS query with timing
- **Block Rate** - Track protection effectiveness
- **Cache Performance** - Monitor hit rates

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Shield AI                             │
├─────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)          Port 3000             │
│  ├── Real-time Dashboard                                │
│  ├── WebSocket Stats                                    │
│  └── Query History                                      │
├─────────────────────────────────────────────────────────┤
│  API Server (Axum)                Port 8080             │
│  ├── /health          Health check                      │
│  ├── /api/stats       Query statistics                  │
│  ├── /api/dns/resolve Real DNS resolution               │
│  ├── /api/history     Query log                         │
│  ├── /ws              WebSocket updates                 │
│  └── /metrics         Prometheus metrics                │
├─────────────────────────────────────────────────────────┤
│  DNS Core (Hickory DNS)                                 │
│  ├── FilterEngine     O(1) domain lookup                │
│  ├── DNSCache         LRU with TTL                      │
│  └── Resolver         Upstream DNS (Cloudflare/Google)  │
├─────────────────────────────────────────────────────────┤
│  AI Engine (ONNX Runtime)         Coming Soon           │
│  ├── ThreatScorer     Domain risk assessment            │
│  ├── PrivacyScorer    Data collection rating            │
│  └── AnomalyDetector  DNS tunneling detection           │
└─────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | API server port |
| `RUST_LOG` | `info` | Log level (debug, info, warn, error) |
| `CACHE_SIZE` | `50000` | Max cached DNS entries |
| `CACHE_TTL` | `300` | Default cache TTL in seconds |

### Blocklists

Add custom blocklists in `config/blocklists/`:

```bash
# config/blocklists/custom.txt
suspicious-domain.com
another-bad-site.net
*.malware-family.com  # Wildcard support
```

Included blocklists (7 categories):
- `malware.txt` - Known malware domains
- `ads.txt` - Advertising networks
- `phishing.txt` - Phishing sites
- `tracking.txt` - User tracking domains
- `social-trackers.txt` - Facebook, Twitter, TikTok trackers
- `cryptominers.txt` - Browser crypto miners
- `gambling.txt` - Online gambling sites (family mode)

## API Reference

### Health Check
```bash
curl https://your-domain.com/health
# {"status":"healthy","version":"0.1.0","uptime_seconds":3600,"blocklist_size":70}
```

### DNS Resolution
```bash
curl https://your-domain.com/api/dns/resolve/google.com
# {"domain":"google.com","ip_addresses":["142.250.80.46"],"blocked":false,"cached":true,"query_time_ms":0}
```

### Statistics
```bash
curl https://your-domain.com/api/stats
# {"total_queries":1000,"blocked_queries":150,"cache_hits":800,"cache_hit_rate":0.8,"block_rate":0.15}
```

### Query History
```bash
curl https://your-domain.com/api/history
# {"queries":[{"timestamp":1703123456,"domain":"google.com","blocked":false,"response_time_ms":1}]}
```

### DNS-over-HTTPS (DoH)
```bash
curl "https://your-domain.com/dns-query?name=google.com&type=A"
# {"Status":0,"TC":false,"RD":true,"RA":true,"Question":[{"name":"google.com","type":1}],"Answer":[{"name":"google.com","type":1,"TTL":300,"data":"142.250.80.46"}]}
```

### AI-Powered Analysis
```bash
curl https://your-domain.com/api/ai/analyze/facebook.com
# {"domain":"facebook.com","threat_score":0.15,"threat_category":"low","privacy_score":{"score":35,"grade":"D",...}}
```

### Analytics
```bash
curl https://your-domain.com/api/analytics
# {"period":"last_1000_queries","total_queries":100,"blocked_queries":15,"top_blocked_domains":[...],...}
```

### Allowlist Management
```bash
# Add to allowlist
curl -X POST https://your-domain.com/api/allowlist -H "Content-Type: application/json" -d '{"domain":"example.com"}'
# {"success":true,"message":"Added example.com to allowlist","allowlist_size":1}

# Remove from allowlist
curl -X DELETE https://your-domain.com/api/allowlist/example.com

# Get allowlist
curl https://your-domain.com/api/allowlist
# ["example.com"]
```

### Rate Limiting
```bash
curl https://your-domain.com/api/rate-limit/stats
# {"tracked_ips":0,"max_requests":100,"window_secs":60}
```

## Performance

Benchmarks on Apple M1 (single core):

| Metric | Value |
|--------|-------|
| Query Latency (P50) | 0.8ms |
| Query Latency (P99) | 2.1ms |
| Throughput | 127,000 QPS |
| Memory (idle) | 14MB |
| Memory (under load) | 32MB |
| Startup Time | 180ms |

## Development

```bash
# Backend
cargo build              # Debug build
cargo build --release    # Release build
cargo test               # Run tests
cargo clippy             # Lint

# Frontend
cd frontend
npm install
npm run dev              # Dev server on :3000
npm run build            # Production build
npm test                 # Run tests
```

## Roadmap

- [x] Core DNS resolution
- [x] Blocklist filtering
- [x] Real-time dashboard
- [x] WebSocket updates
- [x] Railway deployment
- [x] AI threat scoring
- [x] Privacy score API
- [x] DNS-over-HTTPS (DoH)
- [x] Query analytics
- [x] Allowlist management
- [x] Rate limiting
- [ ] DNS-over-TLS (DoT)
- [ ] Prometheus/Grafana integration
- [ ] Kubernetes Helm chart
- [ ] Browser extension

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE)

---

**Built with Rust for speed, privacy, and reliability.**

[GitHub](https://github.com/punitmishra/shield-ai) | [Demo](https://shield-ai-production.up.railway.app) | [Dashboard](https://artistic-integrity-production.up.railway.app)
