//! Shield AI Freemium Tier System
//!
//! Manages user subscriptions, feature gating, and usage tracking.
//!
//! ## Tier Structure
//!
//! - **Free**: Basic protection, limited features
//! - **Pro**: Full AI features, extended history
//! - **Enterprise**: Unlimited, SSO, audit logs

use chrono::{DateTime, Duration, Utc};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use tracing::info;
use uuid::Uuid;

/// Subscription tier levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub enum Tier {
    Free,
    Pro,
    Enterprise,
}

impl Tier {
    /// Get the tier limits
    pub fn limits(&self) -> TierLimits {
        match self {
            Tier::Free => TierLimits {
                queries_per_month: 100_000,
                history_days: 1,
                max_profiles: 1,
                max_devices: 3,
                ai_analysis: false,
                privacy_scoring: false,
                custom_rules: false,
                webhooks: false,
                api_access: false,
                sso: false,
                audit_logs: false,
                priority_support: false,
                vpn_access: false,
                family_controls: false,
                scheduled_filtering: false,
                realtime_threats: false,
            },
            Tier::Pro => TierLimits {
                queries_per_month: u64::MAX, // Unlimited
                history_days: 30,
                max_profiles: 10,
                max_devices: 50,
                ai_analysis: true,
                privacy_scoring: true,
                custom_rules: true,
                webhooks: true,
                api_access: true,
                sso: false,
                audit_logs: false,
                priority_support: true,
                vpn_access: true,
                family_controls: true,
                scheduled_filtering: true,
                realtime_threats: true,
            },
            Tier::Enterprise => TierLimits {
                queries_per_month: u64::MAX,
                history_days: 365,
                max_profiles: u32::MAX,
                max_devices: u32::MAX,
                ai_analysis: true,
                privacy_scoring: true,
                custom_rules: true,
                webhooks: true,
                api_access: true,
                sso: true,
                audit_logs: true,
                priority_support: true,
                vpn_access: true,
                family_controls: true,
                scheduled_filtering: true,
                realtime_threats: true,
            },
        }
    }

    /// Get monthly price in cents
    pub fn price_cents(&self) -> u32 {
        match self {
            Tier::Free => 0,
            Tier::Pro => 99,         // $0.99/month
            Tier::Enterprise => 0,   // Custom pricing
        }
    }

    /// Get yearly price in cents (with discount)
    pub fn yearly_price_cents(&self) -> u32 {
        match self {
            Tier::Free => 0,
            Tier::Pro => 799,        // $7.99/year (~33% discount)
            Tier::Enterprise => 0,   // Custom pricing
        }
    }
}

/// Limits for each tier
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TierLimits {
    pub queries_per_month: u64,
    pub history_days: u32,
    pub max_profiles: u32,
    pub max_devices: u32,
    pub ai_analysis: bool,
    pub privacy_scoring: bool,
    pub custom_rules: bool,
    pub webhooks: bool,
    pub api_access: bool,
    pub sso: bool,
    pub audit_logs: bool,
    pub priority_support: bool,
    // Premium mobile features
    pub vpn_access: bool,
    pub family_controls: bool,
    pub scheduled_filtering: bool,
    pub realtime_threats: bool,
}

/// User subscription
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subscription {
    pub id: Uuid,
    pub user_id: String,
    pub tier: Tier,
    pub status: SubscriptionStatus,
    pub created_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub billing_cycle: BillingCycle,
    pub stripe_customer_id: Option<String>,
    pub stripe_subscription_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SubscriptionStatus {
    Active,
    Trialing,
    PastDue,
    Canceled,
    Expired,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum BillingCycle {
    Monthly,
    Yearly,
    Lifetime,
}

/// Usage tracking for a user
#[derive(Debug)]
pub struct UsageTracker {
    queries_this_month: AtomicU64,
    #[allow(dead_code)] // Reserved for monthly usage reset feature
    month_start: DateTime<Utc>,
    profiles_count: AtomicU64,
    devices_count: AtomicU64,
}

impl UsageTracker {
    pub fn new() -> Self {
        Self {
            queries_this_month: AtomicU64::new(0),
            month_start: Utc::now(),
            profiles_count: AtomicU64::new(0),
            devices_count: AtomicU64::new(0),
        }
    }

    pub fn increment_queries(&self) {
        self.queries_this_month.fetch_add(1, Ordering::Relaxed);
    }

    pub fn queries_used(&self) -> u64 {
        self.queries_this_month.load(Ordering::Relaxed)
    }

    pub fn reset_monthly(&self) {
        self.queries_this_month.store(0, Ordering::Relaxed);
    }
}

impl Default for UsageTracker {
    fn default() -> Self {
        Self::new()
    }
}

/// Feature gate check results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureCheck {
    pub allowed: bool,
    pub feature: String,
    pub reason: Option<String>,
    pub upgrade_tier: Option<Tier>,
}

/// Tier management system
pub struct TierManager {
    subscriptions: DashMap<String, Subscription>,
    usage: DashMap<String, UsageTracker>,
}

impl TierManager {
    pub fn new() -> Self {
        info!("Initializing tier management system");
        Self {
            subscriptions: DashMap::new(),
            usage: DashMap::new(),
        }
    }

    /// Get or create a subscription for a user
    pub fn get_subscription(&self, user_id: &str) -> Subscription {
        self.subscriptions
            .entry(user_id.to_string())
            .or_insert_with(|| {
                // Default to free tier
                Subscription {
                    id: Uuid::new_v4(),
                    user_id: user_id.to_string(),
                    tier: Tier::Free,
                    status: SubscriptionStatus::Active,
                    created_at: Utc::now(),
                    expires_at: None,
                    billing_cycle: BillingCycle::Monthly,
                    stripe_customer_id: None,
                    stripe_subscription_id: None,
                }
            })
            .clone()
    }

    /// Upgrade a user's subscription
    pub fn upgrade(&self, user_id: &str, tier: Tier) -> Result<Subscription, TierError> {
        let mut sub = self.get_subscription(user_id);

        if tier as u8 <= sub.tier as u8 {
            return Err(TierError::InvalidUpgrade);
        }

        sub.tier = tier;
        sub.status = SubscriptionStatus::Active;

        // Set expiration based on billing cycle
        sub.expires_at = Some(match sub.billing_cycle {
            BillingCycle::Monthly => Utc::now() + Duration::days(30),
            BillingCycle::Yearly => Utc::now() + Duration::days(365),
            BillingCycle::Lifetime => Utc::now() + Duration::days(36500), // ~100 years
        });

        self.subscriptions.insert(user_id.to_string(), sub.clone());
        info!("Upgraded user {} to {:?}", user_id, tier);

        Ok(sub)
    }

    /// Check if a feature is available for a user
    pub fn check_feature(&self, user_id: &str, feature: &str) -> FeatureCheck {
        let sub = self.get_subscription(user_id);
        let limits = sub.tier.limits();

        let (allowed, upgrade_tier) = match feature {
            "ai_analysis" => (limits.ai_analysis, Some(Tier::Pro)),
            "privacy_scoring" => (limits.privacy_scoring, Some(Tier::Pro)),
            "custom_rules" => (limits.custom_rules, Some(Tier::Pro)),
            "webhooks" => (limits.webhooks, Some(Tier::Pro)),
            "api_access" => (limits.api_access, Some(Tier::Pro)),
            "sso" => (limits.sso, Some(Tier::Enterprise)),
            "audit_logs" => (limits.audit_logs, Some(Tier::Enterprise)),
            "priority_support" => (limits.priority_support, Some(Tier::Pro)),
            // Mobile premium features
            "vpn_access" => (limits.vpn_access, Some(Tier::Pro)),
            "family_controls" => (limits.family_controls, Some(Tier::Pro)),
            "scheduled_filtering" => (limits.scheduled_filtering, Some(Tier::Pro)),
            "realtime_threats" => (limits.realtime_threats, Some(Tier::Pro)),
            _ => (true, None), // Unknown features are allowed
        };

        let reason = if !allowed {
            Some(format!(
                "Feature '{}' requires {:?} tier or higher",
                feature,
                upgrade_tier.unwrap_or(Tier::Pro)
            ))
        } else {
            None
        };

        FeatureCheck {
            allowed,
            feature: feature.to_string(),
            reason,
            upgrade_tier: if !allowed { upgrade_tier } else { None },
        }
    }

    /// Check if user can make more queries this month
    pub fn check_query_limit(&self, user_id: &str) -> FeatureCheck {
        let sub = self.get_subscription(user_id);
        let limits = sub.tier.limits();

        let usage = self.usage
            .entry(user_id.to_string())
            .or_default();

        let queries_used = usage.queries_used();
        let allowed = queries_used < limits.queries_per_month;

        FeatureCheck {
            allowed,
            feature: "query".to_string(),
            reason: if !allowed {
                Some(format!(
                    "Monthly query limit reached ({}/{})",
                    queries_used, limits.queries_per_month
                ))
            } else {
                None
            },
            upgrade_tier: if !allowed { Some(Tier::Pro) } else { None },
        }
    }

    /// Record a query for usage tracking
    pub fn record_query(&self, user_id: &str) {
        let usage = self.usage
            .entry(user_id.to_string())
            .or_default();
        usage.increment_queries();
    }

    /// Get usage statistics for a user
    pub fn get_usage(&self, user_id: &str) -> UsageStats {
        let sub = self.get_subscription(user_id);
        let limits = sub.tier.limits();

        let usage = self.usage
            .entry(user_id.to_string())
            .or_default();

        UsageStats {
            tier: sub.tier,
            queries_used: usage.queries_used(),
            queries_limit: limits.queries_per_month,
            queries_remaining: limits.queries_per_month.saturating_sub(usage.queries_used()),
            profiles_used: usage.profiles_count.load(Ordering::Relaxed) as u32,
            profiles_limit: limits.max_profiles,
            devices_used: usage.devices_count.load(Ordering::Relaxed) as u32,
            devices_limit: limits.max_devices,
            features: FeatureAvailability {
                ai_analysis: limits.ai_analysis,
                privacy_scoring: limits.privacy_scoring,
                custom_rules: limits.custom_rules,
                webhooks: limits.webhooks,
                api_access: limits.api_access,
                sso: limits.sso,
                audit_logs: limits.audit_logs,
                vpn_access: limits.vpn_access,
                family_controls: limits.family_controls,
                scheduled_filtering: limits.scheduled_filtering,
                realtime_threats: limits.realtime_threats,
            },
        }
    }

    /// Start a trial for a user
    pub fn start_trial(&self, user_id: &str, tier: Tier) -> Result<Subscription, TierError> {
        let mut sub = self.get_subscription(user_id);

        if sub.tier != Tier::Free {
            return Err(TierError::AlreadySubscribed);
        }

        sub.tier = tier;
        sub.status = SubscriptionStatus::Trialing;
        sub.expires_at = Some(Utc::now() + Duration::days(14)); // 14-day trial

        self.subscriptions.insert(user_id.to_string(), sub.clone());
        info!("Started {:?} trial for user {}", tier, user_id);

        Ok(sub)
    }

    /// Cancel a subscription
    pub fn cancel(&self, user_id: &str) -> Result<Subscription, TierError> {
        let mut sub = self.subscriptions
            .get_mut(user_id)
            .ok_or(TierError::NotFound)?;

        sub.status = SubscriptionStatus::Canceled;
        info!("Canceled subscription for user {}", user_id);

        Ok(sub.clone())
    }
}

impl Default for TierManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Usage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageStats {
    pub tier: Tier,
    pub queries_used: u64,
    pub queries_limit: u64,
    pub queries_remaining: u64,
    pub profiles_used: u32,
    pub profiles_limit: u32,
    pub devices_used: u32,
    pub devices_limit: u32,
    pub features: FeatureAvailability,
}

/// Which features are available
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeatureAvailability {
    pub ai_analysis: bool,
    pub privacy_scoring: bool,
    pub custom_rules: bool,
    pub webhooks: bool,
    pub api_access: bool,
    pub sso: bool,
    pub audit_logs: bool,
    pub vpn_access: bool,
    pub family_controls: bool,
    pub scheduled_filtering: bool,
    pub realtime_threats: bool,
}

/// Tier system errors
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TierError {
    NotFound,
    AlreadySubscribed,
    InvalidUpgrade,
    PaymentFailed,
    Expired,
}

impl std::fmt::Display for TierError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TierError::NotFound => write!(f, "Subscription not found"),
            TierError::AlreadySubscribed => write!(f, "User already has an active subscription"),
            TierError::InvalidUpgrade => write!(f, "Cannot downgrade or stay at same tier"),
            TierError::PaymentFailed => write!(f, "Payment processing failed"),
            TierError::Expired => write!(f, "Subscription has expired"),
        }
    }
}

impl std::error::Error for TierError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_free_tier_limits() {
        let manager = TierManager::new();
        let sub = manager.get_subscription("test_user");
        assert_eq!(sub.tier, Tier::Free);

        let check = manager.check_feature("test_user", "ai_analysis");
        assert!(!check.allowed);
        assert_eq!(check.upgrade_tier, Some(Tier::Pro));
    }

    #[test]
    fn test_upgrade() {
        let manager = TierManager::new();
        let sub = manager.upgrade("test_user", Tier::Pro).unwrap();
        assert_eq!(sub.tier, Tier::Pro);

        let check = manager.check_feature("test_user", "ai_analysis");
        assert!(check.allowed);
    }

    #[test]
    fn test_usage_tracking() {
        let manager = TierManager::new();

        for _ in 0..10 {
            manager.record_query("test_user");
        }

        let stats = manager.get_usage("test_user");
        assert_eq!(stats.queries_used, 10);
    }
}
