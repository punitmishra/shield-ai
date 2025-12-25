//! Domain filtering engine

use ahash::AHashSet;
use parking_lot::RwLock;
use std::sync::Arc;
use tracing::{debug, info};

/// Filter decision for a domain
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FilterDecision {
    Allow,
    Block,
    Unknown,
}

/// Domain filtering engine
pub struct FilterEngine {
    blocklist: Arc<RwLock<AHashSet<String>>>,
    allowlist: Arc<RwLock<AHashSet<String>>>,
    wildcard_blocklist: Arc<RwLock<Vec<String>>>,
    enabled: bool,
}

impl FilterEngine {
    /// Create a new filter engine
    pub fn new() -> Self {
        info!("Initializing filter engine");
        Self {
            blocklist: Arc::new(RwLock::new(AHashSet::new())),
            allowlist: Arc::new(RwLock::new(AHashSet::new())),
            wildcard_blocklist: Arc::new(RwLock::new(Vec::new())),
            enabled: true,
        }
    }

    /// Check if a domain should be filtered - hot path, optimized
    #[inline]
    pub fn check(&self, domain: &str) -> FilterDecision {
        if !self.enabled {
            return FilterDecision::Allow;
        }

        let domain_lower = domain.to_lowercase();

        // Check allowlist first (priority)
        if self.allowlist.read().contains(&domain_lower) {
            debug!("Domain {} in allowlist", domain);
            return FilterDecision::Allow;
        }

        // Check exact match blocklist (O(1) lookup)
        if self.blocklist.read().contains(&domain_lower) {
            debug!("Domain {} in blocklist", domain);
            return FilterDecision::Block;
        }

        // Check wildcard patterns (less common path)
        for pattern in self.wildcard_blocklist.read().iter() {
            if self.matches_wildcard(&domain_lower, pattern) {
                debug!("Domain {} matches wildcard {}", domain, pattern);
                return FilterDecision::Block;
            }
        }

        FilterDecision::Allow
    }

    /// Check if domain matches a wildcard pattern
    #[inline(always)]
    fn matches_wildcard(&self, domain: &str, pattern: &str) -> bool {
        if pattern.starts_with("*.") {
            let suffix = &pattern[2..];
            domain.ends_with(suffix) || domain == &suffix[1..]
        } else {
            domain == pattern
        }
    }

    /// Add domain to blocklist
    pub fn add_to_blocklist(&self, domain: &str) {
        let domain_lower = domain.to_lowercase();
        if domain_lower.starts_with("*.") {
            self.wildcard_blocklist.write().push(domain_lower);
        } else {
            self.blocklist.write().insert(domain_lower);
        }
    }

    /// Remove domain from blocklist
    pub fn remove_from_blocklist(&self, domain: &str) {
        let domain_lower = domain.to_lowercase();
        if domain_lower.starts_with("*.") {
            self.wildcard_blocklist.write().retain(|d| d != &domain_lower);
        } else {
            self.blocklist.write().remove(&domain_lower);
        }
    }

    /// Add domain to allowlist
    pub fn add_to_allowlist(&self, domain: &str) {
        self.allowlist.write().insert(domain.to_lowercase());
    }

    /// Remove domain from allowlist
    pub fn remove_from_allowlist(&self, domain: &str) {
        self.allowlist.write().remove(&domain.to_lowercase());
    }

    /// Get all allowlisted domains
    pub fn get_allowlist(&self) -> Vec<String> {
        self.allowlist.read().iter().cloned().collect()
    }

    /// Check if a domain is blocked (convenience method) - hot path
    #[inline]
    pub fn is_blocked(&self, domain: &str) -> bool {
        self.check(domain) == FilterDecision::Block
    }

    /// Load blocklist from file
    pub fn load_blocklist(&self, path: &str) -> std::io::Result<usize> {
        let content = std::fs::read_to_string(path)?;
        let mut count = 0;

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            self.add_to_blocklist(trimmed);
            count += 1;
        }

        info!("Loaded {} entries from blocklist: {}", count, path);
        Ok(count)
    }

    /// Get blocklist size
    pub fn blocklist_size(&self) -> usize {
        self.blocklist.read().len() + self.wildcard_blocklist.read().len()
    }

    /// Get allowlist size
    pub fn allowlist_size(&self) -> usize {
        self.allowlist.read().len()
    }

    /// Enable or disable filtering
    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
        info!("Filter engine enabled: {}", enabled);
    }

    /// Clear all lists
    pub fn clear(&self) {
        self.blocklist.write().clear();
        self.allowlist.write().clear();
        self.wildcard_blocklist.write().clear();
        info!("Cleared all filter lists");
    }
}

impl Default for FilterEngine {
    fn default() -> Self {
        Self::new()
    }
}
