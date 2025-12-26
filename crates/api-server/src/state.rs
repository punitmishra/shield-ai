//! Application state management

use crate::rate_limiter::{RateLimiter, RateLimiterConfig};
use shield_ai_engine::AIEngine;
use shield_auth::AuthService;
use shield_db::SqliteDb;
use shield_dns_core::cache::DNSCache;
use shield_dns_core::filter::FilterEngine;
use shield_dns_core::resolver::Resolver;
use shield_metrics::MetricsCollector;
use shield_ml_engine::MLEngine;
use shield_profiles::ProfileManager;
use shield_threat_intel::ThreatIntelEngine;
use shield_tiers::TierManager;
use std::path::Path;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::{info, warn};

/// Shared application state
pub struct AppState {
    pub metrics: Arc<MetricsCollector>,
    pub start_time: Instant,
    pub resolver: Arc<Resolver>,
    pub filter: Arc<FilterEngine>,
    pub ai_engine: Arc<AIEngine>,
    pub rate_limiter: Arc<RateLimiter>,
    pub threat_intel: Arc<ThreatIntelEngine>,
    pub profiles: Arc<ProfileManager>,
    pub tiers: Arc<TierManager>,
    pub ml_engine: Arc<MLEngine>,
    pub auth: Arc<AuthService>,
    #[allow(dead_code)]
    pub db: Arc<SqliteDb>,
}

impl AppState {
    /// Create new application state with async initialization
    pub async fn new() -> anyhow::Result<Self> {
        info!("Initializing application state");

        // Create DNS cache with 50,000 entries and 5 minute default TTL
        let cache = Arc::new(DNSCache::new(50_000, Duration::from_secs(300)));

        // Create and configure filter engine
        let filter = Arc::new(FilterEngine::new());

        // Load blocklists if they exist
        Self::load_blocklists(&filter);

        // Create DNS resolver with cache and filter
        let resolver = Resolver::new(cache, filter.clone()).await?;

        // Initialize AI engine
        let ai_engine = Arc::new(AIEngine::new().await?);
        info!("AI engine initialized");

        // Initialize threat intelligence engine
        let threat_intel = Arc::new(ThreatIntelEngine::new().await?);
        info!("Threat intelligence engine initialized");

        // Initialize profile manager
        let profiles = Arc::new(ProfileManager::new());
        info!("Profile manager initialized");

        // Initialize tier manager
        let tiers = Arc::new(TierManager::new());
        info!("Tier manager initialized");

        // Initialize ML engine for DGA detection and risk analysis
        let ml_engine = Arc::new(MLEngine::new());
        info!("ML engine initialized");

        // Initialize SQLite database
        let db_path =
            std::env::var("DATABASE_PATH").unwrap_or_else(|_| "data/shield.db".to_string());
        let db = Arc::new(SqliteDb::new(&db_path)?);
        info!("SQLite database initialized: {}", db_path);

        // Initialize authentication service with SQLite persistence
        let jwt_secret = std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| "shield-ai-default-jwt-secret-change-in-production".to_string());
        let auth = Arc::new(AuthService::with_sqlite(&jwt_secret, db.clone()));
        info!("Authentication service initialized (SQLite-backed)");

        // Initialize rate limiter (100 requests per minute per IP)
        let rate_limiter = Arc::new(RateLimiter::with_config(RateLimiterConfig {
            max_requests: 100,
            window: Duration::from_secs(60),
            cleanup_interval: Duration::from_secs(300),
        }));
        info!("Rate limiter initialized");

        info!(
            "Application state initialized - blocklist: {} domains",
            filter.blocklist_size()
        );

        Ok(Self {
            metrics: Arc::new(MetricsCollector::new()),
            start_time: Instant::now(),
            resolver: Arc::new(resolver),
            filter,
            ai_engine,
            rate_limiter,
            threat_intel,
            profiles,
            tiers,
            ml_engine,
            auth,
            db,
        })
    }

    /// Load blocklists from config directory
    fn load_blocklists(filter: &FilterEngine) {
        let blocklist_dir = Path::new("config/blocklists");

        if !blocklist_dir.exists() {
            warn!("Blocklist directory not found: {:?}", blocklist_dir);
            return;
        }

        let blocklist_files = [
            "malware.txt",
            "ads.txt",
            "phishing.txt",
            "tracking.txt",
            "social-trackers.txt",
            "cryptominers.txt",
            "gambling.txt",
        ];

        for filename in &blocklist_files {
            let path = blocklist_dir.join(filename);
            if path.exists() {
                match filter.load_blocklist(path.to_str().unwrap_or("")) {
                    Ok(count) => info!("Loaded {} domains from {}", count, filename),
                    Err(e) => warn!("Failed to load {}: {}", filename, e),
                }
            }
        }
    }
}
