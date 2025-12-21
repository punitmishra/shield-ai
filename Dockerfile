# Shield AI - Multi-stage Dockerfile for Rust Backend

FROM rust:1.83-slim as builder
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml Cargo.lock ./
COPY crates/ ./crates/
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/api-server /app/
COPY config/blocklists/ /app/config/blocklists/
EXPOSE 8080
CMD ["./api-server"]
