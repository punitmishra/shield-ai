//! Shield AI API Server
//! RESTful API for DNS protection management

mod handlers;
mod state;

use std::net::SocketAddr;
use std::sync::Arc;
use anyhow::Result;
use axum::{routing::get, Router};
use tower_http::cors::CorsLayer;
use tracing::info;

use state::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_target(false)
        .with_level(true)
        .init();

    info!("Starting Shield AI API Server v{}", env!("CARGO_PKG_VERSION"));

    let app_state = Arc::new(AppState::new());

    let app = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/api/stats", get(handlers::get_stats))
        .route("/api/dns/resolve/:domain", get(handlers::resolve_domain))
        .route("/metrics", get(handlers::metrics))
        .with_state(app_state)
        .layer(CorsLayer::permissive());

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    info!("Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
