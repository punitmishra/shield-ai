//! Shield Metrics - Collection and monitoring

use std::sync::atomic::{AtomicU64, Ordering};
use serde::Serialize;

#[derive(Default)]
pub struct MetricsCollector {
    total_queries: AtomicU64,
    blocked_queries: AtomicU64,
    cache_hits: AtomicU64,
    cache_misses: AtomicU64,
}

#[derive(Serialize)]
pub struct MetricsSnapshot {
    pub total_queries: u64,
    pub blocked_queries: u64,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub cache_hit_rate: f64,
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn record_query(&self, blocked: bool) {
        self.total_queries.fetch_add(1, Ordering::Relaxed);
        if blocked {
            self.blocked_queries.fetch_add(1, Ordering::Relaxed);
        }
    }

    pub fn record_cache_hit(&self) {
        self.cache_hits.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_cache_miss(&self) {
        self.cache_misses.fetch_add(1, Ordering::Relaxed);
    }

    pub fn snapshot(&self) -> MetricsSnapshot {
        let hits = self.cache_hits.load(Ordering::Relaxed);
        let misses = self.cache_misses.load(Ordering::Relaxed);
        let total = hits + misses;

        MetricsSnapshot {
            total_queries: self.total_queries.load(Ordering::Relaxed),
            blocked_queries: self.blocked_queries.load(Ordering::Relaxed),
            cache_hits: hits,
            cache_misses: misses,
            cache_hit_rate: if total > 0 { hits as f64 / total as f64 } else { 0.0 },
        }
    }
}
