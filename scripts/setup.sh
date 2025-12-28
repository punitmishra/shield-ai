#!/bin/bash
# Shield AI - Autoconfigure Setup Script
# This script sets up Shield AI with sensible defaults and downloads blocklists

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
BLUE='\033[0;34m'
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

blue() {
    echo -e "${BLUE}$1${NC}"
}

# Create necessary directories
info "Creating directories..."
mkdir -p "$PROJECT_ROOT/data"
mkdir -p "$PROJECT_ROOT/config/blocklists"
mkdir -p "$PROJECT_ROOT/logs"

# Determine download command
if command -v curl &> /dev/null; then
    DOWNLOAD_CMD="curl -sL --connect-timeout 10 --max-time 60"
elif command -v wget &> /dev/null; then
    DOWNLOAD_CMD="wget -qO- --timeout=60"
else
    warn "Neither curl nor wget found. Skipping blocklist download."
    DOWNLOAD_CMD=""
fi

BLOCKLIST_DIR="$PROJECT_ROOT/config/blocklists"
TOTAL_DOMAINS=0

download_list() {
    local name="$1"
    local url="$2"
    local output="$3"

    info "Downloading $name..."
    if $DOWNLOAD_CMD "$url" > "$BLOCKLIST_DIR/$output" 2>/dev/null; then
        local count=$(grep -cve '^\s*$\|^#\|^!\|^@' "$BLOCKLIST_DIR/$output" 2>/dev/null || echo 0)
        echo "  ✓ $count entries"
        TOTAL_DOMAINS=$((TOTAL_DOMAINS + count))
    else
        warn "  ✗ Failed to download"
        rm -f "$BLOCKLIST_DIR/$output"
    fi
}

if [ -n "$DOWNLOAD_CMD" ]; then
    echo ""
    blue "=== Downloading Blocklists ==="
    echo ""

    # Core lists (always download)
    download_list "Steven Black Unified Hosts" \
        "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts" \
        "stevenblack-hosts.txt"

    download_list "AdGuard DNS Filter" \
        "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt" \
        "adguard-dns.txt"

    download_list "OISD Big" \
        "https://big.oisd.nl/domainswild" \
        "oisd-big.txt"

    download_list "Phishing Army Extended" \
        "https://phishing.army/download/phishing_army_blocklist_extended.txt" \
        "phishing-army.txt"

    download_list "URLhaus Malware" \
        "https://urlhaus.abuse.ch/downloads/hostfile/" \
        "urlhaus-malware.txt"

    # Firebog curated lists
    download_list "Firebog - AdGuard" \
        "https://v.firebog.net/hosts/AdguardDNS.txt" \
        "firebog-adguard.txt"

    download_list "Firebog - Easylist" \
        "https://v.firebog.net/hosts/Easylist.txt" \
        "firebog-easylist.txt"

    download_list "Firebog - Easyprivacy" \
        "https://v.firebog.net/hosts/Easyprivacy.txt" \
        "firebog-easyprivacy.txt"

    download_list "Firebog - Prigent Ads" \
        "https://v.firebog.net/hosts/Prigent-Ads.txt" \
        "firebog-prigent.txt"

    # Dan Pollock
    download_list "Dan Pollock Hosts" \
        "https://someonewhocares.org/hosts/zero/hosts" \
        "danpollock-hosts.txt"

    # Disconnect.me
    download_list "Disconnect.me Ads" \
        "https://s3.amazonaws.com/lists.disconnect.me/simple_ad.txt" \
        "disconnect-ads.txt"

    download_list "Disconnect.me Tracking" \
        "https://s3.amazonaws.com/lists.disconnect.me/simple_tracking.txt" \
        "disconnect-tracking.txt"

    # HaGeZi
    download_list "HaGeZi Multi" \
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/multi.txt" \
        "hagezi-multi.txt"

    download_list "HaGeZi Threat Intel" \
        "https://raw.githubusercontent.com/hagezi/dns-blocklists/main/domains/tif.txt" \
        "hagezi-tif.txt"

    # Crypto miners
    download_list "NoCoin Cryptominers" \
        "https://raw.githubusercontent.com/hoshsadiq/adblock-nocoin-list/master/hosts.txt" \
        "nocoin-cryptominers.txt"

    # Spam
    download_list "Spam404" \
        "https://raw.githubusercontent.com/Spam404/lists/master/main-blacklist.txt" \
        "spam404.txt"

    # NoTracking
    download_list "NoTracking" \
        "https://raw.githubusercontent.com/notracking/hosts-blocklists/master/hostnames.txt" \
        "notracking.txt"
fi

echo ""
blue "=== Blocklist Summary ==="
echo ""
info "Total unique entries: ~$TOTAL_DOMAINS"
echo ""
info "Downloaded lists:"
for file in "$BLOCKLIST_DIR"/*.txt; do
    if [ -f "$file" ]; then
        NAME=$(basename "$file")
        SIZE=$(wc -c < "$file" | xargs)
        echo "  - $NAME ($(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo "${SIZE}B"))"
    fi
done

# Create environment file if it doesn't exist
ENV_FILE="$PROJECT_ROOT/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo ""
    info "Creating .env file with defaults..."
    cat > "$ENV_FILE" << 'EOF'
# Shield AI Configuration
# ========================

# Server
API_PORT=8080
DNS_PORT=53

# Database
DATABASE_PATH=data/shield.db

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=shield-ai-change-this-in-production-$(openssl rand -hex 16 2>/dev/null || date +%s)

# Logging
RUST_LOG=info,shield=debug

# Cache settings
DNS_CACHE_SIZE=100000
DNS_CACHE_TTL=300

# Rate limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Blocklist directory
BLOCKLIST_DIR=config/blocklists

# Production API URL (for mobile apps)
API_URL=https://api.shields-ai.greplabs.com
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
BLOCKLIST_DIR=/app/config/blocklists
EOF
fi

# Show final summary
echo ""
echo "================================================"
blue "Setup Complete!"
echo "================================================"
echo ""
info "Directories created:"
echo "  - data/               (database storage)"
echo "  - config/blocklists/  (blocklist files)"
echo "  - logs/               (application logs)"
echo ""
info "Configuration files:"
echo "  - .env                (environment variables)"
echo "  - docker/.env         (Docker environment)"
echo ""
info "Next steps:"
echo ""
echo "  Local Development:"
echo "    1. Update .env with your JWT_SECRET"
echo "    2. cargo build --release"
echo "    3. ./target/release/shield-api-server"
echo ""
echo "  Docker:"
echo "    1. cd docker && docker-compose up"
echo ""
echo "  GitHub Codespaces:"
echo "    1. Open in Codespaces"
echo "    2. Run: ./scripts/setup.sh"
echo "    3. Run: cargo run --bin api-server"
echo ""
echo "API will be available at: http://localhost:8080"
echo "DNS will be available at: localhost:53 (requires sudo/root)"
echo ""
echo "Test DNS blocking:"
echo "  curl 'http://localhost:8080/api/dns/resolve/doubleclick.net'"
echo "  # Should return: blocked: true"
echo ""
