//! DNS Resolver implementation

use anyhow::Result;
use hickory_resolver::config::{ResolverConfig, ResolverOpts};
use hickory_resolver::TokioAsyncResolver;
use std::net::IpAddr;
use std::sync::Arc;
use std::time::Duration;
use tracing::{debug, error, info};

use crate::cache::{CacheKey, DNSCache};
use crate::filter::{FilterDecision, FilterEngine};

/// DNS Resolver with caching and filtering
pub struct Resolver {
    inner: Arc<TokioAsyncResolver>,
    cache: Arc<DNSCache>,
    filter: Arc<FilterEngine>,
}

impl Resolver {
    /// Create a new DNS resolver
    pub async fn new(cache: Arc<DNSCache>, filter: Arc<FilterEngine>) -> Result<Self> {
        info!("Initializing DNS resolver");

        let mut opts = ResolverOpts::default();
        opts.timeout = Duration::from_secs(5);
        opts.attempts = 2;
        opts.use_hosts_file = true;

        let resolver = TokioAsyncResolver::tokio(ResolverConfig::cloudflare(), opts);

        Ok(Self {
            inner: Arc::new(resolver),
            cache,
            filter,
        })
    }

    /// Resolve a domain name to IP addresses
    pub async fn resolve(&self, domain: &str) -> Result<Vec<IpAddr>> {
        // Check filter first
        match self.filter.check(domain) {
            FilterDecision::Block => {
                debug!("Domain {} blocked by filter", domain);
                return Ok(vec![]);
            }
            FilterDecision::Allow | FilterDecision::Unknown => {}
        }

        // Check cache
        let cache_key = CacheKey::new(domain.to_string(), "A".to_string());
        if let Some(cached) = self.cache.get(&cache_key) {
            debug!("Cache hit for {}", domain);
            let ips: Vec<IpAddr> = cached.iter().filter_map(|s| s.parse().ok()).collect();
            return Ok(ips);
        }

        // Perform actual DNS lookup
        debug!("Resolving {}", domain);
        match self.inner.lookup_ip(domain).await {
            Ok(response) => {
                let ips: Vec<IpAddr> = response.iter().collect();

                // Cache the result
                let records: Vec<String> = ips.iter().map(|ip| ip.to_string()).collect();
                self.cache.insert(cache_key, records, None);

                info!("Resolved {} to {:?}", domain, ips);
                Ok(ips)
            }
            Err(e) => {
                error!("Failed to resolve {}: {}", domain, e);
                Err(e.into())
            }
        }
    }

    /// Check if a domain is blocked
    pub fn is_blocked(&self, domain: &str) -> bool {
        self.filter.check(domain) == FilterDecision::Block
    }

    /// Get cache statistics
    pub fn cache_stats(&self) -> (u64, u64) {
        self.cache.stats()
    }

    /// Get cache hit rate
    pub fn cache_hit_rate(&self) -> f64 {
        self.cache.hit_rate()
    }

    /// Clear the DNS cache
    pub fn clear_cache(&self) {
        self.cache.clear();
    }
}
