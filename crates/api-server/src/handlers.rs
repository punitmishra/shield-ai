//! API request handlers

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    response::Response,
    Json,
};
use futures::{SinkExt, StreamExt};
use serde::Serialize;
use shield_metrics::QueryLogEntry;
use std::sync::Arc;
use std::time::Duration;
use tracing::{debug, error, info, warn};

use crate::state::AppState;

// ============================================================================
// Response Types
// ============================================================================

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub uptime_seconds: u64,
    pub blocklist_size: usize,
    pub cache_hit_rate: f64,
}

#[derive(Serialize)]
pub struct StatsResponse {
    pub total_queries: u64,
    pub blocked_queries: u64,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub cache_hit_rate: f64,
    pub block_rate: f64,
    pub blocklist_size: usize,
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

#[derive(Serialize)]
pub struct QueryHistoryResponse {
    pub queries: Vec<QueryLogEntry>,
}

#[derive(Serialize)]
pub struct BlocklistStatsResponse {
    pub total_blocked_domains: usize,
    pub allowlist_size: usize,
}

// ============================================================================
// Health & Stats Endpoints
// ============================================================================

/// Health check endpoint
pub async fn health_check(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    let uptime = state.start_time.elapsed().as_secs();

    Json(HealthResponse {
        status: "healthy".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        uptime_seconds: uptime,
        blocklist_size: state.filter.blocklist_size(),
        cache_hit_rate: state.resolver.cache_hit_rate(),
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

    Json(StatsResponse {
        total_queries: snapshot.total_queries,
        blocked_queries: snapshot.blocked_queries,
        cache_hits: snapshot.cache_hits,
        cache_misses: snapshot.cache_misses,
        cache_hit_rate: snapshot.cache_hit_rate,
        block_rate,
        blocklist_size: state.filter.blocklist_size(),
    })
}

/// Query history endpoint
pub async fn get_query_history(State(state): State<Arc<AppState>>) -> Json<QueryHistoryResponse> {
    let queries = state.metrics.get_query_history(100);
    Json(QueryHistoryResponse { queries })
}

/// Blocklist stats endpoint
pub async fn get_blocklist_stats(State(state): State<Arc<AppState>>) -> Json<BlocklistStatsResponse> {
    Json(BlocklistStatsResponse {
        total_blocked_domains: state.filter.blocklist_size(),
        allowlist_size: state.filter.allowlist_size(),
    })
}

// ============================================================================
// AI Analysis Endpoint
// ============================================================================

/// AI-powered domain analysis endpoint
pub async fn analyze_domain(
    Path(domain): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<shield_ai_engine::AIAnalysisResult>, Json<ErrorResponse>> {
    // Validate domain
    if domain.is_empty() || domain.len() > 253 {
        return Err(Json(ErrorResponse {
            error: "invalid_domain".to_string(),
            message: "Domain name is invalid or too long".to_string(),
        }));
    }

    match state.ai_engine.analyze_domain(&domain).await {
        Ok(result) => {
            debug!(
                "AI analysis for {}: threat={:.2}, privacy={}",
                domain, result.threat_score, result.privacy_score.score
            );
            Ok(Json(result))
        }
        Err(e) => {
            error!("AI analysis failed for {}: {}", domain, e);
            Err(Json(ErrorResponse {
                error: "analysis_failed".to_string(),
                message: format!("Failed to analyze domain: {}", e),
            }))
        }
    }
}

// ============================================================================
// DNS Resolution Endpoint
// ============================================================================

/// DNS resolution endpoint with real Hickory DNS resolution
pub async fn resolve_domain(
    Path(domain): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<DnsResolveResponse>, Json<ErrorResponse>> {
    let start = std::time::Instant::now();

    // Validate domain
    if domain.is_empty() || domain.len() > 253 {
        warn!("Invalid domain length: {}", domain.len());
        return Err(Json(ErrorResponse {
            error: "invalid_domain".to_string(),
            message: "Domain name is invalid or too long".to_string(),
        }));
    }

    // Check if domain contains invalid characters
    if !domain.chars().all(|c| c.is_alphanumeric() || c == '.' || c == '-') {
        warn!("Invalid domain characters: {}", domain);
        return Err(Json(ErrorResponse {
            error: "invalid_domain".to_string(),
            message: "Domain contains invalid characters".to_string(),
        }));
    }

    // Check if blocked
    if state.resolver.is_blocked(&domain) {
        let query_time_ms = start.elapsed().as_millis() as u64;
        state.metrics.record_query_with_details(
            domain.clone(),
            "0.0.0.0".to_string(),
            true,
            query_time_ms,
        );

        debug!("Blocked domain: {} in {}ms", domain, query_time_ms);

        return Ok(Json(DnsResolveResponse {
            domain,
            ip_addresses: vec![],
            blocked: true,
            cached: false,
            query_time_ms,
        }));
    }

    // Get cache stats before resolution to detect cache hit
    let (hits_before, _) = state.resolver.cache_stats();

    // Perform DNS resolution
    match state.resolver.resolve(&domain).await {
        Ok(ips) => {
            let query_time_ms = start.elapsed().as_millis() as u64;

            // Check if it was a cache hit
            let (hits_after, _) = state.resolver.cache_stats();
            let cached = hits_after > hits_before;

            if cached {
                state.metrics.record_cache_hit();
            } else {
                state.metrics.record_cache_miss();
            }

            // Log query
            state.metrics.record_query_with_details(
                domain.clone(),
                "0.0.0.0".to_string(),
                false,
                query_time_ms,
            );

            let ip_addresses: Vec<String> = ips.iter().map(|ip| ip.to_string()).collect();

            debug!(
                "Resolved {} to {:?} in {}ms (cached: {})",
                domain, ip_addresses, query_time_ms, cached
            );

            Ok(Json(DnsResolveResponse {
                domain,
                ip_addresses,
                blocked: false,
                cached,
                query_time_ms,
            }))
        }
        Err(e) => {
            let query_time_ms = start.elapsed().as_millis() as u64;
            state.metrics.record_cache_miss();

            // Log failed query
            state.metrics.record_query_with_details(
                domain.clone(),
                "0.0.0.0".to_string(),
                false,
                query_time_ms,
            );

            error!("DNS resolution failed for {}: {}", domain, e);

            Err(Json(ErrorResponse {
                error: "resolution_failed".to_string(),
                message: format!("Failed to resolve domain: {}", e),
            }))
        }
    }
}

// ============================================================================
// Prometheus Metrics Endpoint
// ============================================================================

/// Prometheus metrics endpoint
pub async fn metrics(State(state): State<Arc<AppState>>) -> String {
    let snapshot = state.metrics.snapshot();
    let mut output = String::with_capacity(2048);

    output.push_str("# HELP dns_queries_total Total number of DNS queries\n");
    output.push_str("# TYPE dns_queries_total counter\n");
    output.push_str(&format!("dns_queries_total {}\n", snapshot.total_queries));

    output.push_str("# HELP dns_queries_blocked_total Total blocked queries\n");
    output.push_str("# TYPE dns_queries_blocked_total counter\n");
    output.push_str(&format!("dns_queries_blocked_total {}\n", snapshot.blocked_queries));

    output.push_str("# HELP dns_cache_hits_total Total cache hits\n");
    output.push_str("# TYPE dns_cache_hits_total counter\n");
    output.push_str(&format!("dns_cache_hits_total {}\n", snapshot.cache_hits));

    output.push_str("# HELP dns_cache_misses_total Total cache misses\n");
    output.push_str("# TYPE dns_cache_misses_total counter\n");
    output.push_str(&format!("dns_cache_misses_total {}\n", snapshot.cache_misses));

    output.push_str("# HELP dns_cache_hit_rate Cache hit rate\n");
    output.push_str("# TYPE dns_cache_hit_rate gauge\n");
    output.push_str(&format!("dns_cache_hit_rate {:.4}\n", snapshot.cache_hit_rate));

    output.push_str("# HELP dns_blocklist_size Number of blocked domains\n");
    output.push_str("# TYPE dns_blocklist_size gauge\n");
    output.push_str(&format!("dns_blocklist_size {}\n", state.filter.blocklist_size()));

    output.push_str("# HELP dns_uptime_seconds Server uptime in seconds\n");
    output.push_str("# TYPE dns_uptime_seconds gauge\n");
    output.push_str(&format!("dns_uptime_seconds {}\n", state.start_time.elapsed().as_secs()));

    output
}

// ============================================================================
// WebSocket Handler for Real-time Updates
// ============================================================================

/// WebSocket handler for real-time stats updates
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    info!("WebSocket connection requested");
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

/// Handle WebSocket connection
async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();

    info!("WebSocket connection established");

    // Spawn a task to handle incoming messages
    let recv_task = tokio::spawn(async move {
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Close(_)) => {
                    debug!("WebSocket client closed connection");
                    break;
                }
                Ok(Message::Ping(data)) => {
                    debug!("Received ping from client");
                    // Pong is handled automatically by axum
                    let _ = data;
                }
                Err(e) => {
                    warn!("WebSocket receive error: {}", e);
                    break;
                }
                _ => {}
            }
        }
    });

    // Send stats updates every 2 seconds
    let mut interval = tokio::time::interval(Duration::from_secs(2));
    let mut consecutive_errors = 0;

    loop {
        interval.tick().await;

        let snapshot = state.metrics.snapshot();
        let block_rate = if snapshot.total_queries > 0 {
            snapshot.blocked_queries as f64 / snapshot.total_queries as f64
        } else {
            0.0
        };

        let stats = StatsResponse {
            total_queries: snapshot.total_queries,
            blocked_queries: snapshot.blocked_queries,
            cache_hits: snapshot.cache_hits,
            cache_misses: snapshot.cache_misses,
            cache_hit_rate: snapshot.cache_hit_rate,
            block_rate,
            blocklist_size: state.filter.blocklist_size(),
        };

        match serde_json::to_string(&stats) {
            Ok(json) => {
                if let Err(e) = sender.send(Message::Text(json)).await {
                    warn!("Failed to send WebSocket message: {}", e);
                    consecutive_errors += 1;
                    if consecutive_errors >= 3 {
                        break;
                    }
                } else {
                    consecutive_errors = 0;
                }
            }
            Err(e) => {
                error!("Failed to serialize stats: {}", e);
                break;
            }
        }

        // Check if receiver task is done
        if recv_task.is_finished() {
            break;
        }
    }

    recv_task.abort();
    info!("WebSocket connection closed");
}
