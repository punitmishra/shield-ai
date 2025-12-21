//! Threat Feed Manager
//!
//! Aggregates and manages multiple threat intelligence feeds.

use chrono::{DateTime, Utc};
use dashmap::DashMap;
use tracing::{info, warn};

use crate::{ThreatCategory, ThreatMatch};

/// Manages multiple threat intelligence feeds
pub struct ThreatFeedManager {
    /// Domains known to be malicious
    malicious_domains: DashMap<String, ThreatEntry>,
    /// Feed sources and their last update time
    feed_sources: Vec<FeedSource>,
    /// Quick lookup set for O(1) checks
    blocklist: DashMap<String, ThreatCategory>,
}

#[derive(Clone)]
struct ThreatEntry {
    category: ThreatCategory,
    source: String,
    confidence: f32,
    added_at: DateTime<Utc>,
    last_seen: Option<DateTime<Utc>>,
}

#[derive(Clone)]
struct FeedSource {
    name: String,
    url: String,
    category: ThreatCategory,
    last_update: Option<DateTime<Utc>>,
    entry_count: usize,
}

impl ThreatFeedManager {
    pub async fn new() -> anyhow::Result<Self> {
        let manager = Self {
            malicious_domains: DashMap::new(),
            feed_sources: Self::default_feed_sources(),
            blocklist: DashMap::new(),
        };

        // Load built-in threat data
        manager.load_builtin_threats();

        info!(
            "Threat Feed Manager initialized with {} known threats",
            manager.malicious_domains.len()
        );

        Ok(manager)
    }

    fn default_feed_sources() -> Vec<FeedSource> {
        vec![
            FeedSource {
                name: "URLhaus".to_string(),
                url: "https://urlhaus.abuse.ch/downloads/text/".to_string(),
                category: ThreatCategory::Malware,
                last_update: None,
                entry_count: 0,
            },
            FeedSource {
                name: "PhishTank".to_string(),
                url: "https://data.phishtank.com/data/online-valid.json".to_string(),
                category: ThreatCategory::Phishing,
                last_update: None,
                entry_count: 0,
            },
            FeedSource {
                name: "Feodo Tracker".to_string(),
                url: "https://feodotracker.abuse.ch/downloads/domainblocklist.txt".to_string(),
                category: ThreatCategory::Botnet,
                last_update: None,
                entry_count: 0,
            },
        ]
    }

    fn load_builtin_threats(&self) {
        // Known malware domains
        let malware_domains = [
            "malware-distribution.com",
            "evil-downloads.net",
            "trojan-host.com",
            "virus-payload.net",
            "ransomware-c2.com",
            "botnet-controller.net",
            "cryptolocker.cc",
            "wannacry.tk",
        ];

        for domain in malware_domains {
            self.add_threat(domain, ThreatCategory::Malware, "builtin", 0.95);
        }

        // Known phishing domains (patterns)
        let phishing_domains = [
            "paypa1-secure.com",
            "amaz0n-login.com",
            "g00gle-verify.com",
            "app1e-id.com",
            "micros0ft-auth.com",
            "faceb00k-login.com",
            "netf1ix-update.com",
        ];

        for domain in phishing_domains {
            self.add_threat(domain, ThreatCategory::Phishing, "builtin", 0.95);
        }

        // Known C&C servers
        let c2_domains = [
            "command-control.tk",
            "c2-server.ml",
            "beacon-host.ga",
        ];

        for domain in c2_domains {
            self.add_threat(domain, ThreatCategory::CommandAndControl, "builtin", 0.9);
        }

        // Known cryptominers (already in our blocklist, but add to threat intel)
        let cryptominer_domains = [
            "coinhive.com",
            "coin-hive.com",
            "cryptoloot.pro",
            "minero.cc",
            "jsecoin.com",
        ];

        for domain in cryptominer_domains {
            self.add_threat(domain, ThreatCategory::CryptoMiner, "builtin", 0.95);
        }
    }

    fn add_threat(&self, domain: &str, category: ThreatCategory, source: &str, confidence: f32) {
        let domain_lower = domain.to_lowercase();
        self.malicious_domains.insert(
            domain_lower.clone(),
            ThreatEntry {
                category,
                source: source.to_string(),
                confidence,
                added_at: Utc::now(),
                last_seen: None,
            },
        );
        self.blocklist.insert(domain_lower, category);
    }

    /// Check if a domain matches any threat feed
    pub fn check_domain(&self, domain: &str) -> Vec<ThreatMatch> {
        let domain_lower = domain.to_lowercase();
        let mut matches = Vec::new();

        // Direct match
        if let Some(entry) = self.malicious_domains.get(&domain_lower) {
            matches.push(ThreatMatch {
                source: entry.source.clone(),
                category: entry.category,
                confidence: entry.confidence,
                last_seen: entry.last_seen,
            });
        }

        // Check if it's a subdomain of a malicious domain
        let parts: Vec<&str> = domain_lower.split('.').collect();
        for i in 1..parts.len().saturating_sub(1) {
            let parent = parts[i..].join(".");
            if let Some(entry) = self.malicious_domains.get(&parent) {
                matches.push(ThreatMatch {
                    source: format!("{} (parent)", entry.source),
                    category: entry.category,
                    confidence: entry.confidence * 0.9, // Slightly lower for subdomains
                    last_seen: entry.last_seen,
                });
            }
        }

        // Check for typosquatting patterns
        if let Some(match_) = self.check_typosquatting(&domain_lower) {
            matches.push(match_);
        }

        matches
    }

    /// Check for typosquatting of popular domains
    fn check_typosquatting(&self, domain: &str) -> Option<ThreatMatch> {
        let popular_domains = [
            ("google", "google.com"),
            ("facebook", "facebook.com"),
            ("amazon", "amazon.com"),
            ("apple", "apple.com"),
            ("microsoft", "microsoft.com"),
            ("paypal", "paypal.com"),
            ("netflix", "netflix.com"),
            ("instagram", "instagram.com"),
        ];

        for (brand, legitimate) in &popular_domains {
            if domain.contains(brand) && !domain.ends_with(legitimate) {
                // Check for common typosquatting patterns
                let suspicious = self.is_typosquat(domain, brand);
                if suspicious {
                    return Some(ThreatMatch {
                        source: "typosquat_detection".to_string(),
                        category: ThreatCategory::Phishing,
                        confidence: 0.7,
                        last_seen: None,
                    });
                }
            }
        }

        None
    }

    fn is_typosquat(&self, domain: &str, brand: &str) -> bool {
        // Common typosquatting patterns
        let patterns = [
            // Letter substitution (0 for o, 1 for l, etc.)
            (brand, brand.replace('o', "0")),
            (brand, brand.replace('l', "1")),
            (brand, brand.replace('e', "3")),
            (brand, brand.replace('a', "4")),
            // Adding/removing letters
            (brand, format!("{}s", brand)),
            (brand, format!("{}-", brand)),
            (brand, format!("-{}", brand)),
        ];

        for (_, variant) in &patterns {
            if domain.contains(variant) && variant != brand {
                return true;
            }
        }

        false
    }

    /// Get statistics about loaded threat feeds
    pub fn stats(&self) -> ThreatFeedStats {
        let mut category_counts: std::collections::HashMap<ThreatCategory, usize> =
            std::collections::HashMap::new();

        for entry in self.malicious_domains.iter() {
            *category_counts.entry(entry.category).or_insert(0) += 1;
        }

        ThreatFeedStats {
            total_threats: self.malicious_domains.len(),
            feed_count: self.feed_sources.len(),
            category_counts,
        }
    }

    /// Update feeds from remote sources (would be called periodically)
    pub async fn update_feeds(&self) -> anyhow::Result<usize> {
        // In a real implementation, this would fetch from the URLs
        // For now, we just return the current count
        warn!("Feed update not yet implemented - using builtin data");
        Ok(self.malicious_domains.len())
    }
}

#[derive(Debug, Clone)]
pub struct ThreatFeedStats {
    pub total_threats: usize,
    pub feed_count: usize,
    pub category_counts: std::collections::HashMap<ThreatCategory, usize>,
}

impl Default for ThreatFeedManager {
    fn default() -> Self {
        // Use blocking for default
        tokio::runtime::Runtime::new()
            .expect("Failed to create runtime")
            .block_on(Self::new())
            .expect("Failed to create ThreatFeedManager")
    }
}
