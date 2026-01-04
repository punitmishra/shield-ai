//! Application state management

use crate::background_tasks::{BackgroundTasks, BackgroundTasksConfig, warm_cache};
use crate::rate_limiter::{RateLimiter, RateLimiterConfig};
use crate::webhooks::WebhookManager;
use shield_ai_engine::AIEngine;
use shield_auth::AuthService;
use shield_db::SqliteDb;
use shield_dns_core::cache::DNSCache;
use shield_dns_core::filter::FilterEngine;
use shield_dns_core::resolver::Resolver;
use shield_dns_core::unified_filter::UnifiedFilter;
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
    pub unified_filter: Arc<UnifiedFilter>,
    pub ai_engine: Arc<AIEngine>,
    pub rate_limiter: Arc<RateLimiter>,
    pub threat_intel: Arc<ThreatIntelEngine>,
    pub profiles: Arc<ProfileManager>,
    pub tiers: Arc<TierManager>,
    pub ml_engine: Arc<MLEngine>,
    pub auth: Arc<AuthService>,
    #[allow(dead_code)]
    pub db: Arc<SqliteDb>,
    #[allow(dead_code)]
    background_tasks: Arc<BackgroundTasks>,
    pub webhooks: Arc<WebhookManager>,
}

impl AppState {
    /// Create new application state with async initialization
    pub async fn new() -> anyhow::Result<Self> {
        info!("Initializing application state");

        // Initialize SQLite database first (other services depend on it)
        let db_path =
            std::env::var("DATABASE_PATH").unwrap_or_else(|_| "data/shield.db".to_string());
        let db = Arc::new(SqliteDb::new(&db_path)?);
        info!("SQLite database initialized: {}", db_path);

        // Create DNS cache with 50,000 entries and 5 minute default TTL
        let cache = Arc::new(DNSCache::new(50_000, Duration::from_secs(300)));

        // Create and configure filter engine
        let filter = Arc::new(FilterEngine::new());

        // Load blocklists from files
        Self::load_blocklists(&filter);

        // Load custom blocklist/allowlist from database (persisted entries)
        Self::load_custom_lists_from_db(&filter, &db);

        // Create DNS resolver with cache and filter
        let resolver = Resolver::new(cache, filter.clone()).await?;

        // Initialize unified filter with blocklist support
        let unified_filter = Arc::new(UnifiedFilter::new(filter.clone()));

        // Fetch blocklists asynchronously (non-blocking)
        let uf_clone = unified_filter.clone();
        tokio::spawn(async move {
            match uf_clone.init_blocklists("config/blocklist-sources.json").await {
                Ok(stats) => {
                    info!(
                        "Blocklists loaded: {} domains from {} sources",
                        stats.total_domains, stats.sources_loaded
                    );
                }
                Err(e) => {
                    warn!("Failed to load blocklists, using defaults: {}", e);
                }
            }
        });

        // Initialize AI engine
        let ai_engine = Arc::new(AIEngine::new().await?);
        info!("AI engine initialized");

        // Initialize threat intelligence engine
        let threat_intel = Arc::new(ThreatIntelEngine::new().await?);
        info!("Threat intelligence engine initialized");

        // Initialize ML engine for DGA detection and risk analysis
        let ml_engine = Arc::new(MLEngine::new());
        info!("ML engine initialized");

        // Initialize profile manager with SQLite persistence
        let profiles = Arc::new(ProfileManager::with_sqlite(db.clone()));
        info!("Profile manager initialized (SQLite-backed)");

        // Initialize tier manager with SQLite persistence
        let tiers = Arc::new(TierManager::with_sqlite(db.clone()));
        info!("Tier manager initialized (SQLite-backed)");

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

        // Initialize metrics
        let metrics = Arc::new(MetricsCollector::new());

        // Wrap resolver in Arc for sharing
        let resolver = Arc::new(resolver);

        // Initialize background tasks (blocklist auto-refresh, metrics, etc.)
        let bg_config = BackgroundTasksConfig::default();
        let background_tasks = Arc::new(BackgroundTasks::new(bg_config));
        background_tasks.start(unified_filter.clone(), metrics.clone());
        info!("Background tasks initialized (blocklist refresh every 6 hours)");

        // Start cache warming in background
        let resolver_for_warming = resolver.clone();
        tokio::spawn(async move {
            // Wait a bit for server to stabilize
            tokio::time::sleep(Duration::from_secs(5)).await;
            warm_cache(&resolver_for_warming).await;
        });

        // Initialize webhook manager for threat notifications
        let webhooks = Arc::new(WebhookManager::new());
        info!("Webhook manager initialized");

        info!(
            "Application state initialized - blocklist: {} domains",
            filter.blocklist_size()
        );

        Ok(Self {
            metrics,
            start_time: Instant::now(),
            resolver,
            filter,
            unified_filter,
            ai_engine,
            rate_limiter,
            threat_intel,
            profiles,
            tiers,
            ml_engine,
            auth,
            db,
            background_tasks,
            webhooks,
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

    /// Load custom blocklist/allowlist entries from database
    fn load_custom_lists_from_db(filter: &FilterEngine, db: &SqliteDb) {
        // Load custom blocklist entries
        match db.get_blocklist() {
            Ok(entries) => {
                let count = entries.len();
                for entry in entries {
                    filter.add_to_blocklist(&entry.domain);
                }
                if count > 0 {
                    info!("Loaded {} custom blocklist entries from database", count);
                }
            }
            Err(e) => {
                warn!("Failed to load blocklist from database: {}", e);
            }
        }

        // Load custom allowlist entries
        match db.get_allowlist() {
            Ok(entries) => {
                let count = entries.len();
                for entry in entries {
                    filter.add_to_allowlist(&entry.domain);
                }
                if count > 0 {
                    info!("Loaded {} custom allowlist entries from database", count);
                }
            }
            Err(e) => {
                warn!("Failed to load allowlist from database: {}", e);
            }
        }
    }
}
