# Shield AI Development Tasks

# Default task
default:
    @just --list

# Build everything
build:
    cargo build --release
    cd frontend && npm run build

# Run backend server
run:
    cargo run --release --bin api-server

# Run frontend dev server
frontend:
    cd frontend && npm run dev

# Run both backend and frontend
dev:
    #!/usr/bin/env bash
    cargo run --release --bin api-server &
    cd frontend && npm run dev

# Run all tests
test:
    cargo test --all
    cd frontend && npm test -- --passWithNoTests

# Format code
fmt:
    cargo fmt --all
    cd frontend && npm run format || true

# Lint code
lint:
    cargo clippy --all-targets --all-features -- -D warnings
    cd frontend && npm run lint || true

# Security audit
audit:
    cargo audit
    cd frontend && npm audit || true

# Clean build artifacts
clean:
    cargo clean
    cd frontend && rm -rf node_modules dist

# Docker build
docker-build:
    docker build -t shield-ai:latest .

# Docker run
docker-run:
    docker run -p 8080:8080 shield-ai:latest

# Run benchmarks
bench:
    #!/usr/bin/env bash
    echo "Starting server..."
    cargo run --release --bin api-server &
    SERVER_PID=$!
    sleep 3

    echo "Running benchmarks..."
    echo "=== Health Check ==="
    curl -s http://localhost:8080/health | jq .

    echo ""
    echo "=== DNS Resolution (10 queries) ==="
    for i in {1..10}; do
        time curl -s "http://localhost:8080/api/dns/resolve/google.com" > /dev/null
    done

    echo ""
    echo "=== Threat Analysis ==="
    curl -s "http://localhost:8080/api/ai/analyze/suspicious-domain.tk" | jq .

    kill $SERVER_PID

# Generate documentation
docs:
    cargo doc --no-deps --open

# Check for outdated dependencies
outdated:
    cargo outdated
    cd frontend && npm outdated || true

# Create a release
release version:
    #!/usr/bin/env bash
    echo "Creating release v{{version}}..."
    git tag -a "v{{version}}" -m "Release v{{version}}"
    git push origin "v{{version}}"
    echo "Release created!"

# Watch for changes and rebuild
watch:
    cargo watch -x 'build --release'

# Install development dependencies
setup:
    #!/usr/bin/env bash
    echo "Installing Rust dependencies..."
    cargo fetch

    echo "Installing frontend dependencies..."
    cd frontend && npm install

    echo "Setup complete!"
