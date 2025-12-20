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
cargo test                         # Run tests
cargo fmt                          # Format code
cargo clippy                       # Lint

# Frontend
npm install                        # Install dependencies
npm run dev                        # Dev server on :3000
npm run build                      # Production build
npm run test                       # Run Vitest tests

# Docker
docker-compose up                  # Full stack (DNS, API, Redis, Prometheus, Grafana)
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

## Documentation

- `system-architecture.md` - Detailed system design and data flows
- `deployment_guide.md` - Deployment, Docker, security hardening
- `project_structure.txt` - Workspace layout
- `docker_setup.txt` - Docker Compose configuration
