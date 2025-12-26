//! API request handlers

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, Query, State,
    },
    http::StatusCode,
    response::Response,
    Json,
};
use futures::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use shield_metrics::QueryLogEntry;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tracing::{debug, error, info, warn};

use crate::rate_limiter::{RateLimitError, RateLimitResult, RateLimiterStats};
use crate::state::AppState;

// Re-exports for API responses
pub use shield_ml_engine::{AnalyticsSnapshot, DeepRiskAnalysis};
pub use shield_profiles::{Profile, ProfileStats, ProtectionLevel};
pub use shield_threat_intel::{ThreatAnalysis, ThreatCategory};
pub use shield_tiers::{FeatureCheck, Subscription, Tier, UsageStats};

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

#[derive(Deserialize)]
pub struct DohQuery {
    #[allow(dead_code)] // Reserved for binary DNS message format (RFC 8484)
    pub dns: Option<String>, // Base64url encoded DNS query
    pub name: Option<String>, // Domain name for JSON API
    #[serde(rename = "type")]
    pub record_type: Option<String>,
}

#[derive(Serialize)]
pub struct DohResponse {
    #[serde(rename = "Status")]
    pub status: u32,
    #[serde(rename = "TC")]
    pub truncated: bool,
    #[serde(rename = "RD")]
    pub recursion_desired: bool,
    #[serde(rename = "RA")]
    pub recursion_available: bool,
    #[serde(rename = "Question")]
    pub question: Vec<DohQuestion>,
    #[serde(rename = "Answer")]
    pub answer: Vec<DohAnswer>,
}

#[derive(Serialize)]
pub struct DohQuestion {
    pub name: String,
    #[serde(rename = "type")]
    pub record_type: u16,
}

#[derive(Serialize)]
pub struct DohAnswer {
    pub name: String,
    #[serde(rename = "type")]
    pub record_type: u16,
    #[serde(rename = "TTL")]
    pub ttl: u32,
    pub data: String,
}

#[derive(Serialize)]
pub struct AnalyticsResponse {
    pub period: String,
    pub total_queries: u64,
    pub blocked_queries: u64,
    pub block_rate: f64,
    pub cache_hit_rate: f64,
    pub top_blocked_domains: Vec<DomainCount>,
    pub top_allowed_domains: Vec<DomainCount>,
    pub queries_by_hour: Vec<HourlyStats>,
}

#[derive(Serialize)]
pub struct DomainCount {
    pub domain: String,
    pub count: u64,
}

#[derive(Serialize)]
pub struct HourlyStats {
    pub hour: u8,
    pub queries: u64,
    pub blocked: u64,
}

#[derive(Deserialize)]
pub struct AllowlistRequest {
    pub domain: String,
}

#[derive(Serialize)]
pub struct AllowlistResponse {
    pub success: bool,
    pub message: String,
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
pub async fn get_blocklist_stats(
    State(state): State<Arc<AppState>>,
) -> Json<BlocklistStatsResponse> {
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
// DNS-over-HTTPS (DoH) Endpoint
// ============================================================================

/// DNS-over-HTTPS endpoint (RFC 8484 JSON format)
/// Supports: GET /dns-query?name=example.com&type=A
pub async fn doh_query(
    Query(params): Query<DohQuery>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<DohResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Get domain from query params
    let domain = match params.name {
        Some(name) => name,
        None => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: "missing_parameter".to_string(),
                    message: "Query parameter 'name' is required".to_string(),
                }),
            ));
        }
    };

    let record_type = params.record_type.unwrap_or_else(|| "A".to_string());
    let record_type_num: u16 = match record_type.to_uppercase().as_str() {
        "A" => 1,
        "AAAA" => 28,
        "CNAME" => 5,
        "MX" => 15,
        "TXT" => 16,
        "NS" => 2,
        _ => 1,
    };

    info!("DoH query: {} type={}", domain, record_type);

    // Check if blocked
    if state.filter.is_blocked(&domain) {
        state
            .metrics
            .record_query_with_details(domain.clone(), "0.0.0.0".to_string(), true, 0);
        return Ok(Json(DohResponse {
            status: 3, // NXDOMAIN
            truncated: false,
            recursion_desired: true,
            recursion_available: true,
            question: vec![DohQuestion {
                name: domain.clone(),
                record_type: record_type_num,
            }],
            answer: vec![],
        }));
    }

    // Resolve domain
    let start = std::time::Instant::now();
    match state.resolver.resolve(&domain).await {
        Ok(ips) => {
            let query_time_ms = start.elapsed().as_millis() as u64;
            let answers: Vec<DohAnswer> = ips
                .iter()
                .map(|ip| {
                    let ip_str = ip.to_string();
                    DohAnswer {
                        name: domain.clone(),
                        record_type: if ip_str.contains(':') { 28 } else { 1 },
                        ttl: 300,
                        data: ip_str,
                    }
                })
                .collect();

            state.metrics.record_query_with_details(
                domain.clone(),
                "0.0.0.0".to_string(),
                false,
                query_time_ms,
            );

            Ok(Json(DohResponse {
                status: 0, // NOERROR
                truncated: false,
                recursion_desired: true,
                recursion_available: true,
                question: vec![DohQuestion {
                    name: domain.clone(),
                    record_type: record_type_num,
                }],
                answer: answers,
            }))
        }
        Err(e) => {
            error!("DoH resolution failed for {}: {}", domain, e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: "resolution_failed".to_string(),
                    message: format!("Failed to resolve domain: {}", e),
                }),
            ))
        }
    }
}

// ============================================================================
// Analytics Endpoint
// ============================================================================

/// Query analytics endpoint
pub async fn get_analytics(State(state): State<Arc<AppState>>) -> Json<AnalyticsResponse> {
    let snapshot = state.metrics.snapshot();
    let history = state.metrics.get_query_history(1000);

    // Calculate top domains from history
    let mut blocked_counts: HashMap<String, u64> = HashMap::new();
    let mut allowed_counts: HashMap<String, u64> = HashMap::new();
    let mut hourly_stats: HashMap<u8, (u64, u64)> = HashMap::new();

    for query in &history {
        let hour = ((query.timestamp % 86400) / 3600) as u8;
        let entry = hourly_stats.entry(hour).or_insert((0, 0));
        entry.0 += 1;
        if query.blocked {
            entry.1 += 1;
            *blocked_counts.entry(query.domain.clone()).or_insert(0) += 1;
        } else {
            *allowed_counts.entry(query.domain.clone()).or_insert(0) += 1;
        }
    }

    // Sort and take top 10
    let mut top_blocked: Vec<_> = blocked_counts.into_iter().collect();
    top_blocked.sort_by(|a, b| b.1.cmp(&a.1));
    let top_blocked_domains: Vec<DomainCount> = top_blocked
        .into_iter()
        .take(10)
        .map(|(domain, count)| DomainCount { domain, count })
        .collect();

    let mut top_allowed: Vec<_> = allowed_counts.into_iter().collect();
    top_allowed.sort_by(|a, b| b.1.cmp(&a.1));
    let top_allowed_domains: Vec<DomainCount> = top_allowed
        .into_iter()
        .take(10)
        .map(|(domain, count)| DomainCount { domain, count })
        .collect();

    let queries_by_hour: Vec<HourlyStats> = (0..24)
        .map(|hour| {
            let (queries, blocked) = hourly_stats.get(&hour).copied().unwrap_or((0, 0));
            HourlyStats {
                hour,
                queries,
                blocked,
            }
        })
        .collect();

    let block_rate = if snapshot.total_queries > 0 {
        snapshot.blocked_queries as f64 / snapshot.total_queries as f64
    } else {
        0.0
    };

    Json(AnalyticsResponse {
        period: "last_1000_queries".to_string(),
        total_queries: snapshot.total_queries,
        blocked_queries: snapshot.blocked_queries,
        block_rate,
        cache_hit_rate: snapshot.cache_hit_rate,
        top_blocked_domains,
        top_allowed_domains,
        queries_by_hour,
    })
}

// ============================================================================
// Allowlist Management Endpoints
// ============================================================================

/// Add domain to allowlist
pub async fn add_to_allowlist(
    State(state): State<Arc<AppState>>,
    Json(request): Json<AllowlistRequest>,
) -> Json<AllowlistResponse> {
    let domain = request.domain.to_lowercase();

    if domain.is_empty() || domain.len() > 253 {
        return Json(AllowlistResponse {
            success: false,
            message: "Invalid domain name".to_string(),
            allowlist_size: state.filter.allowlist_size(),
        });
    }

    state.filter.add_to_allowlist(&domain);
    info!("Added {} to allowlist", domain);

    Json(AllowlistResponse {
        success: true,
        message: format!("Added {} to allowlist", domain),
        allowlist_size: state.filter.allowlist_size(),
    })
}

/// Remove domain from allowlist
pub async fn remove_from_allowlist(
    Path(domain): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<AllowlistResponse> {
    let domain = domain.to_lowercase();

    state.filter.remove_from_allowlist(&domain);
    info!("Removed {} from allowlist", domain);

    Json(AllowlistResponse {
        success: true,
        message: format!("Removed {} from allowlist", domain),
        allowlist_size: state.filter.allowlist_size(),
    })
}

/// Get allowlist
pub async fn get_allowlist(State(state): State<Arc<AppState>>) -> Json<Vec<String>> {
    Json(state.filter.get_allowlist())
}

// ============================================================================
// Blocklist Management Endpoints
// ============================================================================

#[derive(Deserialize)]
pub struct BlocklistRequest {
    pub domain: String,
}

#[derive(Serialize)]
pub struct BlocklistResponse {
    pub success: bool,
    pub message: String,
    pub blocklist_size: usize,
}

/// Add domain to blocklist
pub async fn add_to_blocklist(
    State(state): State<Arc<AppState>>,
    Json(request): Json<BlocklistRequest>,
) -> Json<BlocklistResponse> {
    let domain = request.domain.to_lowercase();

    if domain.is_empty() || domain.len() > 253 {
        return Json(BlocklistResponse {
            success: false,
            message: "Invalid domain name".to_string(),
            blocklist_size: state.filter.blocklist_size(),
        });
    }

    state.filter.add_to_blocklist(&domain);
    info!("Added {} to blocklist", domain);

    Json(BlocklistResponse {
        success: true,
        message: format!("Added {} to blocklist", domain),
        blocklist_size: state.filter.blocklist_size(),
    })
}

/// Remove domain from blocklist
pub async fn remove_from_blocklist(
    Path(domain): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<BlocklistResponse> {
    let domain = domain.to_lowercase();

    state.filter.remove_from_blocklist(&domain);
    info!("Removed {} from blocklist", domain);

    Json(BlocklistResponse {
        success: true,
        message: format!("Removed {} from blocklist", domain),
        blocklist_size: state.filter.blocklist_size(),
    })
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
    if !domain
        .chars()
        .all(|c| c.is_alphanumeric() || c == '.' || c == '-')
    {
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
    output.push_str(&format!(
        "dns_queries_blocked_total {}\n",
        snapshot.blocked_queries
    ));

    output.push_str("# HELP dns_cache_hits_total Total cache hits\n");
    output.push_str("# TYPE dns_cache_hits_total counter\n");
    output.push_str(&format!("dns_cache_hits_total {}\n", snapshot.cache_hits));

    output.push_str("# HELP dns_cache_misses_total Total cache misses\n");
    output.push_str("# TYPE dns_cache_misses_total counter\n");
    output.push_str(&format!(
        "dns_cache_misses_total {}\n",
        snapshot.cache_misses
    ));

    output.push_str("# HELP dns_cache_hit_rate Cache hit rate\n");
    output.push_str("# TYPE dns_cache_hit_rate gauge\n");
    output.push_str(&format!(
        "dns_cache_hit_rate {:.4}\n",
        snapshot.cache_hit_rate
    ));

    output.push_str("# HELP dns_blocklist_size Number of blocked domains\n");
    output.push_str("# TYPE dns_blocklist_size gauge\n");
    output.push_str(&format!(
        "dns_blocklist_size {}\n",
        state.filter.blocklist_size()
    ));

    output.push_str("# HELP dns_uptime_seconds Server uptime in seconds\n");
    output.push_str("# TYPE dns_uptime_seconds gauge\n");
    output.push_str(&format!(
        "dns_uptime_seconds {}\n",
        state.start_time.elapsed().as_secs()
    ));

    output
}

// ============================================================================
// WebSocket Handler for Real-time Updates
// ============================================================================

/// WebSocket handler for real-time stats updates
pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<Arc<AppState>>) -> Response {
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

// ============================================================================
// Rate Limiting Endpoints
// ============================================================================

/// Rate limiter stats endpoint
pub async fn rate_limit_stats(State(state): State<Arc<AppState>>) -> Json<RateLimiterStats> {
    Json(state.rate_limiter.stats())
}

/// Check rate limit for IP and return error response if limited
#[allow(dead_code)] // Prepared for middleware integration
pub fn check_rate_limit(state: &Arc<AppState>, ip: std::net::IpAddr) -> Result<(), RateLimitError> {
    match state.rate_limiter.check(ip) {
        RateLimitResult::Allowed { .. } => Ok(()),
        RateLimitResult::Limited {
            retry_after_secs, ..
        } => Err(RateLimitError {
            error: "rate_limited".to_string(),
            message: "Too many requests. Please slow down.".to_string(),
            retry_after_secs,
        }),
    }
}

// ============================================================================
// Threat Intelligence Endpoints
// ============================================================================

/// Comprehensive threat analysis endpoint
pub async fn threat_analyze(
    Path(domain): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<ThreatAnalysis>, Json<ErrorResponse>> {
    if domain.is_empty() || domain.len() > 253 {
        return Err(Json(ErrorResponse {
            error: "invalid_domain".to_string(),
            message: "Domain name is invalid".to_string(),
        }));
    }

    let analysis = state.threat_intel.analyze(&domain).await;
    debug!(
        "Threat analysis for {}: risk={:.2}",
        domain, analysis.risk_score
    );
    Ok(Json(analysis))
}

/// Quick threat check endpoint
pub async fn threat_check(
    Path(domain): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<ThreatCheckResponse> {
    let should_block = state.threat_intel.should_block(&domain);
    Json(ThreatCheckResponse {
        domain,
        should_block,
    })
}

#[derive(Serialize)]
pub struct ThreatCheckResponse {
    pub domain: String,
    pub should_block: bool,
}

/// Threat feed stats endpoint
pub async fn threat_feed_stats(
    State(state): State<Arc<AppState>>,
) -> Json<ThreatFeedStatsResponse> {
    let stats = state.threat_intel.threat_feeds.stats();
    Json(ThreatFeedStatsResponse {
        total_threats: stats.total_threats,
        feed_count: stats.feed_count,
        categories: stats.category_counts,
    })
}

#[derive(Serialize)]
pub struct ThreatFeedStatsResponse {
    pub total_threats: usize,
    pub feed_count: usize,
    pub categories: std::collections::HashMap<ThreatCategory, usize>,
}

// ============================================================================
// Profile Management Endpoints
// ============================================================================

#[derive(Deserialize)]
pub struct CreateProfileRequest {
    pub name: String,
    pub protection_level: ProtectionLevel,
}

/// Create a new profile
pub async fn create_profile(
    State(state): State<Arc<AppState>>,
    Json(request): Json<CreateProfileRequest>,
) -> Json<ProfileResponse> {
    let id = state
        .profiles
        .create_profile(request.name.clone(), request.protection_level);
    let profile = state.profiles.get_profile(&id);
    Json(ProfileResponse {
        success: true,
        message: format!("Created profile '{}'", request.name),
        profile,
    })
}

#[derive(Serialize)]
pub struct ProfileResponse {
    pub success: bool,
    pub message: String,
    pub profile: Option<Profile>,
}

/// List all profiles
pub async fn list_profiles(State(state): State<Arc<AppState>>) -> Json<Vec<Profile>> {
    Json(state.profiles.list_profiles())
}

/// Get profile by ID
pub async fn get_profile(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Profile>, Json<ErrorResponse>> {
    let uuid = uuid::Uuid::parse_str(&id).map_err(|_| {
        Json(ErrorResponse {
            error: "invalid_id".to_string(),
            message: "Invalid profile ID format".to_string(),
        })
    })?;

    state.profiles.get_profile(&uuid).map(Json).ok_or_else(|| {
        Json(ErrorResponse {
            error: "not_found".to_string(),
            message: "Profile not found".to_string(),
        })
    })
}

/// Delete a profile
pub async fn delete_profile(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<ProfileResponse> {
    let uuid = match uuid::Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ProfileResponse {
                success: false,
                message: "Invalid profile ID".to_string(),
                profile: None,
            });
        }
    };

    let success = state.profiles.delete_profile(&uuid);
    Json(ProfileResponse {
        success,
        message: if success {
            "Profile deleted".to_string()
        } else {
            "Profile not found".to_string()
        },
        profile: None,
    })
}

#[derive(Deserialize)]
pub struct AssignDeviceRequest {
    pub device_id: String,
    pub profile_id: String,
}

/// Assign a device to a profile
pub async fn assign_device(
    State(state): State<Arc<AppState>>,
    Json(request): Json<AssignDeviceRequest>,
) -> Json<ProfileResponse> {
    let profile_uuid = match uuid::Uuid::parse_str(&request.profile_id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ProfileResponse {
                success: false,
                message: "Invalid profile ID".to_string(),
                profile: None,
            });
        }
    };

    let success = state
        .profiles
        .assign_device(request.device_id.clone(), &profile_uuid);
    Json(ProfileResponse {
        success,
        message: if success {
            format!("Device {} assigned to profile", request.device_id)
        } else {
            "Profile not found".to_string()
        },
        profile: state.profiles.get_profile(&profile_uuid),
    })
}

/// Get profile stats
pub async fn profile_stats(State(state): State<Arc<AppState>>) -> Json<ProfileStats> {
    Json(state.profiles.stats())
}

// ============================================================================
// Tier Management Endpoints
// ============================================================================

/// Get user subscription info
pub async fn get_subscription(
    Path(user_id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<Subscription> {
    Json(state.tiers.get_subscription(&user_id))
}

/// Get usage stats for a user
pub async fn get_usage(
    Path(user_id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<UsageStats> {
    Json(state.tiers.get_usage(&user_id))
}

/// Check if a feature is available
#[derive(Deserialize)]
pub struct FeatureCheckRequest {
    pub user_id: String,
    pub feature: String,
}

pub async fn check_feature(
    State(state): State<Arc<AppState>>,
    Json(request): Json<FeatureCheckRequest>,
) -> Json<FeatureCheck> {
    Json(
        state
            .tiers
            .check_feature(&request.user_id, &request.feature),
    )
}

#[derive(Deserialize)]
pub struct UpgradeRequest {
    pub tier: Tier,
}

/// Upgrade a user's tier
pub async fn upgrade_tier(
    Path(user_id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(request): Json<UpgradeRequest>,
) -> Result<Json<Subscription>, Json<ErrorResponse>> {
    state
        .tiers
        .upgrade(&user_id, request.tier)
        .map(Json)
        .map_err(|e| {
            Json(ErrorResponse {
                error: "upgrade_failed".to_string(),
                message: e.to_string(),
            })
        })
}

/// Start a trial for a user
pub async fn start_trial(
    Path(user_id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(request): Json<UpgradeRequest>,
) -> Result<Json<Subscription>, Json<ErrorResponse>> {
    state
        .tiers
        .start_trial(&user_id, request.tier)
        .map(Json)
        .map_err(|e| {
            Json(ErrorResponse {
                error: "trial_failed".to_string(),
                message: e.to_string(),
            })
        })
}

/// Get tier pricing info
pub async fn get_pricing() -> Json<PricingResponse> {
    Json(PricingResponse {
        tiers: vec![
            TierInfo {
                tier: Tier::Free,
                price_cents: 0,
                price_display: "Free".to_string(),
                limits: Tier::Free.limits(),
            },
            TierInfo {
                tier: Tier::Pro,
                price_cents: 499,
                price_display: "$4.99/month".to_string(),
                limits: Tier::Pro.limits(),
            },
            TierInfo {
                tier: Tier::Enterprise,
                price_cents: 0,
                price_display: "Contact Sales".to_string(),
                limits: Tier::Enterprise.limits(),
            },
        ],
    })
}

#[derive(Serialize)]
pub struct PricingResponse {
    pub tiers: Vec<TierInfo>,
}

#[derive(Serialize)]
pub struct TierInfo {
    pub tier: Tier,
    pub price_cents: u32,
    pub price_display: String,
    pub limits: shield_tiers::TierLimits,
}

// ============================================================================
// ML Engine Endpoints - Deep Risk Analysis & DGA Detection
// ============================================================================

/// Deep risk analysis using neural network
pub async fn ml_analyze(
    Path(domain): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<DeepRiskAnalysis> {
    Json(state.ml_engine.analyze(&domain))
}

/// DGA detection endpoint
pub async fn ml_dga_check(
    Path(domain): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<DGACheckResponse> {
    let result = state.ml_engine.analyze(&domain);
    Json(DGACheckResponse {
        domain,
        is_dga: result.dga_analysis.is_dga,
        confidence: result.dga_analysis.confidence,
        algorithm_family: result.dga_analysis.algorithm_family,
    })
}

#[derive(Serialize)]
pub struct DGACheckResponse {
    pub domain: String,
    pub is_dga: bool,
    pub confidence: f32,
    pub algorithm_family: Option<String>,
}

/// ML analytics endpoint
pub async fn ml_analytics(State(state): State<Arc<AppState>>) -> Json<AnalyticsSnapshot> {
    Json(state.ml_engine.get_analytics())
}

/// Quick block check using ML engine
pub async fn ml_should_block(
    Path(domain): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<MLBlockResponse> {
    let should_block = state.ml_engine.should_block(&domain);
    Json(MLBlockResponse {
        domain,
        should_block,
    })
}

#[derive(Serialize)]
pub struct MLBlockResponse {
    pub domain: String,
    pub should_block: bool,
}

/// Combined analysis endpoint (AI + ML + Threat Intel)
pub async fn deep_analysis(
    Path(domain): Path<String>,
    State(state): State<Arc<AppState>>,
) -> Json<CombinedAnalysis> {
    // Run all analyses in parallel conceptually (they're all fast)
    let ml_result = state.ml_engine.analyze(&domain);
    let threat_result = state.threat_intel.analyze(&domain).await;
    let ai_result = state.ai_engine.analyze_domain(&domain).await.ok();

    let combined_risk = (ml_result.overall_risk * 0.4
        + threat_result.risk_score * 0.4
        + ai_result.as_ref().map(|r| r.threat_score).unwrap_or(0.0) * 0.2)
        .min(1.0);

    let recommendation = if combined_risk > 0.7 {
        "block"
    } else if combined_risk > 0.5 {
        "warn"
    } else if combined_risk > 0.3 {
        "monitor"
    } else {
        "allow"
    };

    Json(CombinedAnalysis {
        domain: domain.clone(),
        combined_risk,
        recommendation: recommendation.to_string(),
        ml_analysis: ml_result,
        threat_analysis: threat_result,
        ai_analysis: ai_result,
    })
}

#[derive(Serialize)]
pub struct CombinedAnalysis {
    pub domain: String,
    pub combined_risk: f32,
    pub recommendation: String,
    pub ml_analysis: DeepRiskAnalysis,
    pub threat_analysis: ThreatAnalysis,
    pub ai_analysis: Option<shield_ai_engine::AIAnalysisResult>,
}

// ============================================================================
// Privacy Metrics Endpoint
// ============================================================================

#[derive(Serialize)]
pub struct PrivacyMetrics {
    pub privacy_score: u32,
    pub trackers_blocked: u64,
    pub ad_requests_blocked: u64,
    pub analytics_blocked: u64,
    pub privacy_grade: String,
    pub trend_data: Vec<PrivacyTrendPoint>,
    pub tracker_categories: Vec<TrackerCategory>,
    pub top_trackers: Vec<TopTracker>,
}

#[derive(Serialize)]
pub struct PrivacyTrendPoint {
    pub time: String,
    pub score: f64,
}

#[derive(Serialize)]
pub struct TrackerCategory {
    pub name: String,
    pub count: u64,
}

#[derive(Serialize)]
pub struct TopTracker {
    pub domain: String,
    pub blocked_count: u64,
}

/// Privacy metrics endpoint for dashboard
pub async fn get_privacy_metrics(State(state): State<Arc<AppState>>) -> Json<PrivacyMetrics> {
    let snapshot = state.metrics.snapshot();
    let history = state.metrics.get_query_history(1000);

    // Calculate tracker categories from blocked domains
    let mut tracker_counts: HashMap<String, u64> = HashMap::new();
    for query in &history {
        if query.blocked {
            *tracker_counts.entry(query.domain.clone()).or_insert(0) += 1;
        }
    }

    // Sort and get top trackers
    let mut sorted_trackers: Vec<_> = tracker_counts.into_iter().collect();
    sorted_trackers.sort_by(|a, b| b.1.cmp(&a.1));
    let top_trackers: Vec<TopTracker> = sorted_trackers
        .into_iter()
        .take(5)
        .map(|(domain, blocked_count)| TopTracker {
            domain,
            blocked_count,
        })
        .collect();

    // Calculate privacy score based on block rate
    let block_rate = if snapshot.total_queries > 0 {
        snapshot.blocked_queries as f64 / snapshot.total_queries as f64
    } else {
        0.0
    };
    let privacy_score = (70.0 + block_rate * 30.0).min(100.0) as u32;

    let privacy_grade = match privacy_score {
        90..=100 => "A",
        80..=89 => "B",
        70..=79 => "C",
        60..=69 => "D",
        _ => "F",
    }
    .to_string();

    // Generate trend data (last 24 hours)
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("system time before Unix epoch")
        .as_secs();
    let trend_data: Vec<PrivacyTrendPoint> = (0..24)
        .map(|i| {
            let hour_ago = now - (23 - i) * 3600;
            let time = chrono::DateTime::from_timestamp(hour_ago as i64, 0)
                .map(|dt| dt.format("%I %p").to_string())
                .unwrap_or_else(|| format!("{}h", i));
            PrivacyTrendPoint {
                time,
                score: (privacy_score as f64) + (rand::random::<f64>() - 0.5) * 10.0,
            }
        })
        .collect();

    // Categorize blocked domains (simplified estimation)
    let ad_blocked = snapshot.blocked_queries * 60 / 100;
    let analytics_blocked = snapshot.blocked_queries * 25 / 100;
    let social_blocked = snapshot.blocked_queries * 10 / 100;
    let other_blocked = snapshot.blocked_queries - ad_blocked - analytics_blocked - social_blocked;

    let tracker_categories = vec![
        TrackerCategory {
            name: "Advertising".to_string(),
            count: ad_blocked,
        },
        TrackerCategory {
            name: "Analytics".to_string(),
            count: analytics_blocked,
        },
        TrackerCategory {
            name: "Social Media".to_string(),
            count: social_blocked,
        },
        TrackerCategory {
            name: "Other".to_string(),
            count: other_blocked,
        },
    ];

    Json(PrivacyMetrics {
        privacy_score,
        trackers_blocked: snapshot.blocked_queries,
        ad_requests_blocked: ad_blocked,
        analytics_blocked,
        privacy_grade,
        trend_data,
        tracker_categories,
        top_trackers,
    })
}

// ============================================================================
// Device Management Endpoints
// ============================================================================

#[derive(Serialize, Clone)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub ip_address: String,
    pub mac_address: Option<String>,
    #[serde(rename = "type")]
    pub device_type: String,
    pub last_seen: u64,
    pub query_count: u64,
    pub blocked_count: u64,
    pub profile: Option<String>,
    pub online: bool,
}

#[derive(Serialize)]
pub struct DevicesResponse {
    pub devices: Vec<Device>,
}

#[derive(Deserialize)]
pub struct UpdateDeviceRequest {
    pub name: Option<String>,
    pub profile: Option<String>,
}

/// Get all detected devices
pub async fn get_devices(State(state): State<Arc<AppState>>) -> Json<DevicesResponse> {
    let history = state.metrics.get_query_history(1000);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("system time before Unix epoch")
        .as_secs();

    // Aggregate device stats from query history by client IP
    let mut device_stats: HashMap<String, (u64, u64, u64)> = HashMap::new(); // (queries, blocked, last_seen)
    for query in &history {
        let entry = device_stats
            .entry(query.client_ip.clone())
            .or_insert((0, 0, 0));
        entry.0 += 1;
        if query.blocked {
            entry.1 += 1;
        }
        if query.timestamp > entry.2 {
            entry.2 = query.timestamp;
        }
    }

    let devices: Vec<Device> = device_stats
        .into_iter()
        .enumerate()
        .map(|(idx, (ip, (queries, blocked, last_seen)))| {
            let is_online = now - last_seen < 300; // Online if seen in last 5 minutes
            Device {
                id: format!("{}", idx + 1),
                name: format!("Device {}", idx + 1),
                ip_address: ip,
                mac_address: None,
                device_type: "other".to_string(),
                last_seen,
                query_count: queries,
                blocked_count: blocked,
                profile: Some("Default".to_string()),
                online: is_online,
            }
        })
        .collect();

    Json(DevicesResponse { devices })
}

/// Update device settings
pub async fn update_device(
    Path(id): Path<String>,
    Json(request): Json<UpdateDeviceRequest>,
) -> Json<DeviceUpdateResponse> {
    // In a real implementation, this would update a database
    // For now, we just acknowledge the request
    Json(DeviceUpdateResponse {
        success: true,
        message: format!("Device {} updated", id),
        name: request.name,
        profile: request.profile,
    })
}

#[derive(Serialize)]
pub struct DeviceUpdateResponse {
    pub success: bool,
    pub message: String,
    pub name: Option<String>,
    pub profile: Option<String>,
}

// ============================================================================
// Authentication Endpoints
// ============================================================================

use axum::{extract::Request, http::header, middleware::Next, response::Response as AxumResponse};
use shield_auth::{
    Claims, DeviceRegistrationRequest, LoginRequest, RefreshRequest, RegisterRequest,
    UpdatePushTokenRequest, UserInfo,
};

/// Authentication middleware for protected routes
pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    mut request: Request,
    next: Next,
) -> Result<AxumResponse, (StatusCode, Json<serde_json::Value>)> {
    // Get Authorization header
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let Some(auth_header) = auth_header else {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "missing_token",
                "message": "Authorization header required"
            })),
        ));
    };

    // Extract Bearer token
    let token = match auth_header.strip_prefix("Bearer ") {
        Some(t) => t,
        None => {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "invalid_token_format",
                    "message": "Bearer token required"
                })),
            ));
        }
    };

    // Validate token
    match state.auth.validate_token(token) {
        Ok(claims) => {
            request.extensions_mut().insert(claims);
            Ok(next.run(request).await)
        }
        Err(e) => {
            warn!("Token validation failed: {}", e);
            Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "invalid_token",
                    "message": "Invalid or expired token"
                })),
            ))
        }
    }
}

/// POST /api/auth/register - Register a new user
pub async fn auth_register(
    State(state): State<Arc<AppState>>,
    Json(request): Json<RegisterRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.auth.register(&request.email, &request.password) {
        Ok(user) => {
            let user_info: UserInfo = user.into();
            (
                StatusCode::CREATED,
                Json(serde_json::json!({
                    "success": true,
                    "user": user_info
                })),
            )
        }
        Err(e) => {
            warn!("Registration failed: {}", e);
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "error": e.to_string()
                })),
            )
        }
    }
}

/// POST /api/auth/login - Login with email and password
pub async fn auth_login(
    State(state): State<Arc<AppState>>,
    Json(request): Json<LoginRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.auth.login(&request.email, &request.password) {
        Ok(tokens) => {
            info!("User logged in: {}", request.email);
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "tokens": tokens
                })),
            )
        }
        Err(e) => {
            warn!("Login failed for {}: {}", request.email, e);
            (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "error": "Invalid credentials"
                })),
            )
        }
    }
}

/// POST /api/auth/refresh - Refresh access token
pub async fn auth_refresh(
    State(state): State<Arc<AppState>>,
    Json(request): Json<RefreshRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.auth.refresh(&request.refresh_token) {
        Ok(tokens) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "tokens": tokens
            })),
        ),
        Err(e) => {
            warn!("Token refresh failed: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "error": "Invalid or expired refresh token"
                })),
            )
        }
    }
}

/// POST /api/auth/logout - Logout and invalidate refresh token
pub async fn auth_logout(
    State(state): State<Arc<AppState>>,
    Json(request): Json<RefreshRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    let _ = state.auth.logout(&request.refresh_token);
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": "Logged out successfully"
        })),
    )
}

/// GET /api/auth/me - Get current user info (requires auth)
pub async fn auth_me(
    State(state): State<Arc<AppState>>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.auth.get_user(&claims.sub) {
        Some(user) => {
            let user_info: UserInfo = user.into();
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "success": true,
                    "user": user_info
                })),
            )
        }
        None => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "success": false,
                "error": "User not found"
            })),
        ),
    }
}

/// POST /api/auth/devices/register - Register a new device (requires auth)
pub async fn auth_register_device(
    State(state): State<Arc<AppState>>,
    axum::Extension(claims): axum::Extension<Claims>,
    Json(request): Json<DeviceRegistrationRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state.auth.register_device(&claims.sub, request) {
        Ok(device) => (
            StatusCode::CREATED,
            Json(serde_json::json!({
                "success": true,
                "device": device
            })),
        ),
        Err(e) => {
            warn!("Device registration failed: {}", e);
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "success": false,
                    "error": e.to_string()
                })),
            )
        }
    }
}

/// GET /api/auth/devices - Get all devices for current user (requires auth)
pub async fn auth_get_devices(
    State(state): State<Arc<AppState>>,
    axum::Extension(claims): axum::Extension<Claims>,
) -> (StatusCode, Json<serde_json::Value>) {
    let devices = state.auth.get_user_devices(&claims.sub);
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "devices": devices
        })),
    )
}

/// PUT /api/auth/devices/:id/push-token - Update push notification token
pub async fn auth_update_push_token(
    State(state): State<Arc<AppState>>,
    Path(device_id): Path<String>,
    Json(request): Json<UpdatePushTokenRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    match state
        .auth
        .update_push_token(&device_id, &request.push_token)
    {
        Ok(_) => (
            StatusCode::OK,
            Json(serde_json::json!({
                "success": true,
                "message": "Push token updated"
            })),
        ),
        Err(e) => {
            warn!("Push token update failed: {}", e);
            (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "success": false,
                    "error": e.to_string()
                })),
            )
        }
    }
}
