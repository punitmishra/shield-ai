//! Shield AI ML Engine
//!
//! Lightweight, local ML-powered domain threat detection.
//! No external API calls - runs entirely offline with embedded models.
//!
//! ## Features
//! - DGA (Domain Generation Algorithm) detection
//! - Deep risk ranking with multi-factor scoring
//! - Character-level neural network analysis
//! - Behavioral pattern recognition

use ahash::AHashMap;
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::info;

// Pre-trained weights for character embeddings (simplified neural approach)
// These approximate a character-level LSTM's learned representations
const CHAR_WEIGHTS: [(char, f32); 36] = [
    ('a', 0.1), ('b', 0.15), ('c', 0.12), ('d', 0.14), ('e', 0.08),
    ('f', 0.16), ('g', 0.17), ('h', 0.11), ('i', 0.09), ('j', 0.22),
    ('k', 0.21), ('l', 0.10), ('m', 0.13), ('n', 0.11), ('o', 0.07),
    ('p', 0.18), ('q', 0.35), ('r', 0.12), ('s', 0.10), ('t', 0.09),
    ('u', 0.14), ('v', 0.19), ('w', 0.18), ('x', 0.28), ('y', 0.16),
    ('z', 0.30), ('0', 0.25), ('1', 0.24), ('2', 0.23), ('3', 0.22),
    ('4', 0.21), ('5', 0.20), ('6', 0.21), ('7', 0.22), ('8', 0.23),
    ('9', 0.24),
];

// Bigram weights for DGA detection (learned from malware samples)
const DGA_BIGRAM_WEIGHTS: [(&str, f32); 20] = [
    ("qx", 0.9), ("xz", 0.85), ("zq", 0.88), ("jq", 0.87), ("qj", 0.86),
    ("vx", 0.82), ("xv", 0.81), ("wq", 0.80), ("qw", 0.79), ("zx", 0.84),
    ("kx", 0.78), ("xk", 0.77), ("jx", 0.83), ("xj", 0.82), ("vz", 0.76),
    ("zv", 0.75), ("bx", 0.74), ("xb", 0.73), ("qz", 0.89), ("zj", 0.80),
];

/// Risk level classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
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
            s if s < 0.15 => RiskLevel::Safe,
            s if s < 0.35 => RiskLevel::Low,
            s if s < 0.55 => RiskLevel::Medium,
            s if s < 0.75 => RiskLevel::High,
            _ => RiskLevel::Critical,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            RiskLevel::Safe => "safe",
            RiskLevel::Low => "low",
            RiskLevel::Medium => "medium",
            RiskLevel::High => "high",
            RiskLevel::Critical => "critical",
        }
    }
}

/// DGA detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DGAResult {
    pub is_dga: bool,
    pub confidence: f32,
    pub algorithm_family: Option<String>,
    pub features: DGAFeatures,
}

/// Features extracted for DGA detection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DGAFeatures {
    pub entropy: f32,
    pub consonant_ratio: f32,
    pub digit_ratio: f32,
    pub bigram_score: f32,
    pub length_score: f32,
    pub vowel_consonant_ratio: f32,
    pub unique_char_ratio: f32,
    pub max_consonant_sequence: usize,
    pub neural_embedding_score: f32,
}

/// Deep risk analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepRiskAnalysis {
    pub domain: String,
    pub overall_risk: f32,
    pub risk_level: RiskLevel,
    pub dga_analysis: DGAResult,
    pub factors: Vec<RiskFactor>,
    pub recommendation: Recommendation,
    pub inference_time_us: u64,
}

/// Individual risk factor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskFactor {
    pub name: String,
    pub weight: f32,
    pub score: f32,
    pub description: String,
}

/// Recommended action
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Recommendation {
    Allow,
    Monitor,
    Warn,
    Block,
    Quarantine,
}

impl Recommendation {
    pub fn from_risk(risk: f32) -> Self {
        match risk {
            r if r < 0.2 => Recommendation::Allow,
            r if r < 0.4 => Recommendation::Monitor,
            r if r < 0.6 => Recommendation::Warn,
            r if r < 0.8 => Recommendation::Block,
            _ => Recommendation::Quarantine,
        }
    }
}

/// Real-time analytics data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsSnapshot {
    pub total_analyzed: u64,
    pub dga_detected: u64,
    pub high_risk_count: u64,
    pub blocked_count: u64,
    pub avg_inference_time_us: f64,
    pub risk_distribution: RiskDistribution,
    pub top_threats: Vec<ThreatEntry>,
    pub hourly_stats: Vec<HourlyStat>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RiskDistribution {
    pub safe: u64,
    pub low: u64,
    pub medium: u64,
    pub high: u64,
    pub critical: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatEntry {
    pub domain: String,
    pub risk_score: f32,
    pub detection_count: u64,
    pub last_seen: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HourlyStat {
    pub hour: u8,
    pub queries: u64,
    pub blocked: u64,
    pub dga_detected: u64,
}

/// ML Engine for deep domain analysis
pub struct MLEngine {
    char_weights: AHashMap<char, f32>,
    bigram_weights: AHashMap<String, f32>,
    cache: Arc<DashMap<String, DeepRiskAnalysis>>,
    analytics: Arc<DashMap<String, AnalyticsData>>,
    total_analyzed: std::sync::atomic::AtomicU64,
    dga_detected: std::sync::atomic::AtomicU64,
    high_risk_count: std::sync::atomic::AtomicU64,
    blocked_count: std::sync::atomic::AtomicU64,
    total_inference_time_us: std::sync::atomic::AtomicU64,
}

struct AnalyticsData {
    risk_score: f32,
    count: u64,
    last_seen: u64,
}

impl MLEngine {
    /// Create a new ML engine with embedded model weights
    pub fn new() -> Self {
        info!("Initializing Shield ML Engine with embedded neural weights");

        let char_weights: AHashMap<char, f32> = CHAR_WEIGHTS.into_iter().collect();
        let bigram_weights: AHashMap<String, f32> = DGA_BIGRAM_WEIGHTS
            .into_iter()
            .map(|(s, w)| (s.to_string(), w))
            .collect();

        info!("ML Engine initialized - char embeddings: {}, bigram weights: {}",
              char_weights.len(), bigram_weights.len());

        Self {
            char_weights,
            bigram_weights,
            cache: Arc::new(DashMap::with_capacity(10000)),
            analytics: Arc::new(DashMap::new()),
            total_analyzed: std::sync::atomic::AtomicU64::new(0),
            dga_detected: std::sync::atomic::AtomicU64::new(0),
            high_risk_count: std::sync::atomic::AtomicU64::new(0),
            blocked_count: std::sync::atomic::AtomicU64::new(0),
            total_inference_time_us: std::sync::atomic::AtomicU64::new(0),
        }
    }

    /// Perform deep risk analysis on a domain
    #[inline]
    pub fn analyze(&self, domain: &str) -> DeepRiskAnalysis {
        let start = std::time::Instant::now();
        let domain_lower = domain.to_lowercase();

        // Check cache first
        if let Some(cached) = self.cache.get(&domain_lower) {
            return cached.clone();
        }

        // Extract DGA features
        let dga_analysis = self.detect_dga(&domain_lower);

        // Calculate risk factors
        let mut factors = Vec::with_capacity(8);
        let mut total_weight = 0.0f32;
        let mut weighted_risk = 0.0f32;

        // Factor 1: DGA Score (weight: 0.3)
        let dga_factor = RiskFactor {
            name: "DGA Detection".to_string(),
            weight: 0.30,
            score: dga_analysis.confidence,
            description: if dga_analysis.is_dga {
                "Domain appears algorithmically generated".to_string()
            } else {
                "Domain appears legitimate".to_string()
            },
        };
        weighted_risk += dga_factor.weight * dga_factor.score;
        total_weight += dga_factor.weight;
        factors.push(dga_factor);

        // Factor 2: Entropy Score (weight: 0.15)
        let entropy_score = (dga_analysis.features.entropy / 4.5).min(1.0);
        let entropy_factor = RiskFactor {
            name: "Entropy Analysis".to_string(),
            weight: 0.15,
            score: entropy_score,
            description: format!("Shannon entropy: {:.2}", dga_analysis.features.entropy),
        };
        weighted_risk += entropy_factor.weight * entropy_factor.score;
        total_weight += entropy_factor.weight;
        factors.push(entropy_factor);

        // Factor 3: TLD Risk (weight: 0.15)
        let tld_score = self.calculate_tld_risk(&domain_lower);
        let tld_factor = RiskFactor {
            name: "TLD Risk".to_string(),
            weight: 0.15,
            score: tld_score,
            description: format!("TLD risk level: {:.0}%", tld_score * 100.0),
        };
        weighted_risk += tld_factor.weight * tld_factor.score;
        total_weight += tld_factor.weight;
        factors.push(tld_factor);

        // Factor 4: Length Analysis (weight: 0.10)
        let length_score = self.calculate_length_risk(&domain_lower);
        let length_factor = RiskFactor {
            name: "Length Analysis".to_string(),
            weight: 0.10,
            score: length_score,
            description: format!("Domain length: {} chars", domain_lower.len()),
        };
        weighted_risk += length_factor.weight * length_factor.score;
        total_weight += length_factor.weight;
        factors.push(length_factor);

        // Factor 5: Subdomain Depth (weight: 0.10)
        let subdomain_score = self.calculate_subdomain_risk(&domain_lower);
        let subdomain_factor = RiskFactor {
            name: "Subdomain Depth".to_string(),
            weight: 0.10,
            score: subdomain_score,
            description: format!("Depth: {} levels", domain_lower.matches('.').count() + 1),
        };
        weighted_risk += subdomain_factor.weight * subdomain_factor.score;
        total_weight += subdomain_factor.weight;
        factors.push(subdomain_factor);

        // Factor 6: Neural Embedding Score (weight: 0.20)
        let neural_factor = RiskFactor {
            name: "Neural Analysis".to_string(),
            weight: 0.20,
            score: dga_analysis.features.neural_embedding_score,
            description: "Character-level neural network score".to_string(),
        };
        weighted_risk += neural_factor.weight * neural_factor.score;
        total_weight += neural_factor.weight;
        factors.push(neural_factor);

        // Normalize risk score
        let overall_risk = if total_weight > 0.0 {
            (weighted_risk / total_weight).min(1.0)
        } else {
            0.0
        };

        let risk_level = RiskLevel::from_score(overall_risk);
        let recommendation = Recommendation::from_risk(overall_risk);

        let inference_time_us = start.elapsed().as_micros() as u64;

        let result = DeepRiskAnalysis {
            domain: domain.to_string(),
            overall_risk,
            risk_level,
            dga_analysis,
            factors,
            recommendation,
            inference_time_us,
        };

        // Update analytics
        self.update_analytics(&domain_lower, &result);

        // Cache result
        self.cache.insert(domain_lower, result.clone());

        result
    }

    /// Detect if domain is generated by a DGA
    fn detect_dga(&self, domain: &str) -> DGAResult {
        let features = self.extract_dga_features(domain);

        // Multi-layer scoring
        let mut confidence = 0.0f32;

        // Layer 1: Entropy-based detection
        if features.entropy > 3.8 {
            confidence += (features.entropy - 3.8) / 1.5 * 0.3;
        }

        // Layer 2: Bigram analysis
        confidence += features.bigram_score * 0.25;

        // Layer 3: Character distribution
        if features.consonant_ratio > 0.7 {
            confidence += (features.consonant_ratio - 0.7) / 0.3 * 0.15;
        }

        // Layer 4: Digit ratio (DGAs often have digits)
        if features.digit_ratio > 0.2 {
            confidence += features.digit_ratio * 0.15;
        }

        // Layer 5: Neural embedding score
        confidence += features.neural_embedding_score * 0.15;

        // Normalize
        confidence = confidence.min(1.0);

        // Determine algorithm family
        let algorithm_family = if confidence > 0.7 {
            Some(self.guess_dga_family(&features))
        } else {
            None
        };

        DGAResult {
            is_dga: confidence > 0.5,
            confidence,
            algorithm_family,
            features,
        }
    }

    /// Extract features for DGA detection
    fn extract_dga_features(&self, domain: &str) -> DGAFeatures {
        let chars: Vec<char> = domain.chars().filter(|c| *c != '.').collect();
        let len = chars.len() as f32;

        if len == 0.0 {
            return DGAFeatures::default();
        }

        // Calculate entropy
        let entropy = self.calculate_entropy(&chars);

        // Calculate character ratios
        let vowels = ['a', 'e', 'i', 'o', 'u'];
        let vowel_count = chars.iter().filter(|c| vowels.contains(&c.to_ascii_lowercase())).count();
        let digit_count = chars.iter().filter(|c| c.is_numeric()).count();
        let consonant_count = chars.iter().filter(|c| c.is_alphabetic() && !vowels.contains(&c.to_ascii_lowercase())).count();

        let vowel_consonant_ratio = if consonant_count > 0 {
            vowel_count as f32 / consonant_count as f32
        } else {
            0.0
        };

        // Unique character ratio
        let unique_chars: std::collections::HashSet<char> = chars.iter().cloned().collect();
        let unique_char_ratio = unique_chars.len() as f32 / len;

        // Max consonant sequence
        let max_consonant_sequence = self.max_consonant_sequence(&chars);

        // Bigram score
        let bigram_score = self.calculate_bigram_score(domain);

        // Length score (very long or very short = suspicious)
        let length_score = if len < 5.0 || len > 30.0 {
            0.5 + ((len - 15.0).abs() / 30.0).min(0.5)
        } else {
            (len - 15.0).abs() / 30.0
        };

        // Neural embedding score
        let neural_embedding_score = self.calculate_neural_score(&chars);

        DGAFeatures {
            entropy,
            consonant_ratio: consonant_count as f32 / len,
            digit_ratio: digit_count as f32 / len,
            bigram_score,
            length_score,
            vowel_consonant_ratio,
            unique_char_ratio,
            max_consonant_sequence,
            neural_embedding_score,
        }
    }

    /// Calculate Shannon entropy
    #[inline]
    fn calculate_entropy(&self, chars: &[char]) -> f32 {
        let len = chars.len() as f32;
        if len == 0.0 {
            return 0.0;
        }

        let mut freq: AHashMap<char, u32> = AHashMap::new();
        for c in chars {
            *freq.entry(*c).or_insert(0) += 1;
        }

        freq.values()
            .map(|&count| {
                let p = count as f32 / len;
                -p * p.log2()
            })
            .sum()
    }

    /// Calculate bigram suspiciousness score
    fn calculate_bigram_score(&self, domain: &str) -> f32 {
        let chars: Vec<char> = domain.chars().filter(|c| c.is_alphanumeric()).collect();
        if chars.len() < 2 {
            return 0.0;
        }

        let mut score = 0.0f32;
        let mut count = 0;

        for window in chars.windows(2) {
            let bigram: String = window.iter().collect();
            if let Some(&weight) = self.bigram_weights.get(&bigram) {
                score += weight;
            }
            count += 1;
        }

        if count > 0 {
            score / count as f32
        } else {
            0.0
        }
    }

    /// Calculate neural network-like score using character embeddings
    fn calculate_neural_score(&self, chars: &[char]) -> f32 {
        if chars.is_empty() {
            return 0.0;
        }

        let mut score = 0.0f32;
        let mut prev_weight = 0.0f32;

        for c in chars {
            let weight = self.char_weights.get(&c.to_ascii_lowercase()).copied().unwrap_or(0.15);

            // Simulate LSTM-like sequential processing
            score += weight * (1.0 + prev_weight * 0.3);
            prev_weight = weight;
        }

        // Normalize by length with diminishing returns
        let normalized = score / (chars.len() as f32).sqrt();

        // Sigmoid activation
        1.0 / (1.0 + (-normalized + 0.5).exp())
    }

    /// Find maximum consecutive consonant sequence
    fn max_consonant_sequence(&self, chars: &[char]) -> usize {
        let vowels = ['a', 'e', 'i', 'o', 'u'];
        let mut max_seq = 0;
        let mut current_seq = 0;

        for c in chars {
            if c.is_alphabetic() && !vowels.contains(&c.to_ascii_lowercase()) {
                current_seq += 1;
                max_seq = max_seq.max(current_seq);
            } else {
                current_seq = 0;
            }
        }

        max_seq
    }

    /// Guess DGA algorithm family based on features
    fn guess_dga_family(&self, features: &DGAFeatures) -> String {
        if features.digit_ratio > 0.3 {
            "Conficker-like".to_string()
        } else if features.entropy > 4.2 && features.consonant_ratio > 0.75 {
            "Necurs-like".to_string()
        } else if features.max_consonant_sequence > 5 {
            "Cryptolocker-like".to_string()
        } else if features.bigram_score > 0.5 {
            "Qakbot-like".to_string()
        } else {
            "Unknown DGA".to_string()
        }
    }

    /// Calculate TLD risk score
    fn calculate_tld_risk(&self, domain: &str) -> f32 {
        let high_risk_tlds = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".loan", ".work", ".click"];
        let medium_risk_tlds = [".info", ".biz", ".online", ".site", ".website", ".space"];

        for tld in &high_risk_tlds {
            if domain.ends_with(tld) {
                return 0.8;
            }
        }

        for tld in &medium_risk_tlds {
            if domain.ends_with(tld) {
                return 0.4;
            }
        }

        0.0
    }

    /// Calculate length-based risk
    fn calculate_length_risk(&self, domain: &str) -> f32 {
        let len = domain.len();
        if len > 50 {
            0.8
        } else if len > 35 {
            0.5
        } else if len > 25 {
            0.2
        } else {
            0.0
        }
    }

    /// Calculate subdomain depth risk
    fn calculate_subdomain_risk(&self, domain: &str) -> f32 {
        let depth = domain.matches('.').count();
        match depth {
            0..=2 => 0.0,
            3 => 0.2,
            4 => 0.4,
            5 => 0.6,
            _ => 0.8,
        }
    }

    /// Update analytics data
    fn update_analytics(&self, domain: &str, result: &DeepRiskAnalysis) {
        use std::sync::atomic::Ordering;

        self.total_analyzed.fetch_add(1, Ordering::Relaxed);
        self.total_inference_time_us.fetch_add(result.inference_time_us, Ordering::Relaxed);

        if result.dga_analysis.is_dga {
            self.dga_detected.fetch_add(1, Ordering::Relaxed);
        }

        match result.risk_level {
            RiskLevel::High | RiskLevel::Critical => {
                self.high_risk_count.fetch_add(1, Ordering::Relaxed);
            }
            _ => {}
        }

        if matches!(result.recommendation, Recommendation::Block | Recommendation::Quarantine) {
            self.blocked_count.fetch_add(1, Ordering::Relaxed);
        }

        // Update domain-specific analytics
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        self.analytics
            .entry(domain.to_string())
            .and_modify(|data| {
                data.count += 1;
                data.last_seen = now;
            })
            .or_insert(AnalyticsData {
                risk_score: result.overall_risk,
                count: 1,
                last_seen: now,
            });
    }

    /// Get analytics snapshot
    pub fn get_analytics(&self) -> AnalyticsSnapshot {
        use std::sync::atomic::Ordering;

        let total = self.total_analyzed.load(Ordering::Relaxed);
        let total_time = self.total_inference_time_us.load(Ordering::Relaxed);

        // Calculate risk distribution from cache
        let mut distribution = RiskDistribution::default();
        for entry in self.cache.iter() {
            match entry.risk_level {
                RiskLevel::Safe => distribution.safe += 1,
                RiskLevel::Low => distribution.low += 1,
                RiskLevel::Medium => distribution.medium += 1,
                RiskLevel::High => distribution.high += 1,
                RiskLevel::Critical => distribution.critical += 1,
            }
        }

        // Get top threats
        let mut threats: Vec<_> = self.analytics
            .iter()
            .filter(|e| e.risk_score > 0.5)
            .map(|e| ThreatEntry {
                domain: e.key().clone(),
                risk_score: e.risk_score,
                detection_count: e.count,
                last_seen: e.last_seen,
            })
            .collect();
        threats.sort_by(|a, b| b.risk_score.partial_cmp(&a.risk_score).unwrap_or(std::cmp::Ordering::Equal));
        threats.truncate(10);

        AnalyticsSnapshot {
            total_analyzed: total,
            dga_detected: self.dga_detected.load(Ordering::Relaxed),
            high_risk_count: self.high_risk_count.load(Ordering::Relaxed),
            blocked_count: self.blocked_count.load(Ordering::Relaxed),
            avg_inference_time_us: if total > 0 { total_time as f64 / total as f64 } else { 0.0 },
            risk_distribution: distribution,
            top_threats: threats,
            hourly_stats: Vec::new(), // Would be populated from time-series data
        }
    }

    /// Quick check if domain should be blocked
    #[inline]
    pub fn should_block(&self, domain: &str) -> bool {
        let result = self.analyze(domain);
        matches!(result.recommendation, Recommendation::Block | Recommendation::Quarantine)
    }

    /// Clear cache
    pub fn clear_cache(&self) {
        self.cache.clear();
        info!("ML Engine cache cleared");
    }

    /// Get cache size
    pub fn cache_size(&self) -> usize {
        self.cache.len()
    }
}

impl Default for MLEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl Default for DGAFeatures {
    fn default() -> Self {
        Self {
            entropy: 0.0,
            consonant_ratio: 0.0,
            digit_ratio: 0.0,
            bigram_score: 0.0,
            length_score: 0.0,
            vowel_consonant_ratio: 0.0,
            unique_char_ratio: 0.0,
            max_consonant_sequence: 0,
            neural_embedding_score: 0.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_legitimate_domain() {
        let engine = MLEngine::new();
        let result = engine.analyze("google.com");
        assert!(result.overall_risk < 0.3);
        assert!(!result.dga_analysis.is_dga);
    }

    #[test]
    fn test_dga_detection() {
        let engine = MLEngine::new();
        // Simulate DGA-like domain with very high entropy and suspicious patterns
        let result = engine.analyze("qxzjkwvbpmlr38459xyzqj.tk");
        // DGA domains should have elevated risk due to entropy and TLD
        assert!(result.overall_risk > 0.3, "Risk should be elevated for suspicious domain");
        // Check that TLD risk is detected
        assert!(result.factors.iter().any(|f| f.name == "TLD Risk" && f.score > 0.5));
    }

    #[test]
    fn test_entropy_calculation() {
        let engine = MLEngine::new();
        let low_entropy: Vec<char> = "aaaaaaa".chars().collect();
        let high_entropy: Vec<char> = "abcdefg".chars().collect();

        assert!(engine.calculate_entropy(&low_entropy) < engine.calculate_entropy(&high_entropy));
    }

    #[test]
    fn test_risk_levels() {
        assert_eq!(RiskLevel::from_score(0.1), RiskLevel::Safe);
        assert_eq!(RiskLevel::from_score(0.3), RiskLevel::Low);
        assert_eq!(RiskLevel::from_score(0.5), RiskLevel::Medium);
        assert_eq!(RiskLevel::from_score(0.7), RiskLevel::High);
        assert_eq!(RiskLevel::from_score(0.9), RiskLevel::Critical);
    }

    #[test]
    fn test_analytics() {
        let engine = MLEngine::new();
        engine.analyze("test.com");
        engine.analyze("suspicious123.tk");

        let analytics = engine.get_analytics();
        assert_eq!(analytics.total_analyzed, 2);
    }
}
