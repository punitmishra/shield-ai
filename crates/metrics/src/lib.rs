//! Shield Metrics - Comprehensive collection and monitoring
//!
//! Thread-safe metrics collection with:
//! - Query counting (total, blocked, allowed)
//! - Cache hit/miss tracking
//! - Response time histograms
//! - Prometheus-compatible exports

use parking_lot::RwLock;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;

/// Response time histogram with predefined buckets
#[derive(Debug, Clone, Default, Serialize)]
pub struct ResponseTimeHistogram {
    pub under_1ms: u64,
    pub ms_1_to_5: u64,
    pub ms_5_to_10: u64,
    pub ms_10_to_50: u64,
    pub ms_50_to_100: u64,
    pub ms_100_to_500: u64,
    pub ms_500_to_1000: u64,
    pub over_1s: u64,
}

impl ResponseTimeHistogram {
    pub fn record(&mut self, duration_ms: u64) {
        match duration_ms {
            0..=1 => self.under_1ms += 1,
            2..=5 => self.ms_1_to_5 += 1,
            6..=10 => self.ms_5_to_10 += 1,
            11..=50 => self.ms_10_to_50 += 1,
            51..=100 => self.ms_50_to_100 += 1,
            101..=500 => self.ms_100_to_500 += 1,
            501..=1000 => self.ms_500_to_1000 += 1,
            _ => self.over_1s += 1,
        }
    }

    pub fn total(&self) -> u64 {
        self.under_1ms
            + self.ms_1_to_5
            + self.ms_5_to_10
            + self.ms_10_to_50
            + self.ms_50_to_100
            + self.ms_100_to_500
            + self.ms_500_to_1000
            + self.over_1s
    }
}

/// Statistics for a specific client
#[derive(Debug, Clone, Serialize, Default)]
pub struct ClientStats {
    pub total_queries: u64,
    pub blocked_queries: u64,
    pub allowed_queries: u64,
    pub last_seen: i64,
}

/// Snapshot of current metrics state
#[derive(Debug, Clone, Serialize)]
pub struct MetricsSnapshot {
    pub total_queries: u64,
    pub blocked_queries: u64,
    pub allowed_queries: u64,
    pub cache_hits: u64,
    pub cache_misses: u64,
    pub cache_hit_rate: f64,
    pub response_time_histogram: ResponseTimeHistogram,
    pub unique_clients: usize,
}

/// Thread-safe metrics collector
#[derive(Clone)]
pub struct MetricsCollector {
    inner: Arc<MetricsCollectorInner>,
}

struct MetricsCollectorInner {
    total_queries: AtomicU64,
    blocked_queries: AtomicU64,
    allowed_queries: AtomicU64,
    cache_hits: AtomicU64,
    cache_misses: AtomicU64,
    histogram: RwLock<ResponseTimeHistogram>,
    client_stats: RwLock<HashMap<String, ClientStats>>,
}

impl Default for MetricsCollector {
    fn default() -> Self {
        Self::new()
    }
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(MetricsCollectorInner {
                total_queries: AtomicU64::new(0),
                blocked_queries: AtomicU64::new(0),
                allowed_queries: AtomicU64::new(0),
                cache_hits: AtomicU64::new(0),
                cache_misses: AtomicU64::new(0),
                histogram: RwLock::new(ResponseTimeHistogram::default()),
                client_stats: RwLock::new(HashMap::new()),
            }),
        }
    }

    pub fn record_query(&self, blocked: bool) {
        self.inner.total_queries.fetch_add(1, Ordering::Relaxed);
        if blocked {
            self.inner.blocked_queries.fetch_add(1, Ordering::Relaxed);
        } else {
            self.inner.allowed_queries.fetch_add(1, Ordering::Relaxed);
        }
    }

    pub fn record_cache_hit(&self) {
        self.inner.cache_hits.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_cache_miss(&self) {
        self.inner.cache_misses.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_response_time(&self, duration: Duration) {
        let duration_ms = duration.as_millis() as u64;
        self.inner.histogram.write().record(duration_ms);
    }

    pub fn snapshot(&self) -> MetricsSnapshot {
        let total_queries = self.inner.total_queries.load(Ordering::Relaxed);
        let blocked_queries = self.inner.blocked_queries.load(Ordering::Relaxed);
        let allowed_queries = self.inner.allowed_queries.load(Ordering::Relaxed);
        let cache_hits = self.inner.cache_hits.load(Ordering::Relaxed);
        let cache_misses = self.inner.cache_misses.load(Ordering::Relaxed);

        let cache_total = cache_hits + cache_misses;
        let cache_hit_rate = if cache_total > 0 {
            cache_hits as f64 / cache_total as f64
        } else {
            0.0
        };

        let histogram = self.inner.histogram.read().clone();
        let unique_clients = self.inner.client_stats.read().len();

        MetricsSnapshot {
            total_queries,
            blocked_queries,
            allowed_queries,
            cache_hits,
            cache_misses,
            cache_hit_rate,
            response_time_histogram: histogram,
            unique_clients,
        }
    }

    pub fn to_prometheus(&self) -> String {
        let snapshot = self.snapshot();
        let mut output = String::new();

        output.push_str("# HELP dns_queries_total Total number of DNS queries\n");
        output.push_str("# TYPE dns_queries_total counter\n");
        output.push_str(&format!("dns_queries_total {}\n", snapshot.total_queries));

        output.push_str("# HELP dns_queries_blocked_total Total blocked queries\n");
        output.push_str("# TYPE dns_queries_blocked_total counter\n");
        output.push_str(&format!("dns_queries_blocked_total {}\n", snapshot.blocked_queries));

        output.push_str("# HELP dns_cache_hits_total Total cache hits\n");
        output.push_str("# TYPE dns_cache_hits_total counter\n");
        output.push_str(&format!("dns_cache_hits_total {}\n", snapshot.cache_hits));

        output.push_str("# HELP dns_cache_hit_rate Cache hit rate\n");
        output.push_str("# TYPE dns_cache_hit_rate gauge\n");
        output.push_str(&format!("dns_cache_hit_rate {:.4}\n", snapshot.cache_hit_rate));

        output
    }
}
