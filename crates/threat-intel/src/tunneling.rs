//! DNS Tunneling Detection Module
//!
//! Detects attempts to exfiltrate data or establish covert channels via DNS.
//! Uses multiple heuristics including entropy analysis, query patterns, and encoding detection.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::debug;

use crate::TunnelingRisk;

/// DNS Tunneling Detector
///
/// Detects various DNS tunneling techniques:
/// - Base64/Base32 encoded subdomains
/// - High entropy random-looking subdomains
/// - Unusually long DNS queries
/// - Unusual TXT record queries
pub struct TunnelingDetector {
    /// Entropy threshold for suspicious domains
    entropy_threshold: f32,
    /// Maximum allowed subdomain length before flagging
    max_subdomain_length: usize,
    /// Known tunneling tool signatures
    tunneling_signatures: Vec<TunnelingSignature>,
}

#[derive(Clone)]
struct TunnelingSignature {
    name: String,
    patterns: Vec<String>,
    confidence: f32,
}

impl TunnelingDetector {
    pub fn new() -> Self {
        Self {
            entropy_threshold: 3.5,
            max_subdomain_length: 50,
            tunneling_signatures: Self::load_signatures(),
        }
    }

    fn load_signatures() -> Vec<TunnelingSignature> {
        vec![
            TunnelingSignature {
                name: "iodine".to_string(),
                patterns: vec![
                    r"^[a-z0-9]{50,}\.".to_string(),
                ],
                confidence: 0.9,
            },
            TunnelingSignature {
                name: "dns2tcp".to_string(),
                patterns: vec![
                    r"^[a-f0-9]{32,}\.".to_string(),
                ],
                confidence: 0.85,
            },
            TunnelingSignature {
                name: "dnscat2".to_string(),
                patterns: vec![
                    r"^[a-z0-9]{30,}\.".to_string(),
                ],
                confidence: 0.85,
            },
        ]
    }

    /// Analyze a domain for DNS tunneling indicators
    pub fn analyze(&self, domain: &str) -> TunnelingRisk {
        let mut indicators = Vec::new();
        let mut confidence: f32 = 0.0;

        // Extract subdomain (everything before the registered domain)
        let subdomain = self.extract_subdomain(domain);
        let subdomain_length = subdomain.len();

        // Check 1: Subdomain length
        if subdomain_length > self.max_subdomain_length {
            indicators.push(format!("Extremely long subdomain: {} chars", subdomain_length));
            confidence += 0.3;
        } else if subdomain_length > 30 {
            indicators.push(format!("Long subdomain: {} chars", subdomain_length));
            confidence += 0.15;
        }

        // Check 2: Entropy analysis
        let entropy = self.calculate_entropy(&subdomain);
        if entropy > self.entropy_threshold {
            indicators.push(format!("High entropy: {:.2}", entropy));
            confidence += 0.25;
        }

        // Check 3: Base64/Base32 encoding detection
        if self.looks_like_base64(&subdomain) {
            indicators.push("Possible Base64 encoding detected".to_string());
            confidence += 0.2;
        }

        // Check 4: Hex encoding detection
        if self.looks_like_hex(&subdomain) && subdomain.len() > 20 {
            indicators.push("Possible hex encoding detected".to_string());
            confidence += 0.2;
        }

        // Check 5: Known tunneling tool signatures
        for sig in &self.tunneling_signatures {
            for pattern in &sig.patterns {
                if regex::Regex::new(pattern)
                    .map(|re| re.is_match(domain))
                    .unwrap_or(false)
                {
                    indicators.push(format!("Matches {} signature", sig.name));
                    confidence += sig.confidence * 0.3;
                }
            }
        }

        // Check 6: Unusual character distribution
        if self.has_unusual_distribution(&subdomain) {
            indicators.push("Unusual character distribution".to_string());
            confidence += 0.15;
        }

        // Check 7: No vowels (common in encoded data)
        if subdomain.len() > 15 && !self.has_vowels(&subdomain) {
            indicators.push("No vowels in long subdomain".to_string());
            confidence += 0.2;
        }

        // Normalize confidence
        confidence = confidence.min(1.0);

        let is_suspected = confidence > 0.5 || (!indicators.is_empty() && confidence > 0.3);

        debug!(
            "Tunneling analysis for {}: suspected={}, confidence={:.2}, indicators={:?}",
            domain, is_suspected, confidence, indicators
        );

        TunnelingRisk {
            is_suspected,
            confidence,
            indicators,
            entropy_score: entropy,
            subdomain_length,
        }
    }

    fn extract_subdomain(&self, domain: &str) -> String {
        let parts: Vec<&str> = domain.split('.').collect();
        if parts.len() <= 2 {
            return String::new();
        }
        // Take all parts except the last two (registered domain + TLD)
        parts[..parts.len() - 2].join(".")
    }

    /// Calculate Shannon entropy of a string
    fn calculate_entropy(&self, s: &str) -> f32 {
        if s.is_empty() {
            return 0.0;
        }

        let mut freq: HashMap<char, usize> = HashMap::new();
        for c in s.chars() {
            *freq.entry(c).or_insert(0) += 1;
        }

        let len = s.len() as f32;
        let mut entropy: f32 = 0.0;

        for &count in freq.values() {
            let p = count as f32 / len;
            entropy -= p * p.log2();
        }

        entropy
    }

    /// Check if string looks like Base64 encoded data
    fn looks_like_base64(&self, s: &str) -> bool {
        if s.len() < 16 {
            return false;
        }

        // Base64 uses A-Z, a-z, 0-9, +, /, =
        // Base64url uses - and _ instead of + and /
        let base64_chars: std::collections::HashSet<char> =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/-_="
                .chars()
                .collect();

        let matching = s.chars().filter(|c| base64_chars.contains(c)).count();
        let ratio = matching as f32 / s.len() as f32;

        // High ratio of base64 characters and length divisible by 4 (or close)
        ratio > 0.95 && (s.len() % 4 == 0 || s.len() % 4 == 1)
    }

    /// Check if string looks like hex encoded data
    fn looks_like_hex(&self, s: &str) -> bool {
        if s.len() < 16 {
            return false;
        }

        let hex_chars: std::collections::HashSet<char> =
            "0123456789abcdefABCDEF".chars().collect();

        let matching = s.chars().filter(|c| hex_chars.contains(c)).count();
        let ratio = matching as f32 / s.len() as f32;

        ratio > 0.95
    }

    /// Check for unusual character distribution
    fn has_unusual_distribution(&self, s: &str) -> bool {
        if s.len() < 10 {
            return false;
        }

        let mut digit_count = 0;
        let mut alpha_count = 0;

        for c in s.chars() {
            if c.is_ascii_digit() {
                digit_count += 1;
            } else if c.is_ascii_alphabetic() {
                alpha_count += 1;
            }
        }

        // Unusual if very high mix of digits and letters (common in encoded data)
        let digit_ratio = digit_count as f32 / s.len() as f32;
        digit_ratio > 0.3 && digit_ratio < 0.7
    }

    /// Check if string contains vowels
    fn has_vowels(&self, s: &str) -> bool {
        s.to_lowercase()
            .chars()
            .any(|c| matches!(c, 'a' | 'e' | 'i' | 'o' | 'u'))
    }
}

impl Default for TunnelingDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normal_domain() {
        let detector = TunnelingDetector::new();
        let result = detector.analyze("www.google.com");
        assert!(!result.is_suspected);
    }

    #[test]
    fn test_suspicious_domain() {
        let detector = TunnelingDetector::new();
        let result = detector.analyze("aGVsbG8gd29ybGQgdGhpcyBpcyBhIHRlc3Q.evil.com");
        assert!(result.confidence > 0.3);
    }

    #[test]
    fn test_entropy_calculation() {
        let detector = TunnelingDetector::new();
        let low_entropy = detector.calculate_entropy("aaaaaaa");
        let high_entropy = detector.calculate_entropy("abcdefghijk");
        assert!(high_entropy > low_entropy);
    }
}
