//! IP-based rate limiter
//!
//! Implements a sliding window rate limiter with configurable limits per IP.

#![allow(dead_code)] // Rate limiter is prepared for future middleware integration

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use dashmap::DashMap;
use serde::Serialize;
use std::{
    net::IpAddr,
    time::{Duration, Instant},
};
use tracing::{debug, warn};

/// Rate limiter configuration
#[derive(Clone)]
pub struct RateLimiterConfig {
    /// Maximum requests per window
    pub max_requests: u32,
    /// Window duration
    pub window: Duration,
    /// Cleanup interval for expired entries
    pub cleanup_interval: Duration,
}

impl Default for RateLimiterConfig {
    fn default() -> Self {
        Self {
            max_requests: 100,
            window: Duration::from_secs(60),
            cleanup_interval: Duration::from_secs(300),
        }
    }
}

/// Request tracking entry
#[derive(Clone)]
struct RequestEntry {
    count: u32,
    window_start: Instant,
}

/// IP-based rate limiter
pub struct RateLimiter {
    config: RateLimiterConfig,
    entries: DashMap<IpAddr, RequestEntry>,
    last_cleanup: std::sync::atomic::AtomicU64,
}

impl RateLimiter {
    /// Create new rate limiter with default config
    pub fn new() -> Self {
        Self::with_config(RateLimiterConfig::default())
    }

    /// Create new rate limiter with custom config
    pub fn with_config(config: RateLimiterConfig) -> Self {
        Self {
            config,
            entries: DashMap::new(),
            last_cleanup: std::sync::atomic::AtomicU64::new(0),
        }
    }

    /// Check if request is allowed for given IP
    pub fn check(&self, ip: IpAddr) -> RateLimitResult {
        let now = Instant::now();

        // Periodic cleanup
        self.maybe_cleanup();

        let mut entry = self.entries.entry(ip).or_insert_with(|| RequestEntry {
            count: 0,
            window_start: now,
        });

        // Check if window expired
        if now.duration_since(entry.window_start) > self.config.window {
            entry.count = 0;
            entry.window_start = now;
        }

        entry.count += 1;

        if entry.count > self.config.max_requests {
            let retry_after = self
                .config
                .window
                .saturating_sub(now.duration_since(entry.window_start));
            warn!("Rate limit exceeded for IP: {:?}", ip);
            RateLimitResult::Limited {
                retry_after_secs: retry_after.as_secs(),
                limit: self.config.max_requests,
                remaining: 0,
            }
        } else {
            RateLimitResult::Allowed {
                limit: self.config.max_requests,
                remaining: self.config.max_requests - entry.count,
            }
        }
    }

    /// Periodic cleanup of expired entries
    fn maybe_cleanup(&self) {
        let now_secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let last = self.last_cleanup.load(std::sync::atomic::Ordering::Relaxed);

        if now_secs - last > self.config.cleanup_interval.as_secs()
            && self
                .last_cleanup
                .compare_exchange(
                    last,
                    now_secs,
                    std::sync::atomic::Ordering::SeqCst,
                    std::sync::atomic::Ordering::Relaxed,
                )
                .is_ok()
        {
            let now = Instant::now();
            self.entries
                .retain(|_, entry| now.duration_since(entry.window_start) <= self.config.window);
            debug!(
                "Rate limiter cleanup completed, {} entries remaining",
                self.entries.len()
            );
        }
    }

    /// Get stats about the rate limiter
    pub fn stats(&self) -> RateLimiterStats {
        RateLimiterStats {
            tracked_ips: self.entries.len(),
            max_requests: self.config.max_requests,
            window_secs: self.config.window.as_secs(),
        }
    }
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

/// Result of rate limit check
pub enum RateLimitResult {
    Allowed {
        limit: u32,
        remaining: u32,
    },
    Limited {
        retry_after_secs: u64,
        limit: u32,
        remaining: u32,
    },
}

/// Rate limiter statistics
#[derive(Serialize)]
pub struct RateLimiterStats {
    pub tracked_ips: usize,
    pub max_requests: u32,
    pub window_secs: u64,
}

/// Error response for rate limiting
#[derive(Serialize)]
pub struct RateLimitError {
    pub error: String,
    pub message: String,
    pub retry_after_secs: u64,
}

impl IntoResponse for RateLimitError {
    fn into_response(self) -> Response {
        (StatusCode::TOO_MANY_REQUESTS, Json(self)).into_response()
    }
}
