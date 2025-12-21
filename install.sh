#!/bin/bash
# Shield AI - One-liner installer
# Usage: curl -sSL https://raw.githubusercontent.com/punitmishra/shield-ai/main/install.sh | bash

set -e

REPO="punitmishra/shield-ai"
INSTALL_DIR="${SHIELD_AI_DIR:-$HOME/.shield-ai}"

echo "
   _____ _     _      _     _      _    ___
  / ____| |   (_)    | |   | |    / \  |_ _|
  \___ \| |__  _  ___| | __| |   / _ \  | |
   ___) | '_ \| |/ _ \ |/ _\` |  / ___ \ | |
  |____/|_| |_|_|\___/_|\__,_| /_/   \_\___|

  The lightest, fastest DNS protection system
"

# Check requirements
command -v docker >/dev/null 2>&1 || { echo "Error: Docker is required. Install from https://docker.com"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || { echo "Error: Docker Compose is required."; exit 1; }

echo "[1/4] Creating installation directory..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo "[2/4] Downloading Shield AI..."
if command -v git >/dev/null 2>&1; then
    git clone --depth 1 "https://github.com/$REPO.git" . 2>/dev/null || git pull
else
    curl -sL "https://github.com/$REPO/archive/main.tar.gz" | tar xz --strip-components=1
fi

echo "[3/4] Starting Shield AI..."
docker compose up -d

echo "[4/4] Waiting for services..."
sleep 5

# Health check
if curl -sf http://localhost:8080/health >/dev/null 2>&1; then
    echo "
Shield AI is running!

  API Server:  http://localhost:8080
  Dashboard:   http://localhost:3000
  Health:      http://localhost:8080/health

Test DNS protection:
  curl http://localhost:8080/api/dns/resolve/google.com
  curl http://localhost:8080/api/dns/resolve/doubleclick.net  # Should be blocked

Stop:  cd $INSTALL_DIR && docker compose down
Start: cd $INSTALL_DIR && docker compose up -d
Logs:  cd $INSTALL_DIR && docker compose logs -f
"
else
    echo "Warning: Health check failed. Check logs with: docker compose logs"
fi
