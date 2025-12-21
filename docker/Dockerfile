# Shield AI - Multi-stage Dockerfile for Rust Backend

FROM rust:1.75-slim as builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml Cargo.lock ./
COPY crates/ ./crates/
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y dnsutils curl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/api-server /app/
COPY config/blocklists/ /app/config/blocklists/
RUN groupadd -r shield-ai && useradd -r -g shield-ai shield-ai && chown -R shield-ai:shield-ai /app
USER shield-ai
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s CMD curl -f http://localhost:${PORT:-8080}/health || exit 1
CMD ["./api-server"]
