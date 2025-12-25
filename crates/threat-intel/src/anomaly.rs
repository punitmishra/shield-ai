//! Anomaly Detection Module
//!
//! Detects unusual DNS query patterns that may indicate compromise.

use chrono::{DateTime, Utc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use tracing::debug;

/// Anomaly detector for DNS query patterns
pub struct AnomalyDetector {
    /// Query history per client
    client_history: DashMap<String, ClientHistory>,
    /// Global baseline statistics
    baseline: BaselineStats,
    /// Configuration
    config: AnomalyConfig,
}

#[derive(Clone)]
struct ClientHistory {
    recent_queries: VecDeque<QueryRecord>,
    total_queries: u64,
    blocked_queries: u64,
    unique_domains: std::collections::HashSet<String>,
    first_seen: DateTime<Utc>,
    last_seen: DateTime<Utc>,
}

#[derive(Clone)]
#[allow(dead_code)] // Fields reserved for enhanced anomaly analysis
struct QueryRecord {
    domain: String,
    timestamp: DateTime<Utc>,
    blocked: bool,
}

#[derive(Clone)]
#[allow(dead_code)] // Fields reserved for adaptive baseline feature
struct BaselineStats {
    avg_queries_per_minute: f32,
    avg_unique_domains_per_hour: f32,
    avg_block_rate: f32,
}

#[derive(Clone)]
struct AnomalyConfig {
    /// Max queries per minute before flagging
    max_queries_per_minute: u32,
    /// Max unique domains per hour before flagging
    max_unique_domains_per_hour: u32,
    /// History window size
    history_size: usize,
}

impl Default for AnomalyConfig {
    fn default() -> Self {
        Self {
            max_queries_per_minute: 100,
            max_unique_domains_per_hour: 500,
            history_size: 1000,
        }
    }
}

impl AnomalyDetector {
    pub fn new() -> Self {
        Self {
            client_history: DashMap::new(),
            baseline: BaselineStats {
                avg_queries_per_minute: 10.0,
                avg_unique_domains_per_hour: 50.0,
                avg_block_rate: 0.1,
            },
            config: AnomalyConfig::default(),
        }
    }

    /// Record a query for anomaly analysis
    pub fn record_query(&self, client_id: &str, domain: &str, blocked: bool) {
        let now = Utc::now();

        let mut entry = self.client_history.entry(client_id.to_string()).or_insert_with(|| {
            ClientHistory {
                recent_queries: VecDeque::with_capacity(self.config.history_size),
                total_queries: 0,
                blocked_queries: 0,
                unique_domains: std::collections::HashSet::new(),
                first_seen: now,
                last_seen: now,
            }
        });

        // Update history
        entry.recent_queries.push_back(QueryRecord {
            domain: domain.to_string(),
            timestamp: now,
            blocked,
        });

        // Trim history
        while entry.recent_queries.len() > self.config.history_size {
            entry.recent_queries.pop_front();
        }

        entry.total_queries += 1;
        if blocked {
            entry.blocked_queries += 1;
        }
        entry.unique_domains.insert(domain.to_string());
        entry.last_seen = now;
    }

    /// Check for anomalies for a specific client
    pub fn check_anomalies(&self, client_id: &str) -> Vec<Anomaly> {
        let mut anomalies = Vec::new();

        if let Some(history) = self.client_history.get(client_id) {
            let now = Utc::now();

            // Check 1: Query rate anomaly
            let recent_minute: Vec<_> = history
                .recent_queries
                .iter()
                .filter(|q| (now - q.timestamp).num_seconds() < 60)
                .collect();

            let queries_per_minute = recent_minute.len() as u32;
            if queries_per_minute > self.config.max_queries_per_minute {
                anomalies.push(Anomaly {
                    anomaly_type: AnomalyType::HighQueryRate,
                    severity: self.calculate_severity(
                        queries_per_minute as f32,
                        self.baseline.avg_queries_per_minute,
                    ),
                    description: format!(
                        "Unusually high query rate: {} queries/min (baseline: {})",
                        queries_per_minute, self.baseline.avg_queries_per_minute
                    ),
                    detected_at: now,
                });
            }

            // Check 2: Many unique domains (possible DGA)
            let recent_hour: std::collections::HashSet<_> = history
                .recent_queries
                .iter()
                .filter(|q| (now - q.timestamp).num_minutes() < 60)
                .map(|q| &q.domain)
                .collect();

            let unique_per_hour = recent_hour.len() as u32;
            if unique_per_hour > self.config.max_unique_domains_per_hour {
                anomalies.push(Anomaly {
                    anomaly_type: AnomalyType::DomainGenerationAlgorithm,
                    severity: self.calculate_severity(
                        unique_per_hour as f32,
                        self.baseline.avg_unique_domains_per_hour,
                    ),
                    description: format!(
                        "Possible DGA: {} unique domains/hour (baseline: {})",
                        unique_per_hour, self.baseline.avg_unique_domains_per_hour
                    ),
                    detected_at: now,
                });
            }

            // Check 3: High block rate (possibly compromised)
            let block_rate = if history.total_queries > 0 {
                history.blocked_queries as f32 / history.total_queries as f32
            } else {
                0.0
            };

            if block_rate > 0.5 && history.total_queries > 10 {
                anomalies.push(Anomaly {
                    anomaly_type: AnomalyType::HighBlockRate,
                    severity: block_rate,
                    description: format!(
                        "High block rate: {:.1}% of queries blocked",
                        block_rate * 100.0
                    ),
                    detected_at: now,
                });
            }

            // Check 4: Burst of queries to same domain (possible beacon)
            let domain_counts = self.count_domain_frequency(&recent_minute);
            for (domain, count) in domain_counts {
                if count > 10 {
                    anomalies.push(Anomaly {
                        anomaly_type: AnomalyType::BeaconingBehavior,
                        severity: (count as f32 / 60.0).min(1.0),
                        description: format!(
                            "Beaconing pattern: {} queries to {} in 1 minute",
                            count, domain
                        ),
                        detected_at: now,
                    });
                }
            }
        }

        if !anomalies.is_empty() {
            debug!("Detected {} anomalies for client {}", anomalies.len(), client_id);
        }

        anomalies
    }

    fn calculate_severity(&self, value: f32, baseline: f32) -> f32 {
        let ratio = value / baseline;
        match ratio {
            r if r < 2.0 => 0.2,
            r if r < 5.0 => 0.4,
            r if r < 10.0 => 0.6,
            r if r < 20.0 => 0.8,
            _ => 1.0,
        }
    }

    fn count_domain_frequency(&self, queries: &[&QueryRecord]) -> std::collections::HashMap<String, usize> {
        let mut counts = std::collections::HashMap::new();
        for q in queries {
            *counts.entry(q.domain.clone()).or_insert(0) += 1;
        }
        counts
    }

    /// Get client statistics
    pub fn get_client_stats(&self, client_id: &str) -> Option<ClientStats> {
        self.client_history.get(client_id).map(|h| ClientStats {
            total_queries: h.total_queries,
            blocked_queries: h.blocked_queries,
            unique_domains: h.unique_domains.len(),
            first_seen: h.first_seen,
            last_seen: h.last_seen,
        })
    }

    /// Get overall statistics
    pub fn stats(&self) -> AnomalyStats {
        AnomalyStats {
            tracked_clients: self.client_history.len(),
            total_queries: self.client_history.iter().map(|e| e.total_queries).sum(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Anomaly {
    pub anomaly_type: AnomalyType,
    pub severity: f32,
    pub description: String,
    pub detected_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum AnomalyType {
    HighQueryRate,
    DomainGenerationAlgorithm,
    HighBlockRate,
    BeaconingBehavior,
    UnusualTiming,
    NewDeviceBehavior,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientStats {
    pub total_queries: u64,
    pub blocked_queries: u64,
    pub unique_domains: usize,
    pub first_seen: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnomalyStats {
    pub tracked_clients: usize,
    pub total_queries: u64,
}

impl Default for AnomalyDetector {
    fn default() -> Self {
        Self::new()
    }
}
