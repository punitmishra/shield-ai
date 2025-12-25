# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shield AI is an open-source, AI-powered DNS filtering system. It combines a high-performance Rust backend with a TypeScript/React frontend to provide ultra-fast DNS resolution with real-time threat detection using ML models.

## Tech Stack

**Backend (Rust)**
- Web Framework: Axum 0.7 with Tokio async runtime
- DNS Core: Hickory DNS
- ML Inference: ONNX Runtime + Candle ML
- Caching: Redis
- Data Structures: DashMap, AHashSet, parking_lot
- Logging: Tracing with structured JSON output

**Frontend (TypeScript/React)**
- Build: Vite
- State: Zustand
- Styling: Tailwind CSS
- Charts: Recharts + Chart.js

## Build Commands

```bash
# Rust
cargo build --release              # Production build
cargo test --workspace             # Run all tests (17 tests)
cargo fmt                          # Format code
cargo clippy                       # Lint

# Frontend
cd frontend
npm install                        # Install dependencies
npm run dev                        # Dev server on :3000
npm run build                      # Production build
npm run test                       # Run Vitest unit tests (5 tests)
npm run test:e2e                   # Run Playwright E2E tests
npm run test:e2e:ui                # Run E2E tests with UI

# Docker
cd docker && docker-compose up     # Full stack (DNS, API, Redis, Prometheus, Grafana)
```

## Architecture

```
Frontend (React/Vite :3000)
         ↓
API Gateway (Axum :8080)
├── REST: /api/*, /health, /metrics
├── WebSocket: /ws (real-time updates)
└── Rate Limiting + CORS
         ↓
Core Services
├── DNS Engine (Hickory DNS :53)
│   └── Query → Filter → AI Analysis → Cache → Upstream → Response
├── AI Engine (ONNX Runtime)
│   └── Feature Extraction → Classification → Threat Score
├── Filter Engine
│   └── Exact hash table + Wildcard trie (O(1) lookups)
└── Metrics Collector
    └── Prometheus export
         ↓
Infrastructure
├── Redis (:6379) - DNS cache
├── Prometheus (:9090) - Metrics
└── Grafana (:3001) - Visualization
```

## Key Source Files

| File | Purpose |
|------|---------|
| `dns_core_main.rs` | Core DNS resolver engine |
| `api-server-rust.rs` | REST API server (Axum) |
| `ai-engine-rust.rs` | AI inference engine (ONNX) |
| `filter.rs` | Domain filtering with blocklists |
| `dns_cache.rs` | High-performance caching layer |
| `metrics_collector.rs` | Real-time metrics collection |
| `resolver.rs` | DNS resolution logic |
| `secure_resolver.rs` | Security-enhanced resolver |
| `nextjs_dashboard_main.tsx` | Main dashboard component |
| `mobile_pwa_app.tsx` | Mobile PWA application |

## Performance Targets

- Query latency (P50): <1ms
- Throughput: 100K+ QPS per core
- Memory: <50MB base
- AI inference: <0.1ms per domain
- Cache hit rate: >80%

## Configuration

DNS settings are in `dns_config.rs`:
- Upstream DNS: Cloudflare, Google, Quad9
- Cache TTL: 300s default
- DNSSEC: Enabled
- Rate limit: 50-200 req/min per IP

AI settings in `ai-engine-rust.rs`:
- Feature cache: 50,000-200,000 entries
- Batch size: 32-128 domains
- Confidence threshold: 0.7-0.8

## Development Patterns

- Use async/await with Tokio throughout
- Prefer lock-free data structures (DashMap, AHashSet)
- Zero-copy packet processing where possible
- Structured logging via tracing crate
- All API responses use consistent JSON format with `ApiResponse<T>` wrapper

## Security Considerations

- DNSSEC validation enabled by default
- Rate limiting per IP address
- Non-root execution (shield-ai user)
- CAP_NET_BIND_SERVICE for port 53
- Privacy: hashed domain storage, rotating client IP salts
- DoH/DoT support for encrypted DNS

## API Endpoints

### Core
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics
- `GET /ws` - WebSocket real-time updates
- `GET /api/stats` - Query statistics
- `GET /api/history` - Query history

### DNS
- `GET /api/dns/resolve/:domain` - DNS resolution
- `GET /dns-query` - DNS-over-HTTPS (RFC 8484)

### ML/AI Analysis
- `GET /api/ml/analyze/:domain` - Deep ML analysis
- `GET /api/ml/dga/:domain` - DGA detection
- `GET /api/deep/:domain` - Combined AI+ML+Threat analysis
- `GET /api/ai/analyze/:domain` - AI domain analysis

### Management
- `GET/POST /api/allowlist` - Allowlist management
- `POST /api/blocklist` - Add to blocklist
- `DELETE /api/blocklist/:domain` - Remove from blocklist
- `GET /api/privacy-metrics` - Privacy dashboard data
- `GET /api/devices` - Device list
- `PUT /api/devices/:id` - Update device

### Profiles & Tiers
- `GET/POST /api/profiles` - Profile CRUD
- `GET /api/tiers/pricing` - Pricing info

## Documentation

- `CHECKPOINT.md` - Project state and session history
- `docs/architecture.md` - System design and data flows
- `docs/deployment.md` - Deployment and Docker setup
- `docs/openapi.yaml` - OpenAPI 3.0 specification
