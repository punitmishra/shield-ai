//! Background tasks for Shield AI
//!
//! Handles scheduled tasks like blocklist refresh, cache warming, and analytics

use shield_dns_core::unified_filter::UnifiedFilter;
use shield_metrics::MetricsCollector;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::watch;
use tracing::{debug, error, info, warn};

/// Configuration for background tasks
#[derive(Clone)]
pub struct BackgroundTasksConfig {
    /// Interval for blocklist refresh (default: 6 hours)
    pub blocklist_refresh_interval: Duration,
    /// Interval for metrics aggregation (default: 1 minute)
    pub metrics_aggregation_interval: Duration,
    /// Interval for cache stats logging (default: 5 minutes)
    pub cache_stats_interval: Duration,
    /// Enable blocklist auto-refresh
    pub enable_blocklist_refresh: bool,
    /// Enable cache warming
    pub enable_cache_warming: bool,
}

impl Default for BackgroundTasksConfig {
    fn default() -> Self {
        Self {
            blocklist_refresh_interval: Duration::from_secs(6 * 60 * 60), // 6 hours
            metrics_aggregation_interval: Duration::from_secs(60),         // 1 minute
            cache_stats_interval: Duration::from_secs(5 * 60),             // 5 minutes
            enable_blocklist_refresh: true,
            enable_cache_warming: true,
        }
    }
}

/// Background task manager
pub struct BackgroundTasks {
    shutdown_tx: watch::Sender<bool>,
    config: BackgroundTasksConfig,
}

impl BackgroundTasks {
    /// Create a new background task manager
    pub fn new(config: BackgroundTasksConfig) -> Self {
        let (shutdown_tx, _) = watch::channel(false);
        Self {
            shutdown_tx,
            config,
        }
    }

    /// Start all background tasks
    pub fn start(
        &self,
        unified_filter: Arc<UnifiedFilter>,
        metrics: Arc<MetricsCollector>,
    ) {
        info!("Starting background tasks");

        // Start blocklist auto-refresh task
        if self.config.enable_blocklist_refresh {
            self.start_blocklist_refresh(unified_filter.clone());
        }

        // Start metrics aggregation task
        self.start_metrics_aggregation(metrics.clone());

        // Start cache stats logging task
        self.start_cache_stats_logging(unified_filter);

        info!("Background tasks started successfully");
    }

    /// Start the blocklist auto-refresh background task
    fn start_blocklist_refresh(&self, unified_filter: Arc<UnifiedFilter>) {
        let interval = self.config.blocklist_refresh_interval;
        let mut shutdown_rx = self.shutdown_tx.subscribe();

        tokio::spawn(async move {
            info!(
                "Blocklist auto-refresh enabled (interval: {} hours)",
                interval.as_secs() / 3600
            );

            loop {
                tokio::select! {
                    _ = tokio::time::sleep(interval) => {
                        info!("Scheduled blocklist refresh starting...");
                        match unified_filter.init_blocklists("config/blocklist-sources.json").await {
                            Ok(stats) => {
                                info!(
                                    "Scheduled blocklist refresh complete: {} domains from {} sources ({} failed)",
                                    stats.total_domains,
                                    stats.sources_loaded,
                                    stats.sources_failed
                                );
                            }
                            Err(e) => {
                                error!("Scheduled blocklist refresh failed: {}", e);
                            }
                        }
                    }
                    _ = shutdown_rx.changed() => {
                        info!("Blocklist refresh task shutting down");
                        break;
                    }
                }
            }
        });
    }

    /// Start metrics aggregation background task
    fn start_metrics_aggregation(&self, metrics: Arc<MetricsCollector>) {
        let interval = self.config.metrics_aggregation_interval;
        let mut shutdown_rx = self.shutdown_tx.subscribe();

        tokio::spawn(async move {
            debug!("Metrics aggregation task started (interval: {} seconds)", interval.as_secs());

            loop {
                tokio::select! {
                    _ = tokio::time::sleep(interval) => {
                        // Log current metrics periodically
                        let snapshot = metrics.snapshot();
                        let block_rate = if snapshot.total_queries > 0 {
                            snapshot.blocked_queries as f64 / snapshot.total_queries as f64
                        } else {
                            0.0
                        };

                        debug!(
                            "Metrics snapshot: queries={}, blocked={} ({:.1}%), cache_hit_rate={:.1}%",
                            snapshot.total_queries,
                            snapshot.blocked_queries,
                            block_rate * 100.0,
                            snapshot.cache_hit_rate * 100.0
                        );
                    }
                    _ = shutdown_rx.changed() => {
                        info!("Metrics aggregation task shutting down");
                        break;
                    }
                }
            }
        });
    }

    /// Start cache stats logging background task
    fn start_cache_stats_logging(&self, unified_filter: Arc<UnifiedFilter>) {
        let interval = self.config.cache_stats_interval;
        let mut shutdown_rx = self.shutdown_tx.subscribe();

        tokio::spawn(async move {
            debug!("Cache stats logging task started (interval: {} seconds)", interval.as_secs());

            loop {
                tokio::select! {
                    _ = tokio::time::sleep(interval) => {
                        let stats = unified_filter.stats();
                        info!(
                            "Blocklist stats: {} total domains, enabled categories: {:?}",
                            stats.total_blocked_domains,
                            unified_filter.get_enabled_categories()
                        );
                    }
                    _ = shutdown_rx.changed() => {
                        info!("Cache stats logging task shutting down");
                        break;
                    }
                }
            }
        });
    }

    /// Signal shutdown to all background tasks
    pub fn shutdown(&self) {
        info!("Signaling shutdown to background tasks");
        let _ = self.shutdown_tx.send(true);
    }
}

/// Popular domains for cache warming
pub const POPULAR_DOMAINS: &[&str] = &[
    // Search & Navigation
    "google.com",
    "www.google.com",
    "bing.com",
    "duckduckgo.com",
    // Social Media
    "facebook.com",
    "twitter.com",
    "instagram.com",
    "linkedin.com",
    "reddit.com",
    // Video & Entertainment
    "youtube.com",
    "netflix.com",
    "spotify.com",
    "twitch.tv",
    // Productivity
    "github.com",
    "stackoverflow.com",
    "slack.com",
    "zoom.us",
    "microsoft.com",
    "office.com",
    // E-commerce
    "amazon.com",
    "ebay.com",
    // News
    "cnn.com",
    "bbc.com",
    "nytimes.com",
    // Cloud services
    "cloudflare.com",
    "aws.amazon.com",
    "azure.microsoft.com",
    // Email
    "gmail.com",
    "outlook.com",
    "mail.google.com",
];

/// Warm the DNS cache with popular domains
pub async fn warm_cache(resolver: &shield_dns_core::resolver::Resolver) {
    info!("Starting cache warming with {} popular domains", POPULAR_DOMAINS.len());
    let start = std::time::Instant::now();
    let mut success = 0;
    let mut failed = 0;

    for domain in POPULAR_DOMAINS {
        match resolver.resolve(domain).await {
            Ok(_) => {
                success += 1;
                debug!("Cache warmed: {}", domain);
            }
            Err(e) => {
                failed += 1;
                warn!("Cache warming failed for {}: {}", domain, e);
            }
        }
        // Small delay to avoid overwhelming upstream DNS
        tokio::time::sleep(Duration::from_millis(50)).await;
    }

    info!(
        "Cache warming complete: {} resolved, {} failed out of {} domains in {:?}",
        success,
        failed,
        POPULAR_DOMAINS.len(),
        start.elapsed()
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = BackgroundTasksConfig::default();
        assert_eq!(config.blocklist_refresh_interval, Duration::from_secs(6 * 60 * 60));
        assert!(config.enable_blocklist_refresh);
        assert!(config.enable_cache_warming);
    }

    #[test]
    fn test_popular_domains_not_empty() {
        assert!(!POPULAR_DOMAINS.is_empty());
        assert!(POPULAR_DOMAINS.len() >= 20);
    }
}
