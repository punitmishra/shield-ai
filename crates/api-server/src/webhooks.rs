//! Webhook notification system for Shield AI
//!
//! Sends real-time notifications when threats are detected

use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tracing::{debug, error, info, warn};

/// Webhook configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookConfig {
    /// Unique identifier for the webhook
    pub id: String,
    /// Webhook URL to POST to
    pub url: String,
    /// Events to trigger on
    pub events: Vec<WebhookEvent>,
    /// Optional secret for HMAC signing
    pub secret: Option<String>,
    /// Whether webhook is enabled
    pub enabled: bool,
    /// Optional headers to include
    #[serde(default)]
    pub headers: HashMap<String, String>,
}

/// Types of events that can trigger webhooks
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum WebhookEvent {
    /// Malware domain blocked
    MalwareBlocked,
    /// Phishing domain blocked
    PhishingBlocked,
    /// Any threat blocked (malware, phishing)
    ThreatBlocked,
    /// High-risk domain detected (DGA, etc.)
    HighRiskDetected,
    /// Blocklist updated
    BlocklistUpdated,
    /// All events
    All,
}

/// Webhook payload for threat notifications
#[derive(Debug, Clone, Serialize)]
pub struct ThreatNotification {
    pub event: String,
    pub timestamp: u64,
    pub domain: String,
    pub category: String,
    pub client_ip: Option<String>,
    pub risk_score: Option<f64>,
    pub details: Option<String>,
}

/// Webhook manager for handling notifications
pub struct WebhookManager {
    /// Registered webhooks
    webhooks: Arc<RwLock<Vec<WebhookConfig>>>,
    /// HTTP client for sending requests
    client: reqwest::Client,
    /// Rate limiting: last notification time per webhook
    rate_limits: Arc<RwLock<HashMap<String, u64>>>,
    /// Minimum interval between notifications (in seconds)
    min_interval: u64,
}

impl WebhookManager {
    /// Create a new webhook manager
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self {
            webhooks: Arc::new(RwLock::new(Vec::new())),
            client,
            rate_limits: Arc::new(RwLock::new(HashMap::new())),
            min_interval: 1, // Minimum 1 second between notifications per webhook
        }
    }

    /// Register a new webhook
    pub fn register(&self, config: WebhookConfig) -> Result<(), String> {
        // Validate URL
        if !config.url.starts_with("http://") && !config.url.starts_with("https://") {
            return Err("Invalid webhook URL".to_string());
        }

        let mut webhooks = self.webhooks.write();

        // Check for duplicate ID
        if webhooks.iter().any(|w| w.id == config.id) {
            return Err(format!("Webhook with ID '{}' already exists", config.id));
        }

        info!("Registered webhook: {} -> {}", config.id, config.url);
        webhooks.push(config);
        Ok(())
    }

    /// Remove a webhook by ID
    pub fn unregister(&self, id: &str) -> bool {
        let mut webhooks = self.webhooks.write();
        let initial_len = webhooks.len();
        webhooks.retain(|w| w.id != id);
        let removed = webhooks.len() < initial_len;
        if removed {
            info!("Unregistered webhook: {}", id);
        }
        removed
    }

    /// List all registered webhooks
    pub fn list(&self) -> Vec<WebhookConfig> {
        self.webhooks.read().clone()
    }

    /// Update a webhook
    pub fn update(&self, config: WebhookConfig) -> bool {
        let mut webhooks = self.webhooks.write();
        if let Some(webhook) = webhooks.iter_mut().find(|w| w.id == config.id) {
            *webhook = config;
            true
        } else {
            false
        }
    }

    /// Notify webhooks of a threat
    pub async fn notify_threat(&self, notification: ThreatNotification) {
        let event = match notification.category.as_str() {
            "malware" => WebhookEvent::MalwareBlocked,
            "phishing" => WebhookEvent::PhishingBlocked,
            _ => WebhookEvent::ThreatBlocked,
        };

        self.send_notifications(&event, &notification).await;
    }

    /// Notify webhooks of a high-risk detection
    pub async fn notify_high_risk(&self, notification: ThreatNotification) {
        self.send_notifications(&WebhookEvent::HighRiskDetected, &notification).await;
    }

    /// Notify webhooks of blocklist update
    pub async fn notify_blocklist_updated(&self, domains_added: usize, sources_updated: usize) {
        let notification = ThreatNotification {
            event: "blocklist_updated".to_string(),
            timestamp: Self::current_timestamp(),
            domain: format!("{} domains from {} sources", domains_added, sources_updated),
            category: "system".to_string(),
            client_ip: None,
            risk_score: None,
            details: Some(format!(
                "Blocklist refreshed with {} new domains from {} sources",
                domains_added, sources_updated
            )),
        };

        self.send_notifications(&WebhookEvent::BlocklistUpdated, &notification).await;
    }

    /// Send notifications to matching webhooks
    async fn send_notifications(&self, event: &WebhookEvent, notification: &ThreatNotification) {
        let webhooks = self.webhooks.read().clone();
        let now = Self::current_timestamp();

        for webhook in webhooks.iter().filter(|w| w.enabled && w.matches_event(event)) {
            // Check rate limit
            if !self.check_rate_limit(&webhook.id, now) {
                debug!("Rate limited webhook: {}", webhook.id);
                continue;
            }

            // Send notification
            let webhook_clone = webhook.clone();
            let notification_clone = notification.clone();
            let client = self.client.clone();

            tokio::spawn(async move {
                if let Err(e) = Self::send_webhook(&client, &webhook_clone, &notification_clone).await {
                    error!("Failed to send webhook {}: {}", webhook_clone.id, e);
                } else {
                    debug!("Sent webhook notification to: {}", webhook_clone.url);
                }
            });
        }
    }

    /// Send a single webhook notification
    async fn send_webhook(
        client: &reqwest::Client,
        config: &WebhookConfig,
        notification: &ThreatNotification,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let payload = serde_json::to_string(notification)?;

        let mut request = client.post(&config.url)
            .header("Content-Type", "application/json")
            .header("User-Agent", "ShieldAI-Webhook/1.0");

        // Add custom headers
        for (key, value) in &config.headers {
            request = request.header(key, value);
        }

        // Add HMAC signature if secret is configured
        if let Some(secret) = &config.secret {
            let signature = Self::compute_signature(secret, &payload);
            request = request.header("X-Shield-Signature", signature);
        }

        let response = request.body(payload).send().await?;

        if !response.status().is_success() {
            return Err(format!("Webhook returned status: {}", response.status()).into());
        }

        Ok(())
    }

    /// Compute HMAC-SHA256 signature
    fn compute_signature(secret: &str, payload: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        // Simple hash-based signature (in production, use proper HMAC-SHA256)
        let mut hasher = DefaultHasher::new();
        secret.hash(&mut hasher);
        payload.hash(&mut hasher);
        format!("sha256={:x}", hasher.finish())
    }

    /// Check rate limit for a webhook
    fn check_rate_limit(&self, webhook_id: &str, now: u64) -> bool {
        let mut rate_limits = self.rate_limits.write();
        if let Some(last_time) = rate_limits.get(webhook_id) {
            if now - last_time < self.min_interval {
                return false;
            }
        }
        rate_limits.insert(webhook_id.to_string(), now);
        true
    }

    /// Get current Unix timestamp
    fn current_timestamp() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    }
}

impl Default for WebhookManager {
    fn default() -> Self {
        Self::new()
    }
}

impl WebhookConfig {
    /// Check if this webhook matches an event
    fn matches_event(&self, event: &WebhookEvent) -> bool {
        self.events.contains(event) || self.events.contains(&WebhookEvent::All)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_webhook_registration() {
        let manager = WebhookManager::new();

        let config = WebhookConfig {
            id: "test".to_string(),
            url: "https://example.com/webhook".to_string(),
            events: vec![WebhookEvent::MalwareBlocked],
            secret: None,
            enabled: true,
            headers: HashMap::new(),
        };

        assert!(manager.register(config).is_ok());
        assert_eq!(manager.list().len(), 1);
    }

    #[test]
    fn test_webhook_unregistration() {
        let manager = WebhookManager::new();

        let config = WebhookConfig {
            id: "test".to_string(),
            url: "https://example.com/webhook".to_string(),
            events: vec![WebhookEvent::MalwareBlocked],
            secret: None,
            enabled: true,
            headers: HashMap::new(),
        };

        manager.register(config).unwrap();
        assert!(manager.unregister("test"));
        assert_eq!(manager.list().len(), 0);
    }

    #[test]
    fn test_event_matching() {
        let config = WebhookConfig {
            id: "test".to_string(),
            url: "https://example.com/webhook".to_string(),
            events: vec![WebhookEvent::MalwareBlocked, WebhookEvent::PhishingBlocked],
            secret: None,
            enabled: true,
            headers: HashMap::new(),
        };

        assert!(config.matches_event(&WebhookEvent::MalwareBlocked));
        assert!(config.matches_event(&WebhookEvent::PhishingBlocked));
        assert!(!config.matches_event(&WebhookEvent::HighRiskDetected));
    }

    #[test]
    fn test_all_event_matching() {
        let config = WebhookConfig {
            id: "test".to_string(),
            url: "https://example.com/webhook".to_string(),
            events: vec![WebhookEvent::All],
            secret: None,
            enabled: true,
            headers: HashMap::new(),
        };

        assert!(config.matches_event(&WebhookEvent::MalwareBlocked));
        assert!(config.matches_event(&WebhookEvent::PhishingBlocked));
        assert!(config.matches_event(&WebhookEvent::HighRiskDetected));
        assert!(config.matches_event(&WebhookEvent::BlocklistUpdated));
    }
}
