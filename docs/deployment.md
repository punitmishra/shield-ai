# Shield AI DNS - Complete Deployment & Security Guide

## 🏗️ Architecture Overview

Shield AI DNS is a high-performance, AI-powered DNS filtering system built with Rust for maximum security and performance. The system consists of several key components:

```
┌─────────────────────────────────────────────────────────────┐
│                    Shield AI DNS Core                       │
├─────────────────────────────────────────────────────────────┤
│  🛡️ Security Engine    🧠 AI Engine    📊 Metrics Engine    │
│  🗄️ Secure Cache      🔍 Filter Engine  ⚙️ Config Manager   │
│  🌐 DNS Resolver      🔐 Rate Limiter   📈 Real-time Stats  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install Rust (latest stable)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install additional tools
cargo install cargo-audit cargo-outdated
```

### Build from Source

```bash
# Clone the repository
git clone https://github.com/your-org/shield-ai-dns
cd shield-ai-dns

# Build with optimizations
cargo build --release

# Run security audit
cargo audit

# Generate configuration
./target/release/shield-ai-dns --generate-config

# Validate configuration
./target/release/shield-ai-dns --validate-config

# Start the server
sudo ./target/release/shield-ai-dns -c shield-ai.toml
```

## 🔧 Configuration

### Basic Configuration (`shield-ai.toml`)

```toml
[dns]
upstream_servers = ["1.1.1.1:53", "8.8.8.8:53", "9.9.9.9:53"]
bind_address = "0.0.0.0"
bind_port = 53
timeout_seconds = 5
max_concurrent_queries = 1000
enable_tcp = true
enable_dnssec = true

[security]
level = "standard"  # minimal, standard, strict, paranoid
rate_limit_per_ip = 100
rate_limit_window_seconds = 60
block_private_ips = false
enable_doh = false
enable_dot = false
blocked_countries = []
allowed_clients = []

[ai]
enabled = true
model_path = "./models/domain_classifier.onnx"
confidence_threshold = 0.7
batch_size = 32
update_interval_hours = 24
enable_learning = true
feature_cache_size = 50000

[cache]
enabled = true
max_entries = 100000
default_ttl_seconds = 300
min_ttl_seconds = 30
max_ttl_seconds = 86400
enable_negative_cache = true
cleanup_interval_seconds = 3600

[metrics]
enabled = true
prometheus_enabled = false
prometheus_port = 9090
export_interval_seconds = 60
retention_days = 7
detailed_logging = false

[logging]
level = "info"
format = "pretty"  # json, pretty, compact
output = "stdout"  # stdout, file, syslog
include_source_location = false
```

### Production Configuration

```toml
[dns]
upstream_servers = [
    "1.1.1.1:53",      # Cloudflare (Primary)
    "1.0.0.1:53",      # Cloudflare (Secondary)  
    "8.8.8.8:53",      # Google (Backup)
    "9.9.9.9:53"       # Quad9 (Security-focused)
]
bind_address = "0.0.0.0"
bind_port = 53
timeout_seconds = 3
max_concurrent_queries = 5000
enable_tcp = true
enable_dnssec = true

[security]
level = "strict"
rate_limit_per_ip = 50
rate_limit_window_seconds = 60
block_private_ips = true
enable_doh = true
enable_dot = true
blocked_countries = []
allowed_clients = ["192.168.0.0/16", "10.0.0.0/8"]

[ai]
enabled = true
confidence_threshold = 0.8
batch_size = 64
enable_learning = true
feature_cache_size = 100000

[cache]
max_entries = 500000
default_ttl_seconds = 600

[metrics]
enabled = true
prometheus_enabled = true
prometheus_port = 9090
detailed_logging = true
retention_days = 30

[logging]
level = "warn"
format = "json"
output = "file"
file_path = "/var/log/shield-ai/dns.log"
max_file_size_mb = 100
max_files = 10
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM rust:1.75 as builder

WORKDIR /app
COPY . .

# Build with security optimizations
RUN cargo build --release --locked

# Runtime image
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -r -s /bin/false -m -d /var/lib/shield-ai shield-ai

# Copy binary and set permissions
COPY --from=builder /app/target/release/shield-ai-dns /usr/local/bin/
RUN chmod +x /usr/local/bin/shield-ai-dns

# Create directories
RUN mkdir -p /etc/shield-ai /var/log/shield-ai /var/lib/shield-ai
RUN chown -R shield-ai:shield-ai /var/log/shield-ai /var/lib/shield-ai

# Copy configuration
COPY config/production.toml /etc/shield-ai/shield-ai.toml
RUN chown shield-ai:shield-ai /etc/shield-ai/shield-ai.toml

USER shield-ai
WORKDIR /var/lib/shield-ai

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD dig @localhost -p 53 google.com || exit 1

EXPOSE 53/udp 53/tcp 9090/tcp

CMD ["/usr/local/bin/shield-ai-dns", "-c", "/etc/shield-ai/shield-ai.toml"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  shield-ai-dns:
    build: .
    container_name: shield-ai-dns
    restart: unless-stopped
    ports:
      - "53:53/udp"
      - "53:53/tcp"
      - "9090:9090/tcp"  # Prometheus metrics
    volumes:
      - ./config:/etc/shield-ai:ro
      - ./logs:/var/log/shield-ai
      - ./models:/var/lib/shield-ai/models:ro
    environment:
      - RUST_LOG=info
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    networks:
      - shield-ai-network

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9091:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - shield-ai-network

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password_here
    networks:
      - shield-ai-network

volumes:
  prometheus_data:
  grafana_data:

networks:
  shield-ai-network:
    driver: bridge
```

## 🔒 Security Hardening

### System Security

```bash
# Create dedicated user
sudo useradd -r -s /bin/false -m -d /var/lib/shield-ai shield-ai

# Set up directories with proper permissions
sudo mkdir -p /etc/shield-ai /var/log/shield-ai
sudo chown shield-ai:shield-ai /var/log/shield-ai
sudo chown root:shield-ai /etc/shield-ai
sudo chmod 750 /etc/shield-ai

# Secure configuration file
sudo chmod 640 /etc/shield-ai/shield-ai.toml
```

### Systemd Service

```ini
# /etc/systemd/system/shield-ai-dns.service
[Unit]
Description=Shield AI DNS Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=shield-ai
Group=shield-ai
ExecStart=/usr/local/bin/shield-ai-dns -c /etc/shield-ai/shield-ai.toml
Restart=always
RestartSec=5
StartLimitInterval=0

# Security settings
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/var/log/shield-ai /var/lib/shield-ai
PrivateTmp=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes
RestrictRealtime=yes
RestrictNamespaces=yes
LockPersonality=yes
MemoryDenyWriteExecute=yes
SystemCallFilter=@system-service
SystemCallErrorNumber=EPERM

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

# Capabilities
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
```

### Firewall Configuration

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 53/udp comment "DNS UDP"
sudo ufw allow 53/tcp comment "DNS TCP"
sudo ufw allow 9090/tcp comment "Prometheus Metrics"

# iptables rules for rate limiting
sudo iptables -A INPUT -p udp --dport 53 -m limit --limit 100/minute --limit-burst 200 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 53 -m limit --limit 100/minute --limit-burst 200 -j ACCEPT
```

## 📊 Monitoring & Alerting

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "shield-ai-alerts.yml"

scrape_configs:
  - job_name: 'shield-ai-dns'
    static_configs:
      - targets: ['shield-ai-dns:9090']
    scrape_interval: 5s
    metrics_path: /metrics

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

### Alert Rules

```yaml
# monitoring/shield-ai-alerts.yml
groups:
  - name: shield-ai-dns
    rules:
      - alert: HighQueryRate
        expr: rate(dns_queries_total[5m]) > 10000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High DNS query rate detected"
          description: "Query rate is {{ $value }} queries/sec"

      - alert: HighBlockRate
        expr: rate(dns_blocked_total[5m]) / rate(dns_queries_total[5m]) > 0.5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Abnormally high block rate"
          description: "Block rate is {{ $value | humanizePercentage }}"

      - alert: ServiceDown
        expr: up{job="shield-ai-dns"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Shield AI DNS service is down"

      - alert: HighMemoryUsage
        expr: dns_memory_usage_bytes > 1073741824  # 1GB
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizeBytes }}"

      - alert: SlowQueryResponse
        expr: histogram_quantile(0.95, dns_query_duration_seconds) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow DNS query responses"
          description: "95th percentile response time is {{ $value }}s"
```

## 🚀 Performance Tuning

### Operating System Tuning

```bash
# /etc/sysctl.d/99-shield-ai.conf
# Increase file descriptor limits
fs.file-max = 2097152
fs.nr_open = 2097152

# Network optimizations
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.core.netdev_max_backlog = 5000
net.ipv4.udp_mem = 102400 873800 16777216
net.ipv4.udp_rmem_min = 8192
net.ipv4.udp_wmem_min = 8192

# Apply settings
sudo sysctl -p /etc/sysctl.d/99-shield-ai.conf
```

### Application Tuning

```toml
# High-performance configuration
[dns]
max_concurrent_queries = 10000
timeout_seconds = 2

[cache]
max_entries = 1000000
cleanup_interval_seconds = 1800

[ai]
batch_size = 128
feature_cache_size = 200000

[security]
rate_limit_per_ip = 200
```

## 🧪 Testing & Validation

### Load Testing

```bash
# Install dnsperf
sudo apt-get install dnsperf

# Create test query file
echo "google.com A" > queries.txt
echo "facebook.com A" >> queries.txt
echo "malicious.example A" >> queries.txt

# Run load test
dnsperf -s 127.0.0.1 -p 53 -d queries.txt -c 100 -T 10

# Test with dig
dig @127.0.0.1 google.com
dig @127.0.0.1 facebook.com
```

### Security Testing

```bash
# Test rate limiting
for i in {1..200}; do dig @127.0.0.1 test$i.com; done

# Test malformed queries
dig @127.0.0.1 $(python3 -c "print('a'*300)").com

# Test DGA domain detection
dig @127.0.0.1 qwerzxcvbnmlkjhgf.com
```

## 🔄 Backup & Recovery

### Configuration Backup

```bash
#!/bin/bash
# backup-config.sh
BACKUP_DIR="/backup/shield-ai"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup configuration
cp /etc/shield-ai/shield-ai.toml "$BACKUP_DIR/config_$DATE.toml"

# Backup logs (last 7 days)
find /var/log/shield-ai -name "*.log" -mtime -7 -exec cp {} "$BACKUP_DIR/" \;

# Backup metrics data
systemctl stop shield-ai-dns
tar -czf "$BACKUP_DIR/cache_$DATE.tar.gz" /var/lib/shield-ai/
systemctl start shield-ai-dns

echo "Backup completed: $BACKUP_DIR"
```

### Disaster Recovery

```bash
#!/bin/bash
# restore-service.sh
BACKUP_DIR="/backup/shield-ai"
LATEST_CONFIG=$(ls -t "$BACKUP_DIR"/config_*.toml | head -1)
LATEST_CACHE=$(ls -t "$BACKUP_DIR"/cache_*.tar.gz | head -1)

# Stop service
systemctl stop shield-ai-dns

# Restore configuration
cp "$LATEST_CONFIG" /etc/shield-ai/shield-ai.toml
chown root:shield-ai /etc/shield-ai/shield-ai.toml
chmod 640 /etc/shield-ai/shield-ai.toml

# Restore cache data
tar -xzf "$LATEST_CACHE" -C /

# Start service
systemctl start shield-ai-dns
systemctl status shield-ai-dns

echo "Recovery completed"
```

## 🔍 Troubleshooting

### Common Issues

1. **Permission Denied on Port 53**
   ```bash
   # Grant NET_BIND_SERVICE capability
   sudo setcap CAP_NET_BIND_SERVICE=+eip /usr/local/bin/shield-ai-dns
   ```

2. **High Memory Usage**
   ```bash
   # Check cache statistics
   curl http://localhost:9090/metrics | grep cache
   
   # Reduce cache size in configuration
   [cache]
   max_entries = 50000
   ```

3. **Slow Query Responses**
   ```bash
   # Check upstream server health
   dig @1.1.1.1 google.com
   
   # Monitor response times
   curl http://localhost:9090/metrics | grep response_time
   ```

### Log Analysis

```bash
# Monitor real-time logs
journalctl -u shield-ai-dns -f

# Search for errors
journalctl -u shield-ai-dns | grep ERROR

# Analyze query patterns
grep "Query resolved" /var/log/shield-ai/dns.log | awk '{print $NF}' | sort | uniq -c | sort -nr
```

## 📈 Performance Benchmarks

Expected performance metrics on modern hardware:

- **Query Throughput**: 100,000+ QPS per core
- **Response Latency**: 
  - P50: < 1ms
  - P95: < 5ms  
  - P99: < 10ms
- **Memory Usage**: < 100MB for 100k cache entries
- **AI Inference**: < 0.1ms per domain
- **Cache Hit Rate**: > 80% typical workload

## 🎯 Production Checklist

- [ ] Security audit completed
- [ ] Configuration validated
- [ ] Monitoring configured
- [ ] Backup procedures tested  
- [ ] Firewall rules applied
- [ ] Service user created
- [ ] Log rotation configured
- [ ] Resource limits set
- [ ] Health checks enabled
- [ ] Alerting rules configured
- [ ] Documentation updated
- [ ] Team training completed

## 📚 Additional Resources

- [DNS Security Best Practices](https://docs.example.com/dns-security)
- [Rust Performance Tuning](https://docs.example.com/rust-performance)
- [Container Security Guide](https://docs.example.com/container-security)
- [Monitoring & Alerting](https://docs.example.com/monitoring)

---

**Shield AI DNS** - AI-Powered DNS Security & Privacy Protection  
Built with ❤️ and 🦀 Rust for maximum security and performance.