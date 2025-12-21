# Getting Started with Shield AI

Complete guide to setting up Shield AI DNS protection.

## Table of Contents
- [Quick Start (2 minutes)](#quick-start)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Configure Your Devices](#configure-your-devices)
- [API Usage](#api-usage)
- [Customization](#customization)

---

## Quick Start

### Option 1: One-Liner Install (Docker)

```bash
curl -sSL https://raw.githubusercontent.com/punitmishra/shield-ai/main/install.sh | bash
```

This will:
- Clone the repository
- Start all services with Docker Compose
- Dashboard available at http://localhost:3000
- API available at http://localhost:8080

### Option 2: Use Our Cloud Instance

No installation needed! Use our hosted API:

```bash
# Test DNS resolution
curl https://shield-ai-production.up.railway.app/api/dns/resolve/google.com

# Check if a domain is safe
curl https://shield-ai-production.up.railway.app/api/ai/analyze/suspicious-site.com
```

---

## Local Development

### Prerequisites

- **Rust** 1.75+ ([install](https://rustup.rs))
- **Node.js** 18+ ([install](https://nodejs.org))
- **Git**

### Step 1: Clone Repository

```bash
git clone https://github.com/punitmishra/shield-ai.git
cd shield-ai
```

### Step 2: Start Backend

```bash
# Build and run
cargo build --release
./target/release/api-server

# Server starts on http://localhost:8080
```

### Step 3: Start Frontend (optional)

```bash
cd frontend
npm install
npm run dev

# Dashboard starts on http://localhost:3000
```

### Step 4: Verify Installation

```bash
# Health check
curl http://localhost:8080/health

# Test DNS resolution
curl http://localhost:8080/api/dns/resolve/google.com

# Test AI analysis
curl http://localhost:8080/api/ai/analyze/facebook.com
```

---

## Docker Deployment

### Using Docker Compose

```bash
# Clone and start
git clone https://github.com/punitmishra/shield-ai.git
cd shield-ai
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### Services Started

| Service | Port | Description |
|---------|------|-------------|
| API Server | 8080 | REST API + WebSocket |
| Dashboard | 3000 | Web UI |
| Redis | 6379 | Cache (optional) |
| Prometheus | 9090 | Metrics (optional) |
| Grafana | 3001 | Visualization (optional) |

### Stop Services

```bash
docker-compose down
```

---

## Cloud Deployment

### Railway (Recommended)

1. **Fork the Repository**
   - Go to https://github.com/punitmishra/shield-ai
   - Click "Fork"

2. **Deploy Backend**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub"
   - Select your forked repo
   - Railway auto-detects Dockerfile
   - Click "Generate Domain" after deploy

3. **Deploy Frontend**
   - In same project, click "+ New Service"
   - Select same repo, set Root Directory to `frontend`
   - Add environment variable:
     ```
     VITE_API_URL=https://your-backend.up.railway.app
     ```
   - Deploy and generate domain

### Other Platforms

**Fly.io**
```bash
flyctl launch
flyctl deploy
```

**Render**
- Connect GitHub repo
- Select Dockerfile
- Deploy

---

## Configure Your Devices

### Use as DNS Server

Shield AI can resolve DNS queries. Point your devices to your Shield AI instance.

### Router Configuration

1. Access router admin (usually 192.168.1.1)
2. Find DNS settings
3. Set primary DNS to your Shield AI IP
4. Save and reboot router

### macOS

```bash
# Set DNS server
sudo networksetup -setdnsservers Wi-Fi YOUR_SHIELD_AI_IP
```

### Windows

1. Open Network Connections
2. Right-click your connection → Properties
3. Select "Internet Protocol Version 4"
4. Set "Preferred DNS server" to Shield AI IP

### Linux

```bash
# Edit resolv.conf
echo "nameserver YOUR_SHIELD_AI_IP" | sudo tee /etc/resolv.conf
```

### iOS/Android

Settings → Wi-Fi → Your Network → Configure DNS → Manual → Add Shield AI IP

---

## API Usage

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/stats` | GET | Query statistics |
| `/api/dns/resolve/:domain` | GET | Resolve DNS |
| `/api/ai/analyze/:domain` | GET | AI threat analysis |
| `/api/history` | GET | Query history |
| `/api/blocklist/stats` | GET | Blocklist info |
| `/ws` | WebSocket | Real-time updates |
| `/metrics` | GET | Prometheus metrics |

### Examples

**Check Domain Safety**
```bash
curl https://your-api.com/api/ai/analyze/suspicious-site.com | jq
```

Response:
```json
{
  "domain": "suspicious-site.com",
  "threat_score": 0.75,
  "privacy_score": {
    "score": 30,
    "grade": "F",
    "tracking": true,
    "fingerprinting": true
  }
}
```

**Resolve Domain**
```bash
curl https://your-api.com/api/dns/resolve/github.com | jq
```

Response:
```json
{
  "domain": "github.com",
  "ip_addresses": ["140.82.114.4"],
  "blocked": false,
  "cached": true,
  "query_time_ms": 0
}
```

**WebSocket Real-time Stats**
```javascript
const ws = new WebSocket('wss://your-api.com/ws');
ws.onmessage = (event) => {
  const stats = JSON.parse(event.data);
  console.log('Total queries:', stats.total_queries);
};
```

---

## Customization

### Add Custom Blocklists

Create a file in `config/blocklists/`:

```bash
# config/blocklists/custom.txt
bad-domain.com
another-bad-site.net
*.malware-family.com
```

Restart the server to load new blocklists.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Server port |
| `RUST_LOG` | info | Log level |
| `CACHE_SIZE` | 50000 | Max cache entries |
| `CACHE_TTL` | 300 | Cache TTL (seconds) |

### Adjust AI Sensitivity

The AI engine uses a threshold of 0.7 by default. Domains with threat scores above this are flagged.

---

## Troubleshooting

### Server Won't Start

```bash
# Check if port is in use
lsof -i :8080

# Check logs
RUST_LOG=debug ./target/release/api-server
```

### DNS Resolution Fails

```bash
# Test upstream DNS
dig @8.8.8.8 google.com

# Check blocklist isn't blocking
curl http://localhost:8080/api/blocklist/stats
```

### High Memory Usage

Shield AI is designed to use <50MB. If higher:
- Reduce `CACHE_SIZE`
- Clear cache periodically

---

## Next Steps

- [Read the full documentation](./README.md)
- [View the API reference](./API.md)
- [Contribute to the project](./CONTRIBUTING.md)

---

**Need help?** Open an issue at https://github.com/punitmishra/shield-ai/issues
