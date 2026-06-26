//! Blocklist fetcher - downloads and parses remote blocklists
//!
//! Fetches blocklists from configured sources and maintains them

use ahash::AHashSet;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::{debug, error, info, warn};

/// Blocklist source configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlocklistSource {
    pub name: String,
    pub url: String,
    pub category: String,
    pub format: String,
    pub enabled: bool,
    #[serde(default)]
    pub description: String,
}

/// Blocklist sources configuration file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlocklistConfig {
    pub sources: Vec<BlocklistSource>,
    #[serde(default = "default_update_interval")]
    pub update_interval_hours: u32,
    #[serde(default)]
    pub last_updated: Option<String>,
    #[serde(default)]
    pub categories: HashMap<String, CategoryConfig>,
    #[serde(default)]
    pub presets: HashMap<String, PresetConfig>,
}

fn default_update_interval() -> u32 {
    24
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryConfig {
    pub description: String,
    #[serde(default = "default_priority")]
    pub priority: u8,
}

fn default_priority() -> u8 {
    2
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PresetConfig {
    pub description: String,
    pub enabled_categories: Vec<String>,
}

/// Statistics for blocklist loading
#[derive(Debug, Clone, Default, Serialize)]
pub struct BlocklistStats {
    pub total_domains: usize,
    pub by_category: HashMap<String, usize>,
    pub sources_loaded: usize,
    pub sources_failed: usize,
    pub last_update: Option<u64>,
}

/// Category-aware blocklist manager
pub struct BlocklistManager {
    /// Domains by category for quick lookup
    domains_by_category: Arc<RwLock<HashMap<String, AHashSet<String>>>>,
    /// All blocked domains (flat set for O(1) lookup)
    all_blocked: Arc<RwLock<AHashSet<String>>>,
    /// Wildcard patterns by category
    wildcards_by_category: Arc<RwLock<HashMap<String, Vec<String>>>>,
    /// Currently enabled categories
    enabled_categories: Arc<RwLock<AHashSet<String>>>,
    /// Statistics
    stats: Arc<RwLock<BlocklistStats>>,
    /// Last fetch time
    last_fetch: Arc<RwLock<Option<Instant>>>,
}

impl BlocklistManager {
    /// Create a new blocklist manager
    pub fn new() -> Self {
        info!("Initializing BlocklistManager");
        Self {
            domains_by_category: Arc::new(RwLock::new(HashMap::new())),
            all_blocked: Arc::new(RwLock::new(AHashSet::new())),
            wildcards_by_category: Arc::new(RwLock::new(HashMap::new())),
            enabled_categories: Arc::new(RwLock::new(AHashSet::from_iter(vec![
                "ads".to_string(),
                "malware".to_string(),
                "phishing".to_string(),
                "tracking".to_string(),
            ]))),
            stats: Arc::new(RwLock::new(BlocklistStats::default())),
            last_fetch: Arc::new(RwLock::new(None)),
        }
    }

    /// Load blocklist configuration from file
    pub fn load_config(path: &str) -> Result<BlocklistConfig, std::io::Error> {
        let content = std::fs::read_to_string(path)?;
        serde_json::from_str(&content).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())
        })
    }

    /// Fetch all enabled blocklists from remote sources
    pub async fn fetch_blocklists(&self, config: &BlocklistConfig) -> BlocklistStats {
        info!("Fetching blocklists from {} sources", config.sources.len());

        let mut stats = BlocklistStats::default();
        let client = match reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                error!("Failed to create HTTP client: {}", e);
                return stats;
            }
        };

        for source in &config.sources {
            if !source.enabled {
                debug!("Skipping disabled source: {}", source.name);
                continue;
            }

            match self.fetch_single_source(&client, source).await {
                Ok(count) => {
                    info!("Loaded {} domains from {} ({})", count, source.name, source.category);
                    *stats.by_category.entry(source.category.clone()).or_insert(0) += count;
                    stats.sources_loaded += 1;
                }
                Err(e) => {
                    warn!("Failed to fetch {}: {}", source.name, e);
                    stats.sources_failed += 1;
                }
            }
        }

        // Rebuild the flat blocked set from enabled categories
        self.rebuild_blocked_set();

        stats.total_domains = self.all_blocked.read().len();
        stats.last_update = Some(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        );

        *self.stats.write() = stats.clone();
        *self.last_fetch.write() = Some(Instant::now());

        info!(
            "Blocklist fetch complete: {} domains across {} categories",
            stats.total_domains,
            stats.by_category.len()
        );

        stats
    }

    /// Fetch a single blocklist source
    async fn fetch_single_source(
        &self,
        client: &reqwest::Client,
        source: &BlocklistSource,
    ) -> Result<usize, Box<dyn std::error::Error + Send + Sync>> {
        let response = client.get(&source.url).send().await?;

        if !response.status().is_success() {
            return Err(format!("HTTP {}", response.status()).into());
        }

        let content = response.text().await?;
        let domains = self.parse_blocklist(&content, &source.format);

        let count = domains.len();

        // Add to category-specific set
        {
            let mut by_cat = self.domains_by_category.write();
            let cat_set = by_cat.entry(source.category.clone()).or_insert_with(AHashSet::new);
            for domain in domains {
                if domain.starts_with("*.") {
                    // Handle wildcard patterns
                    let mut wildcards = self.wildcards_by_category.write();
                    let wc_list = wildcards.entry(source.category.clone()).or_insert_with(Vec::new);
                    wc_list.push(domain);
                } else {
                    cat_set.insert(domain);
                }
            }
        }

        Ok(count)
    }

    /// Parse blocklist content based on format
    fn parse_blocklist(&self, content: &str, format: &str) -> Vec<String> {
        let mut domains = Vec::new();

        for line in content.lines() {
            if let Some(domain) = self.parse_line(line, format) {
                domains.push(domain);
            }
        }

        domains
    }

    /// Parse a single line based on format
    fn parse_line(&self, line: &str, format: &str) -> Option<String> {
        let trimmed = line.trim();

        // Skip empty lines and comments
        if trimmed.is_empty()
            || trimmed.starts_with('#')
            || trimmed.starts_with('!')
            || trimmed.starts_with('[')
        {
            return None;
        }

        match format {
            "hosts" => self.parse_hosts_line(trimmed),
            "adblock" => self.parse_adblock_line(trimmed),
            "domains" => self.parse_domain_line(trimmed),
            _ => self.parse_domain_line(trimmed),
        }
    }

    /// Parse hosts file format: "0.0.0.0 domain.com" or "127.0.0.1 domain.com"
    fn parse_hosts_line(&self, line: &str) -> Option<String> {
        if line.starts_with("0.0.0.0")
            || line.starts_with("127.0.0.1")
            || line.starts_with("::1")
            || line.starts_with("::0")
            || line.starts_with("::")
        {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let domain = parts[1].to_lowercase();
                // Skip localhost entries
                if domain != "localhost"
                    && domain != "localhost.localdomain"
                    && domain != "local"
                    && domain != "broadcasthost"
                    && !domain.is_empty()
                    && domain.contains('.')
                {
                    return Some(domain);
                }
            }
        }
        None
    }

    /// Parse AdBlock format: "||example.com^"
    fn parse_adblock_line(&self, line: &str) -> Option<String> {
        // Skip complex rules with options
        if line.contains('$') || line.contains('/') || line.contains('*') && !line.starts_with("||") {
            return None;
        }

        if line.starts_with("||") && line.ends_with('^') {
            let domain = line
                .trim_start_matches("||")
                .trim_end_matches('^')
                .to_lowercase();
            if !domain.is_empty() && domain.contains('.') {
                return Some(domain);
            }
        }
        None
    }

    /// Parse plain domain format
    fn parse_domain_line(&self, line: &str) -> Option<String> {
        // Remove inline comments
        let domain = line.split('#').next()?.trim().to_lowercase();

        if !domain.is_empty() && (domain.contains('.') || domain.starts_with("*.")) {
            Some(domain)
        } else {
            None
        }
    }

    /// Rebuild the flat blocked set from enabled categories
    fn rebuild_blocked_set(&self) {
        let enabled = self.enabled_categories.read();
        let by_cat = self.domains_by_category.read();

        let mut blocked = self.all_blocked.write();
        blocked.clear();

        for cat in enabled.iter() {
            if let Some(cat_domains) = by_cat.get(cat) {
                for domain in cat_domains.iter() {
                    blocked.insert(domain.clone());
                }
            }
        }
    }

    /// Check if a domain is blocked (considers enabled categories)
    pub fn is_blocked(&self, domain: &str) -> bool {
        let domain_lower = domain.to_lowercase();

        // Check exact match first (O(1))
        if self.all_blocked.read().contains(&domain_lower) {
            return true;
        }

        // Check wildcard patterns
        let enabled = self.enabled_categories.read();
        let wildcards = self.wildcards_by_category.read();

        for cat in enabled.iter() {
            if let Some(patterns) = wildcards.get(cat) {
                for pattern in patterns {
                    if self.matches_wildcard(&domain_lower, pattern) {
                        return true;
                    }
                }
            }
        }

        false
    }

    /// Check if a domain is blocked by a specific category
    pub fn is_blocked_by_category(&self, domain: &str, category: &str) -> bool {
        let domain_lower = domain.to_lowercase();

        if let Some(cat_domains) = self.domains_by_category.read().get(category) {
            if cat_domains.contains(&domain_lower) {
                return true;
            }
        }

        // Check wildcards for this category
        if let Some(patterns) = self.wildcards_by_category.read().get(category) {
            for pattern in patterns {
                if self.matches_wildcard(&domain_lower, pattern) {
                    return true;
                }
            }
        }

        false
    }

    /// Get which category blocks a domain
    pub fn get_blocking_category(&self, domain: &str) -> Option<String> {
        let domain_lower = domain.to_lowercase();
        let enabled = self.enabled_categories.read();

        // Check exact matches
        for cat in enabled.iter() {
            if let Some(cat_domains) = self.domains_by_category.read().get(cat) {
                if cat_domains.contains(&domain_lower) {
                    return Some(cat.clone());
                }
            }
        }

        // Check wildcards
        for cat in enabled.iter() {
            if let Some(patterns) = self.wildcards_by_category.read().get(cat) {
                for pattern in patterns {
                    if self.matches_wildcard(&domain_lower, pattern) {
                        return Some(cat.clone());
                    }
                }
            }
        }

        None
    }

    /// Check wildcard pattern match
    #[inline(always)]
    fn matches_wildcard(&self, domain: &str, pattern: &str) -> bool {
        if let Some(suffix) = pattern.strip_prefix("*.") {
            domain.ends_with(suffix) || domain == suffix
        } else {
            domain == pattern
        }
    }

    /// Enable a category
    pub fn enable_category(&self, category: &str) {
        self.enabled_categories.write().insert(category.to_string());
        self.rebuild_blocked_set();
    }

    /// Disable a category
    pub fn disable_category(&self, category: &str) {
        self.enabled_categories.write().remove(category);
        self.rebuild_blocked_set();
    }

    /// Set enabled categories from list
    pub fn set_enabled_categories(&self, categories: &[String]) {
        let mut enabled = self.enabled_categories.write();
        enabled.clear();
        for cat in categories {
            enabled.insert(cat.clone());
        }
        drop(enabled);
        self.rebuild_blocked_set();
    }

    /// Get enabled categories
    pub fn get_enabled_categories(&self) -> Vec<String> {
        self.enabled_categories.read().iter().cloned().collect()
    }

    /// Get statistics
    pub fn stats(&self) -> BlocklistStats {
        self.stats.read().clone()
    }

    /// Get total blocked domain count
    pub fn blocked_count(&self) -> usize {
        self.all_blocked.read().len()
    }

    /// Add a custom domain to a category
    pub fn add_domain(&self, domain: &str, category: &str) {
        let domain_lower = domain.to_lowercase();

        // Add to category
        self.domains_by_category
            .write()
            .entry(category.to_string())
            .or_insert_with(AHashSet::new)
            .insert(domain_lower.clone());

        // Add to blocked set if category is enabled
        if self.enabled_categories.read().contains(category) {
            self.all_blocked.write().insert(domain_lower);
        }
    }

    /// Remove a domain from all categories
    pub fn remove_domain(&self, domain: &str) {
        let domain_lower = domain.to_lowercase();

        // Remove from all categories
        for (_, domains) in self.domains_by_category.write().iter_mut() {
            domains.remove(&domain_lower);
        }

        // Remove from blocked set
        self.all_blocked.write().remove(&domain_lower);
    }

    /// Load embedded/default blocklist (common ad domains)
    pub fn load_default_blocklist(&self) {
        info!("Loading default embedded blocklist");

        // Common ad and tracking domains as fallback
        let default_ads = [
            "doubleclick.net",
            "googlesyndication.com",
            "googleadservices.com",
            "google-analytics.com",
            "googletagmanager.com",
            "googletagservices.com",
            "facebook.com/tr",
            "ads.facebook.com",
            "pixel.facebook.com",
            "analytics.facebook.com",
            "adsserver.com",
            "adservice.google.com",
            "pagead2.googlesyndication.com",
            "tpc.googlesyndication.com",
            "ad.doubleclick.net",
            "stats.g.doubleclick.net",
            "pubads.g.doubleclick.net",
            "securepubads.g.doubleclick.net",
            "ade.googlesyndication.com",
            "adnxs.com",
            "advertising.com",
            "rubiconproject.com",
            "openx.net",
            "pubmatic.com",
            "criteo.com",
            "taboola.com",
            "outbrain.com",
            "amazon-adsystem.com",
            "moatads.com",
            "scorecardresearch.com",
            "quantserve.com",
            "serving-sys.com",
            "adsrvr.org",
            "bidswitch.net",
            "casalemedia.com",
            "contextweb.com",
            "demdex.net",
            "dotomi.com",
            "exelator.com",
            "everesttech.net",
            "eyeota.net",
            "krxd.net",
            "liadm.com",
            "mathtag.com",
            "mediamath.com",
            "mookie1.com",
            "nexac.com",
            "rlcdn.com",
            "rfihub.com",
            "sharethrough.com",
            "simpli.fi",
            "spotxchange.com",
            "springserve.com",
            "tapad.com",
            "tidaltv.com",
            "tremorhub.com",
            "tribalfusion.com",
            "w55c.net",
            "yieldmo.com",
        ];

        let default_tracking = [
            "google-analytics.com",
            "analytics.google.com",
            "hotjar.com",
            "mixpanel.com",
            "segment.io",
            "segment.com",
            "amplitude.com",
            "heap.io",
            "heapanalytics.com",
            "fullstory.com",
            "mouseflow.com",
            "crazyegg.com",
            "luckyorange.com",
            "clicktale.net",
            "inspectlet.com",
            "logrocket.com",
            "smartlook.com",
            "clarity.ms",
            "newrelic.com",
            "nr-data.net",
            "bugsnag.com",
            "sentry.io",
            "rollbar.com",
        ];

        // Add to categories
        for domain in default_ads {
            self.add_domain(domain, "ads");
        }
        for domain in default_tracking {
            self.add_domain(domain, "tracking");
        }

        info!("Loaded {} default domains", default_ads.len() + default_tracking.len());
    }
}

impl Default for BlocklistManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hosts_parsing() {
        let manager = BlocklistManager::new();

        assert_eq!(
            manager.parse_hosts_line("0.0.0.0 ads.example.com"),
            Some("ads.example.com".to_string())
        );
        assert_eq!(
            manager.parse_hosts_line("127.0.0.1 tracker.com"),
            Some("tracker.com".to_string())
        );
        assert_eq!(manager.parse_hosts_line("127.0.0.1 localhost"), None);
    }

    #[test]
    fn test_adblock_parsing() {
        let manager = BlocklistManager::new();

        assert_eq!(
            manager.parse_adblock_line("||ads.example.com^"),
            Some("ads.example.com".to_string())
        );
        assert_eq!(manager.parse_adblock_line("! comment"), None);
    }

    #[test]
    fn test_domain_blocking() {
        let manager = BlocklistManager::new();
        manager.add_domain("ads.example.com", "ads");

        assert!(manager.is_blocked("ads.example.com"));
        assert!(!manager.is_blocked("clean.example.com"));
    }

    #[test]
    fn test_category_filtering() {
        let manager = BlocklistManager::new();
        manager.add_domain("adult.example.com", "adult");

        // Adult not enabled by default
        assert!(!manager.is_blocked("adult.example.com"));

        // Enable adult category
        manager.enable_category("adult");
        assert!(manager.is_blocked("adult.example.com"));
    }
}
