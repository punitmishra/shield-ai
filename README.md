# Shield AI - Open Source AI-Powered DNS Filtering

Ultra-fast DNS resolver with AI-powered threat detection. Built with Rust for maximum performance.

## Quick Start

```bash
# Docker Compose (recommended)
docker-compose up -d

# Test DNS
dig @localhost google.com

# Dashboard
open http://localhost:3000
```

## Build from Source

```bash
# Backend (Rust)
cargo build --release

# Frontend
cd frontend && npm install && npm run dev
```

## Architecture

- **Backend**: Rust + Axum + Hickory DNS
- **Frontend**: React + TypeScript + Vite + Tailwind
- **AI Engine**: ONNX Runtime for threat detection
- **Cache**: Redis for high-performance caching

## Performance

- Query latency: < 1ms (P50)
- Throughput: 100K+ QPS per core
- Memory: < 50MB base
- AI inference: < 0.1ms per domain

## Documentation

- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Project Structure](docs/project-structure.md)

## License

MIT + Apache 2.0
