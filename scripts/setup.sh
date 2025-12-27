#!/bin/bash
# Shield AI - Autoconfigure Setup Script
# This script sets up Shield AI with sensible defaults

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "================================================"
echo "Shield AI - DNS Protection Setup"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create necessary directories
info "Creating directories..."
mkdir -p "$PROJECT_ROOT/data"
mkdir -p "$PROJECT_ROOT/config/blocklists"
mkdir -p "$PROJECT_ROOT/logs"

# Download popular blocklists
info "Downloading blocklists..."

BLOCKLIST_DIR="$PROJECT_ROOT/config/blocklists"

# Steven Black's Unified Hosts (ads + malware)
if command -v curl &> /dev/null; then
    DOWNLOAD_CMD="curl -sL"
elif command -v wget &> /dev/null; then
    DOWNLOAD_CMD="wget -qO-"
else
    warn "Neither curl nor wget found. Skipping blocklist download."
    DOWNLOAD_CMD=""
fi

if [ -n "$DOWNLOAD_CMD" ]; then
    info "Downloading Steven Black's hosts list (ads + malware)..."
    $DOWNLOAD_CMD "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts" \
        > "$BLOCKLIST_DIR/stevenblack-hosts.txt" 2>/dev/null || warn "Failed to download Steven Black hosts"

    info "Downloading AdGuard DNS filter..."
    $DOWNLOAD_CMD "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt" \
        > "$BLOCKLIST_DIR/adguard-dns.txt" 2>/dev/null || warn "Failed to download AdGuard DNS"

    info "Downloading OISD basic blocklist..."
    $DOWNLOAD_CMD "https://small.oisd.nl/domainswild" \
        > "$BLOCKLIST_DIR/oisd-small.txt" 2>/dev/null || warn "Failed to download OISD"

    info "Downloading phishing blocklist..."
    $DOWNLOAD_CMD "https://phishing.army/download/phishing_army_blocklist.txt" \
        > "$BLOCKLIST_DIR/phishing-army.txt" 2>/dev/null || warn "Failed to download phishing list"
fi

# Count total domains
TOTAL_DOMAINS=0
for file in "$BLOCKLIST_DIR"/*.txt; do
    if [ -f "$file" ]; then
        COUNT=$(grep -cve '^\s*$' "$file" 2>/dev/null || echo 0)
        TOTAL_DOMAINS=$((TOTAL_DOMAINS + COUNT))
    fi
done

info "Total blocklist entries: $TOTAL_DOMAINS"

# Create environment file if it doesn't exist
ENV_FILE="$PROJECT_ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
    info "Creating .env file with defaults..."
    cat > "$ENV_FILE" << 'EOF'
# Shield AI Configuration
# ========================

# Database
DATABASE_PATH=data/shield.db

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=shield-ai-change-this-in-production

# Server
API_PORT=8080
DNS_PORT=53

# Logging
RUST_LOG=info,shield=debug

# Cache settings
DNS_CACHE_SIZE=50000
DNS_CACHE_TTL=300

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
EOF
    info "Created .env file. Please update JWT_SECRET for production use."
else
    info ".env file already exists, skipping."
fi

# Create Docker environment file
DOCKER_ENV="$PROJECT_ROOT/docker/.env"
if [ ! -f "$DOCKER_ENV" ]; then
    info "Creating Docker .env file..."
    mkdir -p "$PROJECT_ROOT/docker"
    cat > "$DOCKER_ENV" << 'EOF'
# Docker Compose Environment
COMPOSE_PROJECT_NAME=shield-ai
DATABASE_PATH=/app/data/shield.db
JWT_SECRET=shield-ai-docker-change-me
RUST_LOG=info
EOF
fi

# Show final summary
echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
info "Directories created:"
echo "  - data/          (database storage)"
echo "  - config/blocklists/  (blocklist files)"
echo "  - logs/          (application logs)"
echo ""
info "Blocklists downloaded:"
for file in "$BLOCKLIST_DIR"/*.txt; do
    if [ -f "$file" ]; then
        NAME=$(basename "$file")
        COUNT=$(grep -cve '^\s*$' "$file" 2>/dev/null || echo 0)
        echo "  - $NAME ($COUNT entries)"
    fi
done
echo ""
info "Next steps:"
echo "  1. Update .env with your JWT_SECRET for production"
echo "  2. Run: cargo build --release"
echo "  3. Run: ./target/release/shield-api-server"
echo "  4. Or use Docker: cd docker && docker-compose up"
echo ""
echo "API will be available at: http://localhost:8080"
echo "DNS will be available at: localhost:53 (requires sudo/root)"
echo ""
