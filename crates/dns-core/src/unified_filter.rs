//! Unified Filter Engine
//!
//! Combines global blocklists, category-based filtering, and per-device profiles
//! into a single high-performance filter.

use crate::blocklist_fetcher::{BlocklistManager, BlocklistStats};
use crate::filter::{FilterDecision, FilterEngine};
use ahash::AHashMap;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::sync::Arc;
use tracing::{debug, info, warn};

/// Filter result with detailed information
#[derive(Debug, Clone, Serialize)]
pub struct FilterResult {
    /// The decision (allow/block)
    pub decision: FilterDecision,
    /// Reason for the decision
    pub reason: FilterReason,
    /// Which category blocked it (if blocked)
    pub category: Option<String>,
    /// Profile that made the decision (if any)
    pub profile_id: Option<String>,
    /// Profile name
    pub profile_name: Option<String>,
}

/// Reason for the filter decision
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FilterReason {
    /// Domain is on global allowlist
    GlobalAllowlist,
    /// Domain is on profile allowlist
    ProfileAllowlist,
    /// Domain is on global blocklist
    GlobalBlocklist,
    /// Domain blocked by category (ads, malware, etc.)
    CategoryBlock,
    /// Domain blocked by profile rules
    ProfileBlock,
    /// Domain blocked by time-based rule
    TimeBasedRule,
    /// No matching rules - allowed by default
    DefaultAllow,
}

/// Device profile configuration for filtering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceProfile {
    pub id: String,
    pub name: String,
    /// Categories to block for this device (overrides global)
    pub blocked_categories: Vec<String>,
    /// Additional domains to block
    pub custom_blocklist: Vec<String>,
    /// Domains to always allow (overrides blocks)
    pub custom_allowlist: Vec<String>,
    /// Whether this profile is enabled
    pub enabled: bool,
}

impl Default for DeviceProfile {
    fn default() -> Self {
        Self {
            id: "default".to_string(),
            name: "Default".to_string(),
            blocked_categories: vec![
                "ads".to_string(),
                "malware".to_string(),
                "phishing".to_string(),
                "tracking".to_string(),
            ],
            custom_blocklist: vec![],
            custom_allowlist: vec![],
            enabled: true,
        }
    }
}

/// Unified filter combining all filtering sources
pub struct UnifiedFilter {
    /// The blocklist manager for category-based blocking
    blocklist_manager: Arc<BlocklistManager>,
    /// Legacy filter engine for compatibility
    legacy_filter: Arc<FilterEngine>,
    /// Device IP to profile mapping
    device_profiles: Arc<RwLock<AHashMap<IpAddr, DeviceProfile>>>,
    /// Device ID (string) to profile mapping
    device_id_profiles: Arc<RwLock<AHashMap<String, DeviceProfile>>>,
    /// Default profile for unknown devices
    default_profile: Arc<RwLock<DeviceProfile>>,
    /// Global allowlist (always allowed, overrides everything)
    global_allowlist: Arc<RwLock<ahash::AHashSet<String>>>,
}

impl UnifiedFilter {
    /// Create a new unified filter
    pub fn new(legacy_filter: Arc<FilterEngine>) -> Self {
        info!("Initializing UnifiedFilter");

        let blocklist_manager = Arc::new(BlocklistManager::new());

        // Load default embedded blocklist immediately
        blocklist_manager.load_default_blocklist();

        Self {
            blocklist_manager,
            legacy_filter,
            device_profiles: Arc::new(RwLock::new(AHashMap::new())),
            device_id_profiles: Arc::new(RwLock::new(AHashMap::new())),
            default_profile: Arc::new(RwLock::new(DeviceProfile::default())),
            global_allowlist: Arc::new(RwLock::new(ahash::AHashSet::new())),
        }
    }

    /// Initialize blocklists from configuration
    pub async fn init_blocklists(&self, config_path: &str) -> Result<BlocklistStats, std::io::Error> {
        match BlocklistManager::load_config(config_path) {
            Ok(config) => {
                let stats = self.blocklist_manager.fetch_blocklists(&config).await;
                info!("Blocklists initialized: {} domains", stats.total_domains);
                Ok(stats)
            }
            Err(e) => {
                warn!("Failed to load blocklist config: {}", e);
                // Use default blocklist
                self.blocklist_manager.load_default_blocklist();
                Ok(self.blocklist_manager.stats())
            }
        }
    }

    /// Check a domain for a specific client IP
    pub fn check(&self, domain: &str, client_ip: Option<IpAddr>) -> FilterResult {
        let domain_lower = domain.to_lowercase();

        // Step 1: Check global allowlist (highest priority)
        if self.global_allowlist.read().contains(&domain_lower) {
            return FilterResult {
                decision: FilterDecision::Allow,
                reason: FilterReason::GlobalAllowlist,
                category: None,
                profile_id: None,
                profile_name: None,
            };
        }

        // Step 2: Get applicable profile
        let profile = self.get_profile_for_client(client_ip);

        // Step 3: Check profile allowlist
        if profile.custom_allowlist.iter().any(|p| {
            domain_lower == p.to_lowercase() || domain_lower.ends_with(&format!(".{}", p.to_lowercase()))
        }) {
            return FilterResult {
                decision: FilterDecision::Allow,
                reason: FilterReason::ProfileAllowlist,
                category: None,
                profile_id: Some(profile.id.clone()),
                profile_name: Some(profile.name.clone()),
            };
        }

        // Step 4: Check legacy filter allowlist
        if self.legacy_filter.check(&domain_lower) == FilterDecision::Allow {
            // Check if it's explicitly allowed (not just "not blocked")
            if self.legacy_filter.get_allowlist().contains(&domain_lower) {
                return FilterResult {
                    decision: FilterDecision::Allow,
                    reason: FilterReason::GlobalAllowlist,
                    category: None,
                    profile_id: None,
                    profile_name: None,
                };
            }
        }

        // Step 5: Check profile custom blocklist
        if profile.custom_blocklist.iter().any(|p| {
            domain_lower == p.to_lowercase() || domain_lower.ends_with(&format!(".{}", p.to_lowercase()))
        }) {
            return FilterResult {
                decision: FilterDecision::Block,
                reason: FilterReason::ProfileBlock,
                category: Some("custom".to_string()),
                profile_id: Some(profile.id.clone()),
                profile_name: Some(profile.name.clone()),
            };
        }

        // Step 6: Check legacy filter blocklist
        if self.legacy_filter.is_blocked(&domain_lower) {
            return FilterResult {
                decision: FilterDecision::Block,
                reason: FilterReason::GlobalBlocklist,
                category: Some("custom".to_string()),
                profile_id: None,
                profile_name: None,
            };
        }

        // Step 7: Check category-based blocklists using profile's blocked categories
        for category in &profile.blocked_categories {
            if self.blocklist_manager.is_blocked_by_category(&domain_lower, category) {
                debug!(
                    "Domain {} blocked by category {} for profile {}",
                    domain_lower, category, profile.name
                );
                return FilterResult {
                    decision: FilterDecision::Block,
                    reason: FilterReason::CategoryBlock,
                    category: Some(category.clone()),
                    profile_id: Some(profile.id.clone()),
                    profile_name: Some(profile.name.clone()),
                };
            }
        }

        // Step 8: Default allow
        FilterResult {
            decision: FilterDecision::Allow,
            reason: FilterReason::DefaultAllow,
            category: None,
            profile_id: Some(profile.id.clone()),
            profile_name: Some(profile.name.clone()),
        }
    }

    /// Simple blocked check for compatibility
    pub fn is_blocked(&self, domain: &str) -> bool {
        self.check(domain, None).decision == FilterDecision::Block
    }

    /// Check with client IP for profile-aware filtering
    pub fn is_blocked_for_client(&self, domain: &str, client_ip: IpAddr) -> bool {
        self.check(domain, Some(client_ip)).decision == FilterDecision::Block
    }

    /// Get the profile for a client IP (or default)
    fn get_profile_for_client(&self, client_ip: Option<IpAddr>) -> DeviceProfile {
        if let Some(ip) = client_ip {
            if let Some(profile) = self.device_profiles.read().get(&ip) {
                if profile.enabled {
                    return profile.clone();
                }
            }
        }
        self.default_profile.read().clone()
    }

    /// Assign a profile to a client IP
    pub fn assign_profile_to_ip(&self, ip: IpAddr, profile: DeviceProfile) {
        info!("Assigning profile '{}' to IP {}", profile.name, ip);
        self.device_profiles.write().insert(ip, profile);
    }

    /// Assign a profile to a device ID
    pub fn assign_profile_to_device(&self, device_id: &str, profile: DeviceProfile) {
        info!("Assigning profile '{}' to device {}", profile.name, device_id);
        self.device_id_profiles.write().insert(device_id.to_string(), profile);
    }

    /// Get profile for a device ID
    pub fn get_profile_for_device(&self, device_id: &str) -> Option<DeviceProfile> {
        self.device_id_profiles.read().get(device_id).cloned()
    }

    /// Remove IP assignment
    pub fn remove_ip_profile(&self, ip: &IpAddr) {
        self.device_profiles.write().remove(ip);
    }

    /// Set the default profile
    pub fn set_default_profile(&self, profile: DeviceProfile) {
        info!("Setting default profile: {}", profile.name);
        *self.default_profile.write() = profile;
    }

    /// Get the default profile
    pub fn get_default_profile(&self) -> DeviceProfile {
        self.default_profile.read().clone()
    }

    /// Add to global allowlist
    pub fn add_to_global_allowlist(&self, domain: &str) {
        self.global_allowlist.write().insert(domain.to_lowercase());
        // Also add to legacy filter for compatibility
        self.legacy_filter.add_to_allowlist(domain);
    }

    /// Remove from global allowlist
    pub fn remove_from_global_allowlist(&self, domain: &str) {
        self.global_allowlist.write().remove(&domain.to_lowercase());
        self.legacy_filter.remove_from_allowlist(domain);
    }

    /// Get global allowlist
    pub fn get_global_allowlist(&self) -> Vec<String> {
        self.global_allowlist.read().iter().cloned().collect()
    }

    /// Add domain to blocklist (legacy compatibility)
    pub fn add_to_blocklist(&self, domain: &str, category: &str) {
        self.blocklist_manager.add_domain(domain, category);
        // Also add to legacy filter
        self.legacy_filter.add_to_blocklist(domain);
    }

    /// Remove from blocklist
    pub fn remove_from_blocklist(&self, domain: &str) {
        self.blocklist_manager.remove_domain(domain);
        self.legacy_filter.remove_from_blocklist(domain);
    }

    /// Get blocklist statistics
    pub fn stats(&self) -> UnifiedFilterStats {
        let blocklist_stats = self.blocklist_manager.stats();
        UnifiedFilterStats {
            total_blocked_domains: blocklist_stats.total_domains + self.legacy_filter.blocklist_size(),
            by_category: blocklist_stats.by_category,
            global_allowlist_size: self.global_allowlist.read().len(),
            legacy_blocklist_size: self.legacy_filter.blocklist_size(),
            legacy_allowlist_size: self.legacy_filter.allowlist_size(),
            assigned_devices: self.device_profiles.read().len(),
            sources_loaded: blocklist_stats.sources_loaded,
        }
    }

    /// Get the blocklist manager for direct access
    pub fn blocklist_manager(&self) -> &Arc<BlocklistManager> {
        &self.blocklist_manager
    }

    /// Get the legacy filter for compatibility
    pub fn legacy_filter(&self) -> &Arc<FilterEngine> {
        &self.legacy_filter
    }

    /// Enable a category globally
    pub fn enable_category(&self, category: &str) {
        self.blocklist_manager.enable_category(category);
    }

    /// Disable a category globally
    pub fn disable_category(&self, category: &str) {
        self.blocklist_manager.disable_category(category);
    }

    /// Get enabled categories
    pub fn get_enabled_categories(&self) -> Vec<String> {
        self.blocklist_manager.get_enabled_categories()
    }
}

/// Unified filter statistics
#[derive(Debug, Clone, Serialize)]
pub struct UnifiedFilterStats {
    pub total_blocked_domains: usize,
    pub by_category: std::collections::HashMap<String, usize>,
    pub global_allowlist_size: usize,
    pub legacy_blocklist_size: usize,
    pub legacy_allowlist_size: usize,
    pub assigned_devices: usize,
    pub sources_loaded: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unified_filter_basic() {
        let legacy = Arc::new(FilterEngine::new());
        let filter = UnifiedFilter::new(legacy);

        // Add a domain to blocklist
        filter.add_to_blocklist("ads.example.com", "ads");

        assert!(filter.is_blocked("ads.example.com"));
        assert!(!filter.is_blocked("clean.example.com"));
    }

    #[test]
    fn test_profile_based_filtering() {
        let legacy = Arc::new(FilterEngine::new());
        let filter = UnifiedFilter::new(legacy);

        // Add domain to adult category
        filter.blocklist_manager().add_domain("adult.example.com", "adult");

        // Default profile doesn't block adult
        assert!(!filter.is_blocked("adult.example.com"));

        // Create a kid profile that blocks adult
        let kid_profile = DeviceProfile {
            id: "kid1".to_string(),
            name: "Kid".to_string(),
            blocked_categories: vec!["ads".to_string(), "adult".to_string()],
            ..Default::default()
        };

        let ip: IpAddr = "192.168.1.100".parse().unwrap();
        filter.assign_profile_to_ip(ip, kid_profile);

        // Now it should be blocked for this IP
        assert!(filter.is_blocked_for_client("adult.example.com", ip));
    }

    #[test]
    fn test_allowlist_priority() {
        let legacy = Arc::new(FilterEngine::new());
        let filter = UnifiedFilter::new(legacy);

        // Add to both blocklist and allowlist
        filter.add_to_blocklist("allowed.example.com", "ads");
        filter.add_to_global_allowlist("allowed.example.com");

        // Allowlist wins
        assert!(!filter.is_blocked("allowed.example.com"));
    }
}
