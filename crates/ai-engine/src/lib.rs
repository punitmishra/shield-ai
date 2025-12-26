//! Shield AI Engine - ML-powered domain threat detection
//!
//! Provides AI-based domain classification using:
//! - Domain feature extraction (entropy, character distribution)
//! - Pattern matching for known threat indicators
//! - Real-time threat scoring

use anyhow::Result;
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tracing::{debug, info};

/// Result of AI domain analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIAnalysisResult {
    pub domain: String,
    pub confidence: f32,
    pub threat_type: ThreatType,
    pub threat_score: f32,
    pub privacy_score: PrivacyScore,
    pub features: DomainFeatures,
    pub inference_time_ns: u64,
}

/// Privacy score for a domain (0-100, higher is better)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrivacyScore {
    pub score: u8,
    pub grade: char,
    pub tracking: bool,
    pub fingerprinting: bool,
    pub third_party_cookies: bool,
    pub data_collection: DataCollectionLevel,
}

impl Default for PrivacyScore {
    fn default() -> Self {
        Self {
            score: 100,
            grade: 'A',
            tracking: false,
            fingerprinting: false,
            third_party_cookies: false,
            data_collection: DataCollectionLevel::None,
        }
    }
}

/// Level of data collection by a domain
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DataCollectionLevel {
    None,
    Minimal,
    Moderate,
    Extensive,
    Aggressive,
}

/// Types of detected threats
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ThreatType {
    Clean,
    Malware,
    Phishing,
    Advertising,
    Tracking,
    Cryptomining,
    CommandAndControl,
    Unknown,
}

/// Extracted domain features
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DomainFeatures {
    pub length: usize,
    pub entropy: f32,
    pub digit_ratio: f32,
    pub consonant_ratio: f32,
    pub has_suspicious_tld: bool,
    pub subdomain_count: usize,
    pub max_label_length: usize,
    pub has_ip_pattern: bool,
}

/// AI Engine for domain threat detection
pub struct AIEngine {
    feature_cache: DashMap<String, DomainFeatures>,
    threat_patterns: Vec<ThreatPattern>,
    privacy_patterns: Vec<PrivacyPattern>,
    threshold: f32,
}

struct ThreatPattern {
    pattern: String,
    threat_type: ThreatType,
    score: f32,
}

struct PrivacyPattern {
    pattern: String,
    tracking: bool,
    fingerprinting: bool,
    data_collection: DataCollectionLevel,
    penalty: u8,
}

impl AIEngine {
    /// Create a new AI engine
    pub async fn new() -> Result<Self> {
        info!("Initializing Shield AI Engine");

        let threat_patterns = vec![
            ThreatPattern {
                pattern: "malware".into(),
                threat_type: ThreatType::Malware,
                score: 0.9,
            },
            ThreatPattern {
                pattern: "phishing".into(),
                threat_type: ThreatType::Phishing,
                score: 0.85,
            },
            ThreatPattern {
                pattern: "tracker".into(),
                threat_type: ThreatType::Tracking,
                score: 0.7,
            },
            ThreatPattern {
                pattern: "ads".into(),
                threat_type: ThreatType::Advertising,
                score: 0.6,
            },
            ThreatPattern {
                pattern: "crypto".into(),
                threat_type: ThreatType::Cryptomining,
                score: 0.8,
            },
        ];

        // Known privacy-invasive patterns
        let privacy_patterns = vec![
            PrivacyPattern {
                pattern: "facebook.com".into(),
                tracking: true,
                fingerprinting: true,
                data_collection: DataCollectionLevel::Aggressive,
                penalty: 40,
            },
            PrivacyPattern {
                pattern: "google-analytics".into(),
                tracking: true,
                fingerprinting: false,
                data_collection: DataCollectionLevel::Extensive,
                penalty: 30,
            },
            PrivacyPattern {
                pattern: "doubleclick".into(),
                tracking: true,
                fingerprinting: true,
                data_collection: DataCollectionLevel::Aggressive,
                penalty: 45,
            },
            PrivacyPattern {
                pattern: "hotjar".into(),
                tracking: true,
                fingerprinting: true,
                data_collection: DataCollectionLevel::Extensive,
                penalty: 35,
            },
            PrivacyPattern {
                pattern: "mixpanel".into(),
                tracking: true,
                fingerprinting: false,
                data_collection: DataCollectionLevel::Extensive,
                penalty: 25,
            },
            PrivacyPattern {
                pattern: "amplitude".into(),
                tracking: true,
                fingerprinting: false,
                data_collection: DataCollectionLevel::Moderate,
                penalty: 20,
            },
            PrivacyPattern {
                pattern: "segment".into(),
                tracking: true,
                fingerprinting: false,
                data_collection: DataCollectionLevel::Extensive,
                penalty: 25,
            },
            PrivacyPattern {
                pattern: "fingerprint".into(),
                tracking: false,
                fingerprinting: true,
                data_collection: DataCollectionLevel::Moderate,
                penalty: 30,
            },
            PrivacyPattern {
                pattern: "telemetry".into(),
                tracking: true,
                fingerprinting: false,
                data_collection: DataCollectionLevel::Moderate,
                penalty: 15,
            },
            PrivacyPattern {
                pattern: "pixel".into(),
                tracking: true,
                fingerprinting: false,
                data_collection: DataCollectionLevel::Minimal,
                penalty: 10,
            },
        ];

        Ok(Self {
            feature_cache: DashMap::new(),
            threat_patterns,
            privacy_patterns,
            threshold: 0.7,
        })
    }

    /// Analyze a domain for threats
    pub async fn analyze_domain(&self, domain: &str) -> Result<AIAnalysisResult> {
        let start = Instant::now();
        let domain_lower = domain.to_lowercase();

        // Extract features
        let features = self.extract_features(&domain_lower);

        // Check pattern matches
        let (threat_type, threat_score) = self.check_patterns(&domain_lower);

        // Calculate privacy score
        let privacy_score = self.calculate_privacy_score(&domain_lower);

        // Calculate final confidence
        let confidence = self.calculate_confidence(&features, threat_score);

        let inference_time_ns = start.elapsed().as_nanos() as u64;
        debug!(
            "Analyzed {} in {}ns: {:?} (threat: {:.2}, privacy: {})",
            domain, inference_time_ns, threat_type, threat_score, privacy_score.score
        );

        Ok(AIAnalysisResult {
            domain: domain.to_string(),
            confidence,
            threat_type,
            threat_score,
            privacy_score,
            features,
            inference_time_ns,
        })
    }

    /// Calculate privacy score for a domain (0-100, higher is better)
    fn calculate_privacy_score(&self, domain: &str) -> PrivacyScore {
        let mut score: u8 = 100;
        let mut tracking = false;
        let mut fingerprinting = false;
        let mut third_party_cookies = false;
        let mut data_collection = DataCollectionLevel::None;

        // Check against known privacy-invasive patterns
        for pattern in &self.privacy_patterns {
            if domain.contains(&pattern.pattern) {
                score = score.saturating_sub(pattern.penalty);
                tracking = tracking || pattern.tracking;
                fingerprinting = fingerprinting || pattern.fingerprinting;
                if pattern.data_collection.clone() as u8 > data_collection.clone() as u8 {
                    data_collection = pattern.data_collection.clone();
                }
            }
        }

        // Check for third-party cookie indicators
        if domain.contains("cookie") || domain.contains("consent") {
            third_party_cookies = true;
            score = score.saturating_sub(5);
        }

        // Penalize tracking TLDs
        if domain.ends_with(".tk") || domain.ends_with(".ml") || domain.ends_with(".cf") {
            score = score.saturating_sub(10);
        }

        // Calculate grade
        let grade = match score {
            90..=100 => 'A',
            80..=89 => 'B',
            70..=79 => 'C',
            50..=69 => 'D',
            _ => 'F',
        };

        PrivacyScore {
            score,
            grade,
            tracking,
            fingerprinting,
            third_party_cookies,
            data_collection,
        }
    }

    /// Extract features from a domain
    fn extract_features(&self, domain: &str) -> DomainFeatures {
        // Check cache first
        if let Some(cached) = self.feature_cache.get(domain) {
            return cached.clone();
        }

        let labels: Vec<&str> = domain.split('.').collect();
        let chars: Vec<char> = domain.chars().filter(|c| *c != '.').collect();

        let length = chars.len();
        let digit_count = chars.iter().filter(|c| c.is_numeric()).count();
        let consonant_count = chars
            .iter()
            .filter(|c| {
                c.is_alphabetic() && !['a', 'e', 'i', 'o', 'u'].contains(&c.to_ascii_lowercase())
            })
            .count();

        let suspicious_tlds = ["tk", "ml", "ga", "cf", "gq", "xyz", "top", "loan"];
        let tld = labels.last().unwrap_or(&"");
        let has_suspicious_tld = suspicious_tlds.contains(tld);

        let features = DomainFeatures {
            length,
            entropy: self.calculate_entropy(domain),
            digit_ratio: if length > 0 {
                digit_count as f32 / length as f32
            } else {
                0.0
            },
            consonant_ratio: if length > 0 {
                consonant_count as f32 / length as f32
            } else {
                0.0
            },
            has_suspicious_tld,
            subdomain_count: labels.len().saturating_sub(2),
            max_label_length: labels.iter().map(|l| l.len()).max().unwrap_or(0),
            has_ip_pattern: domain.chars().all(|c| c.is_numeric() || c == '.'),
        };

        // Cache features
        self.feature_cache
            .insert(domain.to_string(), features.clone());

        features
    }

    /// Calculate Shannon entropy of a string
    fn calculate_entropy(&self, s: &str) -> f32 {
        let mut freq = std::collections::HashMap::new();
        let chars: Vec<char> = s.chars().filter(|c| *c != '.').collect();
        let len = chars.len() as f32;

        if len == 0.0 {
            return 0.0;
        }

        for c in &chars {
            *freq.entry(*c).or_insert(0) += 1;
        }

        let mut entropy = 0.0f32;
        for count in freq.values() {
            let p = *count as f32 / len;
            if p > 0.0 {
                entropy -= p * p.log2();
            }
        }

        entropy
    }

    /// Check for known threat patterns
    fn check_patterns(&self, domain: &str) -> (ThreatType, f32) {
        for pattern in &self.threat_patterns {
            if domain.contains(&pattern.pattern) {
                return (pattern.threat_type.clone(), pattern.score);
            }
        }
        (ThreatType::Clean, 0.0)
    }

    /// Calculate overall confidence score
    fn calculate_confidence(&self, features: &DomainFeatures, threat_score: f32) -> f32 {
        let mut confidence = threat_score;

        // Adjust based on features
        if features.entropy > 4.0 {
            confidence += 0.1;
        }
        if features.has_suspicious_tld {
            confidence += 0.15;
        }
        if features.digit_ratio > 0.3 {
            confidence += 0.1;
        }
        if features.length > 50 {
            confidence += 0.1;
        }

        confidence.min(1.0)
    }

    /// Check if a domain should be blocked based on AI analysis
    pub async fn should_block(&self, domain: &str) -> Result<bool> {
        let result = self.analyze_domain(domain).await?;
        Ok(result.threat_score >= self.threshold && result.threat_type != ThreatType::Clean)
    }

    /// Set the blocking threshold
    pub fn set_threshold(&mut self, threshold: f32) {
        self.threshold = threshold.clamp(0.0, 1.0);
        info!("AI threshold set to {}", self.threshold);
    }

    /// Get current threshold
    pub fn threshold(&self) -> f32 {
        self.threshold
    }

    /// Clear the feature cache
    pub fn clear_cache(&self) {
        self.feature_cache.clear();
        info!("AI feature cache cleared");
    }

    /// Get cache size
    pub fn cache_size(&self) -> usize {
        self.feature_cache.len()
    }
}

impl Default for AIEngine {
    fn default() -> Self {
        Self {
            feature_cache: DashMap::new(),
            threat_patterns: vec![],
            privacy_patterns: vec![],
            threshold: 0.7,
        }
    }
}
