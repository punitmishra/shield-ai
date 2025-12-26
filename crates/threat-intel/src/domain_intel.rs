//! Domain Intelligence Module
//!
//! Analyzes domain registration data, TLD risk, and other metadata.

use chrono::{DateTime, Utc};
use dashmap::DashMap;
use std::collections::HashSet;
use tracing::debug;

use crate::DomainIntelReport;

/// High-risk TLDs commonly used for malicious purposes
const HIGH_RISK_TLDS: &[&str] = &[
    "tk", "ml", "ga", "cf", "gq", // Free domains often abused
    "xyz", "top", "club", "work", "click", "link", "info", "biz", "pw", "cc", "su", "ws", "buzz",
    "monster",
];

/// Medium-risk TLDs
const MEDIUM_RISK_TLDS: &[&str] = &[
    "online", "site", "store", "tech", "space", "website", "host", "fun", "press", "life",
];

/// Free subdomain providers (commonly abused)
const FREE_DOMAIN_PROVIDERS: &[&str] = &[
    "duckdns.org",
    "no-ip.com",
    "no-ip.org",
    "ddns.net",
    "dynu.com",
    "freedns.org",
    "hopto.org",
    "zapto.org",
    "sytes.net",
    "serveblog.net",
    "servebeer.com",
    "servemp3.com",
    "servegame.com",
    "gotdns.ch",
    "myftp.org",
    "myvnc.com",
    "servebbs.com",
    "redirectme.net",
    "blogsite.org",
    "dnsalias.com",
    "dnsalias.net",
    "dnsalias.org",
    "is-a-geek.com",
    "is-a-geek.net",
    "is-a-geek.org",
    "webhop.me",
    "blogdns.com",
    "blogdns.net",
    "blogdns.org",
];

/// Domain Intelligence Analyzer
pub struct DomainIntelligence {
    /// Cache for domain analysis results
    cache: DashMap<String, CachedIntel>,
    /// High-risk TLDs set for O(1) lookup
    high_risk_tlds: HashSet<String>,
    /// Medium-risk TLDs set
    medium_risk_tlds: HashSet<String>,
    /// Free domain providers set
    free_providers: HashSet<String>,
}

#[derive(Clone)]
struct CachedIntel {
    report: DomainIntelReport,
    cached_at: DateTime<Utc>,
}

impl DomainIntelligence {
    pub fn new() -> Self {
        Self {
            cache: DashMap::new(),
            high_risk_tlds: HIGH_RISK_TLDS.iter().map(|s| s.to_string()).collect(),
            medium_risk_tlds: MEDIUM_RISK_TLDS.iter().map(|s| s.to_string()).collect(),
            free_providers: FREE_DOMAIN_PROVIDERS
                .iter()
                .map(|s| s.to_string())
                .collect(),
        }
    }

    /// Analyze a domain for intelligence
    pub async fn analyze(&self, domain: &str) -> Option<DomainIntelReport> {
        let domain_lower = domain.to_lowercase();

        // Check cache first
        if let Some(cached) = self.cache.get(&domain_lower) {
            let age = Utc::now() - cached.cached_at;
            if age.num_hours() < 24 {
                return Some(cached.report.clone());
            }
        }

        // Perform analysis
        let report = self.analyze_domain(&domain_lower);

        // Cache the result
        self.cache.insert(
            domain_lower.clone(),
            CachedIntel {
                report: report.clone(),
                cached_at: Utc::now(),
            },
        );

        Some(report)
    }

    fn analyze_domain(&self, domain: &str) -> DomainIntelReport {
        let tld = self.extract_tld(domain);
        let tld_risk = self.calculate_tld_risk(&tld);
        let is_free = self.is_free_domain(domain);

        // For now, we can't check actual WHOIS without external API
        // In production, integrate with WHOIS API or RDAP
        let (age_days, is_newly_registered, creation_date) = self.estimate_domain_age(domain);

        debug!(
            "Domain intel for {}: tld_risk={}, is_free={}, age_days={:?}",
            domain, tld_risk, is_free, age_days
        );

        DomainIntelReport {
            age_days,
            is_newly_registered,
            registrar: None, // Would need WHOIS lookup
            creation_date,
            expiration_date: None,
            is_free_domain: is_free,
            tld_risk,
        }
    }

    fn extract_tld(&self, domain: &str) -> String {
        domain.rsplit('.').next().unwrap_or("").to_lowercase()
    }

    fn calculate_tld_risk(&self, tld: &str) -> f32 {
        if self.high_risk_tlds.contains(tld) {
            0.7
        } else if self.medium_risk_tlds.contains(tld) {
            0.4
        } else {
            0.1
        }
    }

    fn is_free_domain(&self, domain: &str) -> bool {
        for provider in &self.free_providers {
            if domain.ends_with(provider) {
                return true;
            }
        }
        false
    }

    fn estimate_domain_age(&self, domain: &str) -> (Option<u32>, bool, Option<DateTime<Utc>>) {
        // Well-known domains that are definitely old
        let well_known = [
            "google.com",
            "facebook.com",
            "amazon.com",
            "microsoft.com",
            "apple.com",
            "github.com",
            "twitter.com",
            "linkedin.com",
            "youtube.com",
            "netflix.com",
            "cloudflare.com",
            "mozilla.org",
            "wikipedia.org",
            "reddit.com",
            "stackoverflow.com",
        ];

        let domain_lower = domain.to_lowercase();

        for known in &well_known {
            if domain_lower == *known || domain_lower.ends_with(&format!(".{}", known)) {
                return (Some(7000), false, None); // ~20 years
            }
        }

        // Heuristics for suspicious domains
        let suspicious_patterns = [
            // Random-looking domains
            (r"[0-9]{4,}", true),
            // Very long subdomains
            (r"^.{40,}\.", true),
            // Multiple hyphens
            (r".*-.*-.*-.*", true),
        ];

        for (pattern, is_suspicious) in &suspicious_patterns {
            if regex::Regex::new(pattern)
                .map(|re| re.is_match(&domain_lower))
                .unwrap_or(false)
                && *is_suspicious
            {
                // Treat as potentially new
                return (Some(7), true, None);
            }
        }

        // Default: unknown age
        (None, false, None)
    }

    /// Get cache statistics
    pub fn cache_stats(&self) -> (usize, usize) {
        let total = self.cache.len();
        let stale = self
            .cache
            .iter()
            .filter(|entry| {
                let age = Utc::now() - entry.cached_at;
                age.num_hours() >= 24
            })
            .count();
        (total, stale)
    }

    /// Clear stale cache entries
    pub fn cleanup_cache(&self) {
        self.cache.retain(|_, entry| {
            let age = Utc::now() - entry.cached_at;
            age.num_hours() < 24
        });
    }
}

impl Default for DomainIntelligence {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tld_risk() {
        let intel = DomainIntelligence::new();
        assert!(intel.calculate_tld_risk("tk") > 0.5);
        assert!(intel.calculate_tld_risk("com") < 0.2);
    }

    #[test]
    fn test_free_domain_detection() {
        let intel = DomainIntelligence::new();
        assert!(intel.is_free_domain("evil.duckdns.org"));
        assert!(!intel.is_free_domain("google.com"));
    }
}
