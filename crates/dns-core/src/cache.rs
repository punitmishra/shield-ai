//! DNS Cache implementation
//! High-performance, lock-free caching layer using DashMap

use dashmap::DashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tracing::{debug, info};

/// Cached DNS entry with expiration
#[derive(Debug, Clone)]
pub struct CacheEntry {
    pub records: Vec<String>,
    pub inserted_at: Instant,
    pub ttl: Duration,
}

impl CacheEntry {
    pub fn new(records: Vec<String>, ttl: Duration) -> Self {
        Self {
            records,
            inserted_at: Instant::now(),
            ttl,
        }
    }

    pub fn is_expired(&self) -> bool {
        self.inserted_at.elapsed() > self.ttl
    }

    pub fn remaining_ttl(&self) -> Duration {
        self.ttl.saturating_sub(self.inserted_at.elapsed())
    }
}

/// Cache key for DNS queries
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct CacheKey {
    pub name: String,
    pub record_type: String,
}

impl CacheKey {
    pub fn new(name: String, record_type: String) -> Self {
        Self { name, record_type }
    }
}

/// High-performance, lock-free DNS cache
pub struct DNSCache {
    cache: Arc<DashMap<CacheKey, CacheEntry>>,
    max_size: usize,
    default_ttl: Duration,
    hits: AtomicU64,
    misses: AtomicU64,
}

impl DNSCache {
    /// Create a new DNS cache
    pub fn new(max_size: usize, default_ttl: Duration) -> Self {
        info!(
            "Initializing DNS cache: max_size={}, default_ttl={:?}",
            max_size, default_ttl
        );
        Self {
            cache: Arc::new(DashMap::with_capacity(max_size)),
            max_size,
            default_ttl,
            hits: AtomicU64::new(0),
            misses: AtomicU64::new(0),
        }
    }

    /// Get entry from cache - lock-free operation
    #[inline]
    pub fn get(&self, key: &CacheKey) -> Option<Vec<String>> {
        if let Some(entry) = self.cache.get(key) {
            if entry.is_expired() {
                debug!("Cache entry expired for {:?}", key);
                drop(entry);
                self.cache.remove(key);
                self.misses.fetch_add(1, Ordering::Relaxed);
                None
            } else {
                debug!("Cache hit for {:?}", key);
                self.hits.fetch_add(1, Ordering::Relaxed);
                Some(entry.records.clone())
            }
        } else {
            debug!("Cache miss for {:?}", key);
            self.misses.fetch_add(1, Ordering::Relaxed);
            None
        }
    }

    /// Insert entry into cache
    pub fn insert(&self, key: CacheKey, records: Vec<String>, ttl: Option<Duration>) {
        if self.cache.len() >= self.max_size {
            self.evict_oldest();
        }

        let ttl = ttl.unwrap_or(self.default_ttl);
        let entry = CacheEntry::new(records, ttl);

        debug!("Inserting into cache: {:?} with TTL {:?}", key, ttl);
        self.cache.insert(key, entry);
    }

    /// Evict oldest entries
    fn evict_oldest(&self) {
        let mut to_remove = Vec::new();

        for item in self.cache.iter() {
            if item.value().is_expired() {
                to_remove.push(item.key().clone());
            }
        }

        if to_remove.is_empty() {
            let count = self.max_size / 10;
            for item in self.cache.iter().take(count) {
                to_remove.push(item.key().clone());
            }
        }

        for key in to_remove {
            self.cache.remove(&key);
        }
    }

    /// Clear entire cache
    pub fn clear(&self) {
        info!("Clearing entire DNS cache");
        self.cache.clear();
    }

    /// Get cache statistics - lock-free
    #[inline]
    pub fn stats(&self) -> (u64, u64) {
        (
            self.hits.load(Ordering::Relaxed),
            self.misses.load(Ordering::Relaxed),
        )
    }

    /// Get cache hit rate - lock-free
    #[inline]
    pub fn hit_rate(&self) -> f64 {
        let hits = self.hits.load(Ordering::Relaxed) as f64;
        let misses = self.misses.load(Ordering::Relaxed) as f64;
        let total = hits + misses;
        if total > 0.0 { hits / total } else { 0.0 }
    }

    /// Get current cache size
    pub fn len(&self) -> usize {
        self.cache.len()
    }

    /// Check if cache is empty
    pub fn is_empty(&self) -> bool {
        self.cache.is_empty()
    }
}

impl Default for DNSCache {
    fn default() -> Self {
        Self::new(10000, Duration::from_secs(300))
    }
}
