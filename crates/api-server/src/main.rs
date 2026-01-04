//! Shield AI API Server
//! Production-grade RESTful API for DNS protection management

mod handlers;
mod rate_limiter;
mod state;

use std::env;
use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::Result;
use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};
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

    info!(
        "Starting Shield AI API Server v{}",
        env!("CARGO_PKG_VERSION")
    );

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
        // DNS-over-HTTPS (DoH) endpoint (RFC 8484)
        // GET with ?dns= or ?name= query params, POST with binary DNS message body
        .route("/dns-query", get(handlers::doh_query).post(handlers::doh_query_post))
        // Analytics endpoint
        .route("/api/analytics", get(handlers::get_analytics))
        // Allowlist management endpoints
        .route(
            "/api/allowlist",
            get(handlers::get_allowlist).post(handlers::add_to_allowlist),
        )
        .route(
            "/api/allowlist/:domain",
            delete(handlers::remove_from_allowlist),
        )
        // Blocklist management endpoints
        .route("/api/blocklist", post(handlers::add_to_blocklist))
        .route("/api/blocklist/bulk", post(handlers::bulk_add_to_blocklist))
        .route(
            "/api/blocklist/:domain",
            delete(handlers::remove_from_blocklist),
        )
        // Privacy metrics endpoint
        .route("/api/privacy-metrics", get(handlers::get_privacy_metrics))
        // Device management endpoints
        .route("/api/devices", get(handlers::get_devices))
        .route("/api/devices/:id", put(handlers::update_device))
        // Rate limit stats
        .route("/api/rate-limit/stats", get(handlers::rate_limit_stats))
        // Threat intelligence endpoints
        .route("/api/threat/analyze/:domain", get(handlers::threat_analyze))
        .route("/api/threat/check/:domain", get(handlers::threat_check))
        .route("/api/threat/feeds/stats", get(handlers::threat_feed_stats))
        // Profile management endpoints
        .route(
            "/api/profiles",
            get(handlers::list_profiles).post(handlers::create_profile),
        )
        .route("/api/profiles/stats", get(handlers::profile_stats))
        .route(
            "/api/profiles/:id",
            get(handlers::get_profile).delete(handlers::delete_profile),
        )
        .route("/api/profiles/device", post(handlers::assign_device))
        // Unified filter management endpoints
        .route("/api/filter/stats", get(handlers::unified_filter_stats))
        .route("/api/filter/check/:domain", get(handlers::check_domain_blocking))
        .route("/api/filter/categories", get(handlers::get_blocking_categories))
        .route("/api/filter/categories/enabled", get(handlers::get_enabled_categories))
        .route("/api/filter/categories/:category", put(handlers::toggle_category))
        .route("/api/filter/profile/ip", post(handlers::assign_profile_to_ip))
        .route("/api/filter/refresh", post(handlers::refresh_blocklists))
        // Tier management endpoints
        .route("/api/tiers/pricing", get(handlers::get_pricing))
        .route("/api/tiers/check", post(handlers::check_feature))
        .route("/api/tiers/:user_id", get(handlers::get_subscription))
        .route("/api/tiers/:user_id/usage", get(handlers::get_usage))
        .route("/api/tiers/:user_id/upgrade", put(handlers::upgrade_tier))
        .route("/api/tiers/:user_id/trial", post(handlers::start_trial))
        // ML Engine endpoints - Deep AI Analysis
        .route("/api/ml/analyze/:domain", get(handlers::ml_analyze))
        .route("/api/ml/dga/:domain", get(handlers::ml_dga_check))
        .route("/api/ml/block/:domain", get(handlers::ml_should_block))
        .route("/api/ml/analytics", get(handlers::ml_analytics))
        // Combined deep analysis (AI + ML + Threat Intel)
        .route("/api/deep/:domain", get(handlers::deep_analysis))
        // WebSocket for real-time updates
        .route("/ws", get(handlers::ws_handler))
        // Public auth routes (no auth required)
        .route("/api/auth/register", post(handlers::auth_register))
        .route("/api/auth/login", post(handlers::auth_login))
        .route("/api/auth/refresh", post(handlers::auth_refresh))
        .route("/api/auth/logout", post(handlers::auth_logout))
        // Shared state
        .with_state(app_state.clone())
        // Protected auth routes (requires JWT auth)
        .merge(
            Router::new()
                .route("/api/auth/me", get(handlers::auth_me))
                .route("/api/auth/devices", get(handlers::auth_get_devices))
                .route(
                    "/api/auth/devices/register",
                    post(handlers::auth_register_device),
                )
                .route(
                    "/api/auth/devices/:id/push-token",
                    put(handlers::auth_update_push_token),
                )
                .layer(middleware::from_fn_with_state(
                    app_state.clone(),
                    handlers::auth_middleware,
                ))
                .with_state(app_state),
        )
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
