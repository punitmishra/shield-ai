//! Shield AI API Server
//! Production-grade RESTful API for DNS protection management

mod handlers;
mod state;

use std::env;
use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::Result;
use axum::{routing::get, Router};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer},
};
use tracing::{info, Level};

use state::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize structured logging
    tracing_subscriber::fmt()
        .with_target(true)
        .with_level(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();

    info!("Starting Shield AI API Server v{}", env!("CARGO_PKG_VERSION"));

    // Initialize application state (async - connects to DNS servers)
    let app_state = Arc::new(AppState::new().await?);
    info!("Application state initialized successfully");

    // Build the router with all routes and middleware
    let app = Router::new()
        // Health and monitoring
        .route("/health", get(handlers::health_check))
        .route("/metrics", get(handlers::metrics))
        // API endpoints
        .route("/api/stats", get(handlers::get_stats))
        .route("/api/history", get(handlers::get_query_history))
        .route("/api/blocklist/stats", get(handlers::get_blocklist_stats))
        .route("/api/dns/resolve/:domain", get(handlers::resolve_domain))
        // AI analysis endpoint
        .route("/api/ai/analyze/:domain", get(handlers::analyze_domain))
        // WebSocket for real-time updates
        .route("/ws", get(handlers::ws_handler))
        // Shared state
        .with_state(app_state)
        // Request tracing
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
        // CORS - allow any origin for API access
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );

    // Read port from environment (Railway sets PORT)
    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must be a valid number");

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Server listening on http://{}", addr);

    // Create TCP listener
    let listener = tokio::net::TcpListener::bind(addr).await?;

    // Run server with graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    info!("Server shutdown complete");
    Ok(())
}

/// Graceful shutdown signal handler
async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            info!("Received Ctrl+C, initiating graceful shutdown");
        }
        _ = terminate => {
            info!("Received SIGTERM, initiating graceful shutdown");
        }
    }
}
