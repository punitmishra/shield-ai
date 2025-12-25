//! Shield AI Profile System
//!
//! User/device profiles with time-based rules and parental controls.

use chrono::{DateTime, Datelike, Local, NaiveTime, Utc, Weekday};
use dashmap::DashMap;
use parking_lot::RwLock;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::Arc;
use tracing::info;
use uuid::Uuid;

/// Protection levels for profiles
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProtectionLevel {
    Kid,    // Maximum protection
    Teen,   // Moderate protection
    Adult,  // Minimal protection
    Custom, // User-defined rules
}

impl ProtectionLevel {
    pub fn default_block_categories(&self) -> Vec<&'static str> {
        match self {
            ProtectionLevel::Kid => vec!["adult", "gambling", "violence", "malware", "phishing", "social-media"],
            ProtectionLevel::Teen => vec!["adult", "gambling", "malware", "phishing"],
            ProtectionLevel::Adult => vec!["malware", "phishing"],
            ProtectionLevel::Custom => vec![],
        }
    }
}

/// Action to take when a rule matches
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RuleAction {
    Block,
    Allow,
    Monitor,
}

/// Time-based rule for controlling access
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeRule {
    pub id: Uuid,
    pub name: String,
    pub days_of_week: Vec<Weekday>,
    pub start_time: NaiveTime,
    pub end_time: NaiveTime,
    pub action: RuleAction,
    pub domain_patterns: Vec<String>,
}

impl TimeRule {
    pub fn new(
        name: String,
        days: Vec<Weekday>,
        start: NaiveTime,
        end: NaiveTime,
        action: RuleAction,
        patterns: Vec<String>,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            name,
            days_of_week: days,
            start_time: start,
            end_time: end,
            action,
            domain_patterns: patterns,
        }
    }

    pub fn is_active_at(&self, time: &DateTime<Local>) -> bool {
        if !self.days_of_week.contains(&time.weekday()) {
            return false;
        }
        let current = time.time();
        if self.start_time <= self.end_time {
            current >= self.start_time && current <= self.end_time
        } else {
            current >= self.start_time || current <= self.end_time
        }
    }

    pub fn matches_domain(&self, domain: &str) -> bool {
        self.domain_patterns.iter().any(|pattern| {
            if pattern.contains('*') {
                let regex_pattern = pattern.replace(".", "\\.").replace("*", ".*");
                Regex::new(&format!("^{}$", regex_pattern))
                    .map(|re| re.is_match(domain))
                    .unwrap_or(false)
            } else {
                domain == pattern
            }
        })
    }
}

/// User or device profile
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: Uuid,
    pub name: String,
    pub protection_level: ProtectionLevel,
    pub custom_blocklists: Vec<String>,
    pub custom_allowlists: Vec<String>,
    pub time_rules: Vec<TimeRule>,
    pub device_ids: HashSet<String>,
    pub created_at: DateTime<Utc>,
    pub enabled: bool,
}

impl Profile {
    pub fn new(name: String, level: ProtectionLevel) -> Self {
        Self {
            id: Uuid::new_v4(),
            name,
            protection_level: level,
            custom_blocklists: Vec::new(),
            custom_allowlists: Vec::new(),
            time_rules: Vec::new(),
            device_ids: HashSet::new(),
            created_at: Utc::now(),
            enabled: true,
        }
    }

    pub fn is_domain_allowed(&self, domain: &str) -> bool {
        if !self.enabled {
            return true;
        }

        // Allowlist has highest priority
        if self.custom_allowlists.iter().any(|p| domain == p || domain.ends_with(p)) {
            return true;
        }

        // Check blocklist
        if self.custom_blocklists.iter().any(|p| domain == p || domain.ends_with(p)) {
            return false;
        }

        // Check time rules
        let now = Local::now();
        for rule in &self.time_rules {
            if rule.is_active_at(&now) && rule.matches_domain(domain) {
                match rule.action {
                    RuleAction::Block => return false,
                    RuleAction::Allow => return true,
                    RuleAction::Monitor => {}
                }
            }
        }

        true
    }
}

/// Profile manager for CRUD operations
pub struct ProfileManager {
    profiles: Arc<DashMap<Uuid, Profile>>,
    device_to_profile: Arc<DashMap<String, Uuid>>,
    default_profile_id: Arc<RwLock<Option<Uuid>>>,
}

impl ProfileManager {
    pub fn new() -> Self {
        info!("Initializing Profile Manager");
        Self {
            profiles: Arc::new(DashMap::new()),
            device_to_profile: Arc::new(DashMap::new()),
            default_profile_id: Arc::new(RwLock::new(None)),
        }
    }

    pub fn create_profile(&self, name: String, level: ProtectionLevel) -> Uuid {
        let profile = Profile::new(name.clone(), level);
        let id = profile.id;
        self.profiles.insert(id, profile);
        info!("Created profile '{}' with ID {}", name, id);
        id
    }

    pub fn get_profile(&self, id: &Uuid) -> Option<Profile> {
        self.profiles.get(id).map(|p| p.clone())
    }

    pub fn list_profiles(&self) -> Vec<Profile> {
        self.profiles.iter().map(|p| p.clone()).collect()
    }

    pub fn delete_profile(&self, id: &Uuid) -> bool {
        self.profiles.remove(id).is_some()
    }

    pub fn assign_device(&self, device_id: String, profile_id: &Uuid) -> bool {
        if let Some(mut profile) = self.profiles.get_mut(profile_id) {
            profile.device_ids.insert(device_id.clone());
            self.device_to_profile.insert(device_id, *profile_id);
            true
        } else {
            false
        }
    }

    pub fn get_device_profile(&self, device_id: &str) -> Option<Profile> {
        self.device_to_profile
            .get(device_id)
            .and_then(|id| self.get_profile(&id))
    }

    pub fn is_domain_allowed_for_device(&self, device_id: &str, domain: &str) -> bool {
        if let Some(profile) = self.get_device_profile(device_id) {
            profile.is_domain_allowed(domain)
        } else if let Some(default) = self.default_profile_id.read().as_ref() {
            if let Some(profile) = self.get_profile(default) {
                return profile.is_domain_allowed(domain);
            }
            true
        } else {
            true
        }
    }

    pub fn stats(&self) -> ProfileStats {
        ProfileStats {
            total_profiles: self.profiles.len(),
            assigned_devices: self.device_to_profile.len(),
            total_rules: self.profiles.iter().map(|p| p.time_rules.len()).sum(),
        }
    }
}

impl Default for ProfileManager {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileStats {
    pub total_profiles: usize,
    pub assigned_devices: usize,
    pub total_rules: usize,
}
