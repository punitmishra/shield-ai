//! Application state management

use shield_metrics::MetricsCollector;
use std::sync::Arc;
use std::time::Instant;

/// Shared application state
pub struct AppState {
    pub metrics: Arc<MetricsCollector>,
    pub start_time: Instant,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            metrics: Arc::new(MetricsCollector::new()),
            start_time: Instant::now(),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
