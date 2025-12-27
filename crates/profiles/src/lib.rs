//! Shield AI Profile System
//!
//! User/device profiles with time-based rules and parental controls.

use chrono::{DateTime, Datelike, Local, NaiveTime, Utc, Weekday};
use dashmap::DashMap;
use parking_lot::RwLock;
use regex::Regex;
use serde::{Deserialize, Serialize};
use shield_db::models::DbProfile;
use shield_db::SqliteDb;
use std::collections::HashSet;
use std::sync::Arc;
use tracing::{error, info, warn};
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
            ProtectionLevel::Kid => vec![
                "adult",
                "gambling",
                "violence",
                "malware",
                "phishing",
                "social-media",
            ],
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
        if self
            .custom_allowlists
            .iter()
            .any(|p| domain == p || domain.ends_with(p))
        {
            return true;
        }

        // Check blocklist
        if self
            .custom_blocklists
            .iter()
            .any(|p| domain == p || domain.ends_with(p))
        {
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

/// Profile manager for CRUD operations with SQLite persistence
pub struct ProfileManager {
    profiles: Arc<DashMap<Uuid, Profile>>,
    device_to_profile: Arc<DashMap<String, Uuid>>,
    default_profile_id: Arc<RwLock<Option<Uuid>>>,
    db: Option<Arc<SqliteDb>>,
}

impl ProfileManager {
    /// Create a new in-memory profile manager (for testing)
    pub fn new() -> Self {
        info!("Initializing Profile Manager (in-memory mode)");
        Self {
            profiles: Arc::new(DashMap::new()),
            device_to_profile: Arc::new(DashMap::new()),
            default_profile_id: Arc::new(RwLock::new(None)),
            db: None,
        }
    }

    /// Create a profile manager with SQLite persistence
    pub fn with_sqlite(db: Arc<SqliteDb>) -> Self {
        info!("Initializing Profile Manager with SQLite persistence");
        let manager = Self {
            profiles: Arc::new(DashMap::new()),
            device_to_profile: Arc::new(DashMap::new()),
            default_profile_id: Arc::new(RwLock::new(None)),
            db: Some(db),
        };

        // Load existing profiles from database
        manager.load_from_db();
        manager
    }

    /// Load profiles from database into memory
    fn load_from_db(&self) {
        if let Some(ref db) = self.db {
            match db.get_all_profiles() {
                Ok(db_profiles) => {
                    for db_profile in db_profiles {
                        if let Some(profile) = Self::db_to_profile(&db_profile) {
                            let id = profile.id;
                            // Build device mapping
                            for device_id in &profile.device_ids {
                                self.device_to_profile.insert(device_id.clone(), id);
                            }
                            self.profiles.insert(id, profile);
                        }
                    }
                    info!("Loaded {} profiles from database", self.profiles.len());
                }
                Err(e) => {
                    error!("Failed to load profiles from database: {}", e);
                }
            }
        }
    }

    /// Convert DbProfile to Profile
    fn db_to_profile(db: &DbProfile) -> Option<Profile> {
        let id = Uuid::parse_str(&db.id).ok()?;
        let protection_level = match db.protection_level.as_str() {
            "kid" => ProtectionLevel::Kid,
            "teen" => ProtectionLevel::Teen,
            "adult" => ProtectionLevel::Adult,
            _ => ProtectionLevel::Custom,
        };

        // Parse time rules from JSON
        let time_rules: Vec<TimeRule> =
            serde_json::from_str(&db.time_rules).unwrap_or_default();

        Some(Profile {
            id,
            name: db.name.clone(),
            protection_level,
            custom_blocklists: db.custom_blocklist.clone(),
            custom_allowlists: db.custom_allowlist.clone(),
            time_rules,
            device_ids: db.device_ids.iter().cloned().collect(),
            created_at: db.created_at,
            enabled: db.enabled,
        })
    }

    /// Convert Profile to DbProfile
    fn profile_to_db(profile: &Profile, user_id: &str) -> DbProfile {
        DbProfile {
            id: profile.id.to_string(),
            user_id: user_id.to_string(),
            name: profile.name.clone(),
            protection_level: match profile.protection_level {
                ProtectionLevel::Kid => "kid".to_string(),
                ProtectionLevel::Teen => "teen".to_string(),
                ProtectionLevel::Adult => "adult".to_string(),
                ProtectionLevel::Custom => "custom".to_string(),
            },
            blocked_categories: profile
                .protection_level
                .default_block_categories()
                .iter()
                .map(|s| s.to_string())
                .collect(),
            custom_blocklist: profile.custom_blocklists.clone(),
            custom_allowlist: profile.custom_allowlists.clone(),
            time_rules: serde_json::to_string(&profile.time_rules).unwrap_or_default(),
            device_ids: profile.device_ids.iter().cloned().collect(),
            enabled: profile.enabled,
            created_at: profile.created_at,
            updated_at: Utc::now(),
        }
    }

    /// Create a profile (optionally with user_id for multi-user support)
    pub fn create_profile(&self, name: String, level: ProtectionLevel) -> Uuid {
        self.create_profile_for_user(name, level, "default")
    }

    /// Create a profile for a specific user
    pub fn create_profile_for_user(
        &self,
        name: String,
        level: ProtectionLevel,
        user_id: &str,
    ) -> Uuid {
        let profile = Profile::new(name.clone(), level);
        let id = profile.id;

        // Persist to database
        if let Some(ref db) = self.db {
            let db_profile = Self::profile_to_db(&profile, user_id);
            if let Err(e) = db.create_profile(&db_profile) {
                warn!("Failed to persist profile to database: {}", e);
            }
        }

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

    /// Get profiles for a specific user
    pub fn list_profiles_for_user(&self, user_id: &str) -> Vec<Profile> {
        if let Some(ref db) = self.db {
            match db.get_user_profiles(user_id) {
                Ok(db_profiles) => {
                    return db_profiles
                        .iter()
                        .filter_map(Self::db_to_profile)
                        .collect();
                }
                Err(e) => {
                    warn!("Failed to get user profiles from database: {}", e);
                }
            }
        }
        // Fallback to all profiles (for in-memory mode)
        self.list_profiles()
    }

    pub fn delete_profile(&self, id: &Uuid) -> bool {
        // Remove from database
        if let Some(ref db) = self.db {
            if let Err(e) = db.delete_profile(&id.to_string()) {
                warn!("Failed to delete profile from database: {}", e);
            }
        }

        // Remove device mappings
        if let Some((_, profile)) = self.profiles.remove(id) {
            for device_id in profile.device_ids {
                self.device_to_profile.remove(&device_id);
            }
            true
        } else {
            false
        }
    }

    pub fn assign_device(&self, device_id: String, profile_id: &Uuid) -> bool {
        if let Some(mut profile) = self.profiles.get_mut(profile_id) {
            profile.device_ids.insert(device_id.clone());
            self.device_to_profile.insert(device_id, *profile_id);

            // Update in database
            if let Some(ref db) = self.db {
                let db_profile = Self::profile_to_db(&profile, "default");
                if let Err(e) = db.update_profile(&db_profile) {
                    warn!("Failed to update profile in database: {}", e);
                }
            }
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

    /// Update a profile
    pub fn update_profile(&self, profile: Profile) -> bool {
        let id = profile.id;

        // Update in database
        if let Some(ref db) = self.db {
            let db_profile = Self::profile_to_db(&profile, "default");
            if let Err(e) = db.update_profile(&db_profile) {
                warn!("Failed to update profile in database: {}", e);
            }
        }

        // Update device mappings
        for device_id in &profile.device_ids {
            self.device_to_profile.insert(device_id.clone(), id);
        }

        self.profiles.insert(id, profile);
        true
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
