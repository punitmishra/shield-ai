//! Shield AI Threat Intelligence Engine
//!
//! Provides advanced threat detection capabilities:
//! - Domain age analysis (newly registered domain detection)
//! - DNS tunneling detection
//! - Threat feed integration
//! - Behavioral anomaly detection

pub mod domain_intel;
pub mod tunneling;
pub mod threat_feeds;
pub mod anomaly;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::info;

pub use domain_intel::DomainIntelligence;
pub use tunneling::TunnelingDetector;
pub use threat_feeds::ThreatFeedManager;
pub use anomaly::AnomalyDetector;

/// Comprehensive threat analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatAnalysis {
    pub domain: String,
    pub timestamp: DateTime<Utc>,

    // Overall risk assessment
    pub risk_score: f32,           // 0.0 - 1.0
    pub risk_level: RiskLevel,
    pub risk_factors: Vec<RiskFactor>,

    // Domain intelligence
    pub domain_intel: Option<DomainIntelReport>,

    // Tunneling detection
    pub tunneling_risk: TunnelingRisk,

    // Threat feed matches
    pub threat_matches: Vec<ThreatMatch>,

    // Recommendation
    pub action: RecommendedAction,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum RiskLevel {
    Safe,
    Low,
    Medium,
    High,
    Critical,
}

impl RiskLevel {
    pub fn from_score(score: f32) -> Self {
        match score {
            s if s < 0.2 => RiskLevel::Safe,
            s if s < 0.4 => RiskLevel::Low,
            s if s < 0.6 => RiskLevel::Medium,
            s if s < 0.8 => RiskLevel::High,
            _ => RiskLevel::Critical,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskFactor {
    pub factor: String,
    pub severity: f32,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainIntelReport {
    pub age_days: Option<u32>,
    pub is_newly_registered: bool,
    pub registrar: Option<String>,
    pub creation_date: Option<DateTime<Utc>>,
    pub expiration_date: Option<DateTime<Utc>>,
    pub is_free_domain: bool,
    pub tld_risk: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelingRisk {
    pub is_suspected: bool,
    pub confidence: f32,
    pub indicators: Vec<String>,
    pub entropy_score: f32,
    pub subdomain_length: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatMatch {
    pub source: String,
    pub category: ThreatCategory,
    pub confidence: f32,
    pub last_seen: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ThreatCategory {
    Malware,
    Phishing,
    Spam,
    Botnet,
    CryptoMiner,
    Ransomware,
    DataExfiltration,
    CommandAndControl,
    Unknown,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum RecommendedAction {
    Allow,
    Monitor,
    Warn,
    Block,
    Quarantine,
}

/// Main threat intelligence engine
pub struct ThreatIntelEngine {
    domain_intel: Arc<DomainIntelligence>,
    tunneling_detector: Arc<TunnelingDetector>,
    threat_feeds: Arc<ThreatFeedManager>,
    anomaly_detector: Arc<AnomalyDetector>,
}

impl ThreatIntelEngine {
    pub async fn new() -> anyhow::Result<Self> {
        info!("Initializing Threat Intelligence Engine");

        let domain_intel = Arc::new(DomainIntelligence::new());
        let tunneling_detector = Arc::new(TunnelingDetector::new());
        let threat_feeds = Arc::new(ThreatFeedManager::new().await?);
        let anomaly_detector = Arc::new(AnomalyDetector::new());

        info!("Threat Intelligence Engine initialized");

        Ok(Self {
            domain_intel,
            tunneling_detector,
            threat_feeds,
            anomaly_detector,
        })
    }

    /// Perform comprehensive threat analysis on a domain
    pub async fn analyze(&self, domain: &str) -> ThreatAnalysis {
        let mut risk_factors = Vec::new();
        let mut total_risk: f32 = 0.0;

        // 1. Domain intelligence analysis
        let domain_intel = self.domain_intel.analyze(domain).await;
        if let Some(ref intel) = domain_intel {
            if intel.is_newly_registered {
                risk_factors.push(RiskFactor {
                    factor: "newly_registered".to_string(),
                    severity: 0.4,
                    description: format!("Domain registered {} days ago", intel.age_days.unwrap_or(0)),
                });
                total_risk += 0.3;
            }
            if intel.is_free_domain {
                risk_factors.push(RiskFactor {
                    factor: "free_domain".to_string(),
                    severity: 0.2,
                    description: "Domain uses free DNS provider".to_string(),
                });
                total_risk += 0.1;
            }
            total_risk += intel.tld_risk * 0.2;
        }

        // 2. DNS tunneling detection
        let tunneling_risk = self.tunneling_detector.analyze(domain);
        if tunneling_risk.is_suspected {
            risk_factors.push(RiskFactor {
                factor: "tunneling_suspected".to_string(),
                severity: tunneling_risk.confidence,
                description: format!("DNS tunneling indicators: {:?}", tunneling_risk.indicators),
            });
            total_risk += tunneling_risk.confidence * 0.5;
        }

        // 3. Threat feed matching
        let threat_matches = self.threat_feeds.check_domain(domain);
        for match_ in &threat_matches {
            risk_factors.push(RiskFactor {
                factor: format!("threat_feed_{}", match_.source),
                severity: match_.confidence,
                description: format!("Found in {} ({:?})", match_.source, match_.category),
            });
            total_risk += match_.confidence * 0.4;
        }

        // Normalize risk score
        let risk_score = total_risk.min(1.0);
        let risk_level = RiskLevel::from_score(risk_score);

        // Determine action
        let action = match risk_level {
            RiskLevel::Safe => RecommendedAction::Allow,
            RiskLevel::Low => RecommendedAction::Allow,
            RiskLevel::Medium => RecommendedAction::Monitor,
            RiskLevel::High => RecommendedAction::Warn,
            RiskLevel::Critical => RecommendedAction::Block,
        };

        ThreatAnalysis {
            domain: domain.to_string(),
            timestamp: Utc::now(),
            risk_score,
            risk_level,
            risk_factors,
            domain_intel,
            tunneling_risk,
            threat_matches,
            action,
        }
    }

    /// Quick check if domain should be blocked
    pub fn should_block(&self, domain: &str) -> bool {
        // Quick checks without async
        let tunneling = self.tunneling_detector.analyze(domain);
        if tunneling.is_suspected && tunneling.confidence > 0.8 {
            return true;
        }

        let threats = self.threat_feeds.check_domain(domain);
        if !threats.is_empty() {
            return true;
        }

        false
    }
}
