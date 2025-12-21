//! Application state management

use shield_dns_core::cache::DNSCache;
use shield_dns_core::filter::FilterEngine;
use shield_dns_core::resolver::Resolver;
use shield_metrics::MetricsCollector;
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

        info!(
            "Application state initialized - blocklist: {} domains",
            filter.blocklist_size()
        );

        Ok(Self {
            metrics: Arc::new(MetricsCollector::new()),
            start_time: Instant::now(),
            resolver: Arc::new(resolver),
            filter,
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
