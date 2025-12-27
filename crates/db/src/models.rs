//! Database models

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// User account stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbUser {
    pub id: String,
    pub email: String,
    pub password_hash: String,
    pub tier: String,
    pub email_verified: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Device registration stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbDevice {
    pub id: String,
    pub user_id: String,
    pub device_name: String,
    pub platform: String,
    pub push_token: Option<String>,
    pub os_version: Option<String>,
    pub app_version: Option<String>,
    pub last_seen: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// Refresh token stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbRefreshToken {
    pub token: String,
    pub user_id: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// Blocklist entry stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbBlocklistEntry {
    pub domain: String,
    pub category: String,
    pub source: String,
    pub added_at: DateTime<Utc>,
}

/// Allowlist entry stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbAllowlistEntry {
    pub domain: String,
    pub added_by: Option<String>,
    pub added_at: DateTime<Utc>,
}

/// Query log entry stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbQueryLog {
    pub id: i64,
    pub domain: String,
    pub client_ip: String,
    pub blocked: bool,
    pub cached: bool,
    pub response_time_ms: i64,
    pub timestamp: DateTime<Utc>,
}

/// Domain embedding stored in Qdrant
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainEmbedding {
    pub domain: String,
    pub vector: Vec<f32>,
    pub risk_score: f32,
    pub categories: Vec<String>,
    pub last_analyzed: DateTime<Utc>,
}

/// Threat vector stored in Qdrant
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatVector {
    pub domain: String,
    pub embedding: Vec<f32>,
    pub threat_type: String,
    pub confidence: f32,
    pub indicators: Vec<String>,
}

/// User profile stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbProfile {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub protection_level: String,
    pub blocked_categories: Vec<String>,
    pub custom_blocklist: Vec<String>,
    pub custom_allowlist: Vec<String>,
    pub time_rules: String, // JSON serialized TimeRule array
    pub device_ids: Vec<String>,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Subscription stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbSubscription {
    pub id: String,
    pub user_id: String,
    pub tier: String, // "free", "pro", "enterprise"
    pub status: String, // "active", "trialing", "past_due", "canceled", "expired"
    pub billing_cycle: String, // "monthly", "yearly", "lifetime"
    pub stripe_customer_id: Option<String>,
    pub stripe_subscription_id: Option<String>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Usage tracking stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbUsage {
    pub user_id: String,
    pub month: String, // YYYY-MM format
    pub queries_count: i64,
    pub profiles_count: i64,
    pub devices_count: i64,
    pub updated_at: DateTime<Utc>,
}
