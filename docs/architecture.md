# Shield AI - System Architecture

## 🏗️ Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
├─────────────────────────────────────────────────────────────┤
│  📱 Mobile PWA     💻 Desktop App     🌐 Web Dashboard      │
│  - React Native   - Tauri/Rust       - React SPA           │
│  - Offline First  - Native Perf      - Real-time Updates    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                              │
├─────────────────────────────────────────────────────────────┤
│  🚀 Axum (Rust)                                            │
│  - GraphQL/REST APIs                                        │
│  - WebSocket Streams                                        │
│  - Authentication                                           │
│  - Rate Limiting                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Services                            │
├─────────────────────────────────────────────────────────────┤
│  🧠 AI Engine        🛡️ DNS Filter      📊 Analytics        │
│  - Candle ML         - Hickory DNS      - ClickHouse        │
│  - ONNX Runtime      - Custom Resolver  - Time Series       │
│  - Edge Inference    - Ultra Fast       - Real-time         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure                           │
├─────────────────────────────────────────────────────────────┤
│  🗄️ Storage          🔄 Message Queue   🌐 Edge Network     │
│  - PostgreSQL        - NATS             - Cloudflare        │
│  - Redis Cache       - Event Sourcing   - Global CDN       │
│  - S3 Compatible     - Real-time Sync   - Edge Compute      │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Component Breakdown

### 1. Core DNS Engine (Rust)

**File: `dns-core/src/lib.rs`**
```rust
// Ultra-fast DNS resolver with AI integration
- Hickory DNS for protocol handling
- Custom query pipeline with ML scoring
- Memory-mapped blocklists for speed
- Lock-free data structures
- Zero-copy packet processing
```

**Performance Targets:**
- < 1ms query resolution
- 100K+ QPS per core
- < 50MB memory footprint
- 99.99% uptime

### 2. AI Engine (Rust + ONNX)

**File: `ai-engine/src/inference.rs`**
```rust
// Real-time domain classification
- ONNX Runtime for model inference
- Custom feature extraction pipeline
- Batch processing for efficiency
- Model versioning and A/B testing
- Edge deployment ready
```

**Models:**
- **Domain Classifier**: Malware/Ads/Tracking detection
- **Anomaly Detector**: Zero-day threat detection  
- **User Behavior**: Personalized filtering
- **Network Pattern**: DGA domain detection

### 3. API Layer (Axum)

**File: `api-server/src/main.rs`**
```rust
// High-performance API server
- GraphQL with async-graphql
- WebSocket streaming for real-time
- JWT authentication
- Prometheus metrics
- OpenAPI documentation
```

### 4. Mobile PWA (TypeScript)

**File: `mobile-app/src/App.tsx`**
```typescript
// Native-like mobile experience
- React + Vite for speed
- Offline-first architecture
- Push notifications
- Biometric authentication
- Background sync
```

## 🚀 Deployment Options

### Self-Hosted (Open Source)
```yaml
# docker-compose.yml
version: '3.8'
services:
  dns-core:
    image: shieldai/dns-core:latest
    ports: ["53:53/udp"]
    
  api-server:
    image: shieldai/api-server:latest
    ports: ["8080:8080"]
    
  ai-engine:
    image: shieldai/ai-engine:latest
    
  dashboard:
    image: shieldai/dashboard:latest
    ports: ["3000:3000"]
```

### Cloud Service (Premium)
```
┌─────────────────────────────────────────────────────────────┐
│                 Cloud Infrastructure                        │
├─────────────────────────────────────────────────────────────┤
│  🌍 Global Anycast DNS                                      │
│  - 200+ Edge Locations                                      │
│  - Sub-10ms latency worldwide                               │
│  - DDoS protection included                                 │
│                                                             │
│  🔒 VPN-like Setup                                          │
│  - WireGuard tunnels                                        │
│  - Device-specific configs                                  │
│  - Zero-touch setup                                         │
└─────────────────────────────────────────────────────────────┘
```

### Hybrid Model
```
┌─────────────────┐    ┌─