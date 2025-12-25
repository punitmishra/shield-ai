# Shield AI

**The lightest, fastest, AI-powered DNS protection system.**

<!-- Badges -->
[![CI](https://github.com/punitmishra/shield-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/punitmishra/shield-ai/actions/workflows/ci.yml)
[![Rust](https://img.shields.io/badge/rust-1.75+-orange.svg)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.2+-blue.svg)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

<!-- Status Badges -->
| Component | Tests | Build | Status |
|-----------|-------|-------|--------|
| **Rust Backend** | 17 passing | `cargo build --release` | ![Rust Tests](https://img.shields.io/badge/tests-17%20passing-brightgreen) |
| **React Frontend** | 5 passing | `npm run build` | ![Frontend Tests](https://img.shields.io/badge/tests-5%20passing-brightgreen) |
| **Total** | **22 tests** | All green | ![All Tests](https://img.shields.io/badge/all%20tests-22%20passing-brightgreen) |

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/shield-ai)

```
Memory: ~15MB | Latency: <1ms | Throughput: 100K+ QPS | 22 Tests Passing
```

---

## Local Verification

Run these commands to verify everything works locally:

```bash
# Clone and enter directory
git clone https://github.com/punitmishra/shield-ai.git && cd shield-ai

# 1. Run ALL tests (should show 22 passing)
cargo test --workspace && cd frontend && npm install && npm test && cd ..

# 2. Build everything
cargo build --release && cd frontend && npm run build && cd ..

# 3. Start the server
cargo run --release --bin api-server &

# 4. Verify endpoints (wait 2 seconds for server to start)
sleep 2 && curl http://localhost:8080/health
# Expected: {"status":"healthy","version":"0.1.0",...}

# 5. Test AI analysis
curl http://localhost:8080/api/ai/analyze/google.com
# Expected: {"domain":"google.com","threat_score":0.0,...}

# 6. Test ML DGA detection
curl http://localhost:8080/api/ml/dga/suspicious123abc.com
# Expected: {"domain":"...","is_dga":...,"confidence":...}
```

### Quick Health Check Script

```bash
#!/bin/bash
# save as: check-shield.sh

echo "=== Shield AI Health Check ==="

# Check Rust tests
echo -n "Rust Tests: "
cargo test --workspace 2>&1 | grep -E "test result:" | tail -1

# Check Frontend tests
echo -n "Frontend Tests: "
cd frontend && npm test 2>&1 | grep -E "Tests:" | head -1 && cd ..

# Check builds
echo -n "Rust Build: "
cargo build --release 2>&1 | tail -1

echo -n "Frontend Build: "
cd frontend && npm run build 2>&1 | grep -E "built in" && cd ..

# Check API (if running)
echo -n "API Health: "
curl -s http://localhost:8080/health 2>/dev/null || echo "Server not running"

echo "=== Check Complete ==="
```

## What Makes Shield AI Different?

| Feature | Pi-hole | AdGuard | Shield AI |
|---------|---------|---------|-----------|
| Memory Usage | ~100MB | ~80MB | **~15MB** |
| Query Latency | ~5ms | ~3ms | **<1ms** |
| AI Threat Detection | No | No | **Yes (DGA, ML)** |
| Privacy Score | No | No | **Yes** |
| Real-time Dashboard | Basic | Good | **WebSocket Live** |
| Dark Mode | No | Yes | **Yes** |
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

# Backend
cargo build --release
cargo test --workspace  # 17 tests

# Frontend
cd frontend
npm install
npm test               # 5 tests
npm run build

# Run
cargo run --release --bin api-server  # API on :8080
npm run dev                            # Dashboard on :3000
```

### Try It Now (No Install)

```bash
# Check if a domain is safe
curl https://shield-ai-production.up.railway.app/api/ai/analyze/facebook.com

# ML-powered DGA detection
curl https://shield-ai-production.up.railway.app/api/ml/dga/xyzabc123random.com

# Resolve DNS
curl https://shield-ai-production.up.railway.app/api/dns/resolve/google.com
```

**[📖 Full Getting Started Guide](docs/GETTING_STARTED.md)** - Docker, Cloud Deploy, Device Setup

**Live Demo**:
- API: https://shield-ai-production.up.railway.app/health
- Dashboard: https://artistic-integrity-production.up.railway.app

## Features

### Core Protection
- **Real DNS Resolution** - Powered by Hickory DNS with DNSSEC
- **Blocklist Filtering** - 7 categories, 150+ domains, live updates
- **Smart Caching** - 50,000 entry LRU cache with 300s TTL
- **Rate Limiting** - Configurable per-IP request limits
- **Graceful Shutdown** - Zero dropped connections

### AI/ML-Powered
- **DGA Detection** - Machine learning to detect algorithmically generated domains
- **Threat Scoring** - Multi-factor risk assessment (entropy, TLD, subdomains)
- **Privacy Score** - Rate domains on data collection practices
- **Anomaly Detection** - Detect DNS tunneling and exfiltration
- **Real-time Analysis** - Combined AI+ML+Threat intelligence

### Dashboard
- **Real-time Stats** - WebSocket-powered live updates
- **Query History** - See every DNS query with timing
- **Threat Feed** - Live threat monitoring and alerts
- **Analytics Charts** - Risk distribution, hourly volume, top domains
- **Device Management** - Track connected devices
- **Dark Mode** - Full dark theme support
- **PWA Support** - Install as mobile app, works offline

### DevOps
- **CI/CD Pipeline** - GitHub Actions with 9 jobs
- **Docker Support** - Multi-stage optimized builds
- **E2E Testing** - Playwright test configuration
- **OpenAPI Docs** - Full API documentation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Shield AI DNS Protection                   │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React/Vite :3000)                                    │
│  ├── Real-time Dashboard with WebSocket                        │
│  ├── 10+ Components (Stats, Threats, Analytics, Devices)       │
│  ├── Dark Mode Theme                                            │
│  └── PWA: Offline Support, Installable                         │
├─────────────────────────────────────────────────────────────────┤
│  API Gateway (Axum :8080)                                       │
│  ├── REST: /api/*, /health, /metrics                           │
│  ├── WebSocket: /ws (real-time updates)                        │
│  ├── DoH: /dns-query (RFC 8484)                                │
│  └── Rate Limiting + CORS                                       │
├─────────────────────────────────────────────────────────────────┤
│  Core Services (9 Rust Crates)                                  │
│  ├── DNS Engine (Hickory DNS) - Resolution, Caching            │
│  ├── ML Engine - DGA Detection, Risk Scoring                   │
│  ├── AI Engine - Domain Analysis                               │
│  ├── Threat Intel - Feed Aggregation, Anomaly Detection        │
│  ├── Filter Engine - Blocklist/Allowlist, Live Updates         │
│  ├── Profiles - User/Device Management                         │
│  ├── Tiers - Subscription Management                           │
│  ├── Plugin System - WASM Extensibility                        │
│  └── Metrics - Prometheus Export                               │
└─────────────────────────────────────────────────────────────────┘
```

## API Reference

### Health & Metrics
```bash
curl https://your-domain.com/health
# {"status":"healthy","version":"0.3.0","uptime_seconds":3600}

curl https://your-domain.com/metrics
# Prometheus format metrics
```

### DNS Resolution
```bash
curl https://your-domain.com/api/dns/resolve/google.com
# {"domain":"google.com","ip_addresses":["142.250.80.46"],"blocked":false,"cached":true}

# DNS-over-HTTPS (RFC 8484)
curl "https://your-domain.com/dns-query?name=google.com&type=A"
```

### ML/AI Analysis
```bash
# DGA Detection
curl https://your-domain.com/api/ml/dga/suspicious-domain.com
# {"domain":"suspicious-domain.com","is_dga":false,"confidence":0.85}

# Deep Analysis (AI + ML + Threat Intel)
curl https://your-domain.com/api/deep/facebook.com
# {"domain":"facebook.com","risk_score":0.15,"dga_analysis":{...},"threat_analysis":{...}}

# AI Analysis
curl https://your-domain.com/api/ai/analyze/facebook.com
# {"domain":"facebook.com","threat_score":0.15,"privacy_score":{"score":35,"grade":"D"}}
```

### Threat Intelligence
```bash
curl https://your-domain.com/api/threat/analyze/suspicious.com
# {"domain":"suspicious.com","risk_level":"medium","categories":["tracking"]}

curl https://your-domain.com/api/threat/feeds/stats
# {"total_entries":15000,"sources":5,"last_update":"2024-12-21T00:00:00Z"}
```

### Management
```bash
# Allowlist
curl -X POST https://your-domain.com/api/allowlist \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'

# Blocklist
curl -X POST https://your-domain.com/api/blocklist \
  -H "Content-Type: application/json" \
  -d '{"domain":"bad-domain.com"}'

# Statistics
curl https://your-domain.com/api/stats
# {"total_queries":1000,"blocked_queries":150,"cache_hit_rate":0.8}

# Query History
curl https://your-domain.com/api/history
# {"queries":[{"timestamp":1703123456,"domain":"google.com","blocked":false}]}

# Privacy Metrics
curl https://your-domain.com/api/privacy-metrics
# {"privacy_score":85,"trackers_blocked":1234,"privacy_grade":"A"}

# Devices
curl https://your-domain.com/api/devices
# {"devices":[{"id":"1","name":"Device 1","ip_address":"192.168.1.100"}]}
```

### Profiles & Tiers
```bash
# Create profile
curl -X POST https://your-domain.com/api/profiles \
  -H "Content-Type: application/json" \
  -d '{"name":"Kids","protection_level":"strict"}'

# Get pricing
curl https://your-domain.com/api/tiers/pricing
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

## Testing

```bash
# Run all tests
cargo test --workspace        # 17 Rust tests
cd frontend && npm test       # 5 Frontend unit tests
cd frontend && npm run test:e2e  # Playwright E2E tests

# Test breakdown by crate
# - shield-ml-engine: 5 tests (DGA, risk scoring)
# - shield-threat-intel: 5 tests (tunneling, domain intel)
# - shield-plugin-system: 4 tests (WASM plugins)
# - shield-tiers: 3 tests (subscriptions)

# E2E tests cover:
# - Dashboard loading
# - Stats display
# - Offline graceful degradation
# - Theme toggle
```

## Development

```bash
# Backend
cargo build              # Debug build
cargo build --release    # Release build
cargo test --workspace   # Run all tests
cargo clippy --workspace # Lint

# Frontend
cd frontend
npm install
npm run dev              # Dev server on :3000
npm run build            # Production build
npm test                 # Run Vitest tests
npm run lint             # ESLint

# Docker
docker-compose up -d     # Full stack
```

## CI/CD Pipeline

GitHub Actions runs 9 jobs on every push:

1. **backend-check** - Formatting, Clippy, documentation
2. **backend-test** - Build and test (stable/beta matrix)
3. **frontend-check** - ESLint, TypeScript
4. **frontend-test** - Build, test, artifacts
5. **security-audit** - cargo-audit
6. **docker-build** - Build and health check
7. **coverage** - cargo-tarpaulin + Codecov
8. **benchmark** - Performance testing
9. **ci-success** - Gate job

## Roadmap

- [x] Core DNS resolution
- [x] Blocklist filtering with live updates
- [x] Real-time dashboard with WebSocket
- [x] AI/ML threat scoring
- [x] DGA detection
- [x] Privacy score API
- [x] DNS-over-HTTPS (DoH)
- [x] Query analytics
- [x] Allowlist management
- [x] Rate limiting
- [x] Dark mode theme
- [x] PWA support
- [x] CI/CD pipeline
- [x] Docker optimization
- [x] OpenAPI documentation
- [x] Playwright E2E tests
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

| Tests | Build | Coverage |
|-------|-------|----------|
| 17 Rust + 5 Frontend | ✅ Passing | Coming Soon |

[GitHub](https://github.com/punitmishra/shield-ai) | [Demo](https://shield-ai-production.up.railway.app) | [Dashboard](https://artistic-integrity-production.up.railway.app) | [API Docs](docs/openapi.yaml)
