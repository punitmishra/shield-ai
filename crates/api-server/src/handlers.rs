//! API request handlers

use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use shield_metrics::QueryLogEntry;
use std::sync::Arc;
use tracing::{info, warn};

use crate::state::AppState;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub uptime_seconds: u64,
}

#[derive(Serialize)]
pub struct StatsResponse {
    pub total_queries: u64,
    pub blocked_queries: u64,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub cache_hit_rate: f64,
    pub block_rate: f64,
}

#[derive(Serialize)]
pub struct DnsResolveResponse {
    pub domain: String,
    pub ip_addresses: Vec<String>,
    pub blocked: bool,
    pub cached: bool,
    pub query_time_ms: u64,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

/// Health check endpoint
pub async fn health_check(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    let uptime = state.start_time.elapsed().as_secs();
    info!("Health check - uptime: {}s", uptime);

    Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_seconds: uptime,
    })
}

/// DNS statistics endpoint
pub async fn get_stats(State(state): State<Arc<AppState>>) -> Json<StatsResponse> {
    let snapshot = state.metrics.snapshot();

    let block_rate = if snapshot.total_queries > 0 {
        snapshot.blocked_queries as f64 / snapshot.total_queries as f64
    } else {
        0.0
    };

    info!(
        "Stats: queries={}, blocked={}, hit_rate={:.2}%",
        snapshot.total_queries,
        snapshot.blocked_queries,
        snapshot.cache_hit_rate * 100.0
    );

    Json(StatsResponse {
        total_queries: snapshot.total_queries,
        blocked_queries: snapshot.blocked_queries,
        cache_hits: snapshot.cache_hits,
        cache_misses: snapshot.cache_misses,
        cache_hit_rate: snapshot.cache_hit_rate,
        block_rate,
    })
}

/// DNS resolution endpoint
pub async fn resolve_domain(
    Path(domain): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<DnsResolveResponse>, Json<ErrorResponse>> {
    info!("DNS resolution request for: {}", domain);
    let start = std::time::Instant::now();

    if domain.is_empty() || domain.len() > 253 {
        warn!("Invalid domain length: {}", domain);
        return Err(Json(ErrorResponse {
            error: "invalid_domain".to_string(),
            message: "Domain name is invalid or too long".to_string(),
        }));
    }

    // Check if blocked (placeholder logic)
    let blocked = domain.contains("malware") || domain.contains("phishing");

    if blocked {
        let query_time_ms = start.elapsed().as_millis() as u64;
        state.metrics.record_query_with_details(
            domain.clone(),
            "0.0.0.0".to_string(),
            true,
            query_time_ms,
        );
        warn!("Blocked domain: {}", domain);
        return Ok(Json(DnsResolveResponse {
            domain,
            ip_addresses: vec![],
            blocked: true,
            cached: false,
            query_time_ms,
        }));
    }

    // Simulate DNS resolution
    let ip_addresses = match domain.as_str() {
        "google.com" => vec!["8.8.8.8".to_string(), "8.8.4.4".to_string()],
        "cloudflare.com" => vec!["1.1.1.1".to_string()],
        "localhost" => vec!["127.0.0.1".to_string()],
        _ => {
            state.metrics.record_cache_miss();
            vec!["0.0.0.0".to_string()]
        }
    };

    let cached = !ip_addresses.is_empty() && ip_addresses[0] != "0.0.0.0";
    if cached {
        state.metrics.record_cache_hit();
    }

    let query_time_ms = start.elapsed().as_millis() as u64;

    // Log query with details
    state.metrics.record_query_with_details(
        domain.clone(),
        "0.0.0.0".to_string(),
        false,
        query_time_ms,
    );

    info!("Resolved {} to {:?} in {}ms", domain, ip_addresses, query_time_ms);

    Ok(Json(DnsResolveResponse {
        domain,
        ip_addresses,
        blocked: false,
        cached,
        query_time_ms,
    }))
}

/// Prometheus metrics endpoint
pub async fn metrics(State(state): State<Arc<AppState>>) -> String {
    state.metrics.to_prometheus()
}

/// Query history response
#[derive(Serialize)]
pub struct QueryHistoryResponse {
    pub queries: Vec<QueryLogEntry>,
}

/// Query history endpoint
pub async fn get_query_history(State(state): State<Arc<AppState>>) -> Json<QueryHistoryResponse> {
    let queries = state.metrics.get_query_history(100);
    info!("Returning {} query history entries", queries.len());
    Json(QueryHistoryResponse { queries })
}
