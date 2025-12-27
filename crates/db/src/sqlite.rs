//! SQLite database operations
//!
//! Handles all relational data:
//! - Users and authentication
//! - Devices and sessions
//! - Blocklists and allowlists
//! - Query logs
//! - User profiles

use crate::error::DbError;
use crate::models::*;
use chrono::{DateTime, Utc};
use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;
use std::path::Path;
use tracing::{debug, info};

pub type SqlitePool = Pool<SqliteConnectionManager>;
pub type SqliteConn = PooledConnection<SqliteConnectionManager>;

/// SQLite database wrapper with connection pooling
pub struct SqliteDb {
    pool: SqlitePool,
}

impl SqliteDb {
    /// Create new SQLite connection pool
    pub fn new(path: &str) -> Result<Self, DbError> {
        // Ensure data directory exists
        if let Some(parent) = Path::new(path).parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let manager = SqliteConnectionManager::file(path);
        let pool = Pool::builder().max_size(10).build(manager)?;

        let db = Self { pool };
        db.init_schema()?;

        Ok(db)
    }

    /// Get a connection from the pool
    pub fn conn(&self) -> Result<SqliteConn, DbError> {
        Ok(self.pool.get()?)
    }

    /// Initialize database schema
    fn init_schema(&self) -> Result<(), DbError> {
        let conn = self.conn()?;

        conn.execute_batch(
            r#"
            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                tier TEXT DEFAULT 'free',
                email_verified INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

            -- Devices table
            CREATE TABLE IF NOT EXISTS devices (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                device_name TEXT NOT NULL,
                platform TEXT NOT NULL,
                push_token TEXT,
                os_version TEXT,
                app_version TEXT,
                last_seen TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);

            -- Refresh tokens table
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_tokens_user ON refresh_tokens(user_id);

            -- Blocklist table
            CREATE TABLE IF NOT EXISTS blocklist (
                domain TEXT PRIMARY KEY,
                category TEXT DEFAULT 'custom',
                source TEXT DEFAULT 'user',
                added_at TEXT NOT NULL
            );

            -- Allowlist table
            CREATE TABLE IF NOT EXISTS allowlist (
                domain TEXT PRIMARY KEY,
                added_by TEXT,
                added_at TEXT NOT NULL
            );

            -- Query log table (with automatic cleanup)
            CREATE TABLE IF NOT EXISTS query_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT NOT NULL,
                client_ip TEXT,
                blocked INTEGER DEFAULT 0,
                cached INTEGER DEFAULT 0,
                response_time_ms INTEGER,
                timestamp TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_query_timestamp ON query_log(timestamp);
            CREATE INDEX IF NOT EXISTS idx_query_domain ON query_log(domain);

            -- Profiles table
            CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                protection_level TEXT DEFAULT 'balanced',
                blocked_categories TEXT DEFAULT '[]',
                custom_blocklist TEXT DEFAULT '[]',
                custom_allowlist TEXT DEFAULT '[]',
                time_rules TEXT DEFAULT '[]',
                device_ids TEXT DEFAULT '[]',
                enabled INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

            -- Subscriptions table
            CREATE TABLE IF NOT EXISTS subscriptions (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL,
                tier TEXT DEFAULT 'free',
                status TEXT DEFAULT 'active',
                billing_cycle TEXT DEFAULT 'monthly',
                stripe_customer_id TEXT,
                stripe_subscription_id TEXT,
                expires_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

            -- Usage tracking table
            CREATE TABLE IF NOT EXISTS usage (
                user_id TEXT NOT NULL,
                month TEXT NOT NULL,
                queries_count INTEGER DEFAULT 0,
                profiles_count INTEGER DEFAULT 0,
                devices_count INTEGER DEFAULT 0,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (user_id, month),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        "#,
        )?;

        info!("SQLite schema initialized");
        Ok(())
    }

    // =========================================================================
    // User Operations
    // =========================================================================

    /// Create a new user
    pub fn create_user(&self, user: &DbUser) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT INTO users (id, email, password_hash, tier, email_verified, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                user.id,
                user.email,
                user.password_hash,
                user.tier,
                user.email_verified,
                user.created_at.to_rfc3339(),
                user.updated_at.to_rfc3339(),
            ],
        )?;
        debug!("Created user: {}", user.email);
        Ok(())
    }

    /// Get user by ID
    pub fn get_user(&self, id: &str) -> Result<Option<DbUser>, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, email, password_hash, tier, email_verified, created_at, updated_at
             FROM users WHERE id = ?1",
        )?;

        let user = stmt
            .query_row(params![id], |row| {
                Ok(DbUser {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    password_hash: row.get(2)?,
                    tier: row.get(3)?,
                    email_verified: row.get(4)?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                        .unwrap()
                        .with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                        .unwrap()
                        .with_timezone(&Utc),
                })
            })
            .optional()?;

        Ok(user)
    }

    /// Get user by email
    pub fn get_user_by_email(&self, email: &str) -> Result<Option<DbUser>, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, email, password_hash, tier, email_verified, created_at, updated_at
             FROM users WHERE email = ?1",
        )?;

        let user = stmt
            .query_row(params![email], |row| {
                Ok(DbUser {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    password_hash: row.get(2)?,
                    tier: row.get(3)?,
                    email_verified: row.get(4)?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                        .unwrap()
                        .with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                        .unwrap()
                        .with_timezone(&Utc),
                })
            })
            .optional()?;

        Ok(user)
    }

    /// Update user tier
    pub fn update_user_tier(&self, id: &str, tier: &str) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE users SET tier = ?1, updated_at = ?2 WHERE id = ?3",
            params![tier, Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    // =========================================================================
    // Device Operations
    // =========================================================================

    /// Create a new device
    pub fn create_device(&self, device: &DbDevice) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT INTO devices (id, user_id, device_name, platform, push_token, os_version, app_version, last_seen, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                device.id,
                device.user_id,
                device.device_name,
                device.platform,
                device.push_token,
                device.os_version,
                device.app_version,
                device.last_seen.to_rfc3339(),
                device.created_at.to_rfc3339(),
            ],
        )?;
        debug!(
            "Created device: {} for user {}",
            device.device_name, device.user_id
        );
        Ok(())
    }

    /// Get devices for a user
    pub fn get_user_devices(&self, user_id: &str) -> Result<Vec<DbDevice>, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, user_id, device_name, platform, push_token, os_version, app_version, last_seen, created_at
             FROM devices WHERE user_id = ?1"
        )?;

        let devices = stmt
            .query_map(params![user_id], |row| {
                Ok(DbDevice {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    device_name: row.get(2)?,
                    platform: row.get(3)?,
                    push_token: row.get(4)?,
                    os_version: row.get(5)?,
                    app_version: row.get(6)?,
                    last_seen: DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                        .unwrap()
                        .with_timezone(&Utc),
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?)
                        .unwrap()
                        .with_timezone(&Utc),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(devices)
    }

    /// Update device push token
    pub fn update_device_push_token(&self, id: &str, push_token: &str) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE devices SET push_token = ?1, last_seen = ?2 WHERE id = ?3",
            params![push_token, Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    /// Update device last seen
    pub fn touch_device(&self, id: &str) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE devices SET last_seen = ?1 WHERE id = ?2",
            params![Utc::now().to_rfc3339(), id],
        )?;
        Ok(())
    }

    // =========================================================================
    // Token Operations
    // =========================================================================

    /// Store refresh token
    pub fn store_refresh_token(&self, token: &DbRefreshToken) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO refresh_tokens (token, user_id, expires_at, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                token.token,
                token.user_id,
                token.expires_at.to_rfc3339(),
                token.created_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    /// Get refresh token
    pub fn get_refresh_token(&self, token: &str) -> Result<Option<DbRefreshToken>, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT token, user_id, expires_at, created_at FROM refresh_tokens WHERE token = ?1",
        )?;

        let token = stmt
            .query_row(params![token], |row| {
                Ok(DbRefreshToken {
                    token: row.get(0)?,
                    user_id: row.get(1)?,
                    expires_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(2)?)
                        .unwrap()
                        .with_timezone(&Utc),
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?)
                        .unwrap()
                        .with_timezone(&Utc),
                })
            })
            .optional()?;

        Ok(token)
    }

    /// Delete refresh token
    pub fn delete_refresh_token(&self, token: &str) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "DELETE FROM refresh_tokens WHERE token = ?1",
            params![token],
        )?;
        Ok(())
    }

    /// Clean expired tokens
    pub fn clean_expired_tokens(&self) -> Result<usize, DbError> {
        let conn = self.conn()?;
        let deleted = conn.execute(
            "DELETE FROM refresh_tokens WHERE expires_at < ?1",
            params![Utc::now().to_rfc3339()],
        )?;
        Ok(deleted)
    }

    // =========================================================================
    // Blocklist Operations
    // =========================================================================

    /// Add domain to blocklist
    pub fn add_to_blocklist(&self, entry: &DbBlocklistEntry) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO blocklist (domain, category, source, added_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                entry.domain,
                entry.category,
                entry.source,
                entry.added_at.to_rfc3339()
            ],
        )?;
        Ok(())
    }

    /// Remove domain from blocklist
    pub fn remove_from_blocklist(&self, domain: &str) -> Result<bool, DbError> {
        let conn = self.conn()?;
        let deleted = conn.execute("DELETE FROM blocklist WHERE domain = ?1", params![domain])?;
        Ok(deleted > 0)
    }

    /// Check if domain is blocked
    pub fn is_blocked(&self, domain: &str) -> Result<bool, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT 1 FROM blocklist WHERE domain = ?1")?;
        Ok(stmt.exists(params![domain])?)
    }

    /// Get all blocked domains
    pub fn get_blocklist(&self) -> Result<Vec<DbBlocklistEntry>, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT domain, category, source, added_at FROM blocklist")?;

        let entries = stmt
            .query_map([], |row| {
                Ok(DbBlocklistEntry {
                    domain: row.get(0)?,
                    category: row.get(1)?,
                    source: row.get(2)?,
                    added_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(3)?)
                        .unwrap()
                        .with_timezone(&Utc),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(entries)
    }

    /// Get blocklist size
    pub fn blocklist_size(&self) -> Result<usize, DbError> {
        let conn = self.conn()?;
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM blocklist", [], |row| row.get(0))?;
        Ok(count as usize)
    }

    // =========================================================================
    // Allowlist Operations
    // =========================================================================

    /// Add domain to allowlist
    pub fn add_to_allowlist(&self, entry: &DbAllowlistEntry) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO allowlist (domain, added_by, added_at)
             VALUES (?1, ?2, ?3)",
            params![entry.domain, entry.added_by, entry.added_at.to_rfc3339()],
        )?;
        Ok(())
    }

    /// Remove domain from allowlist
    pub fn remove_from_allowlist(&self, domain: &str) -> Result<bool, DbError> {
        let conn = self.conn()?;
        let deleted = conn.execute("DELETE FROM allowlist WHERE domain = ?1", params![domain])?;
        Ok(deleted > 0)
    }

    /// Check if domain is allowed
    pub fn is_allowed(&self, domain: &str) -> Result<bool, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT 1 FROM allowlist WHERE domain = ?1")?;
        Ok(stmt.exists(params![domain])?)
    }

    /// Get all allowed domains
    pub fn get_allowlist(&self) -> Result<Vec<DbAllowlistEntry>, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare("SELECT domain, added_by, added_at FROM allowlist")?;

        let entries = stmt
            .query_map([], |row| {
                Ok(DbAllowlistEntry {
                    domain: row.get(0)?,
                    added_by: row.get(1)?,
                    added_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(2)?)
                        .unwrap()
                        .with_timezone(&Utc),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(entries)
    }

    /// Get allowlist size
    pub fn allowlist_size(&self) -> Result<usize, DbError> {
        let conn = self.conn()?;
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM allowlist", [], |row| row.get(0))?;
        Ok(count as usize)
    }

    // =========================================================================
    // Query Log Operations
    // =========================================================================

    /// Log a DNS query
    pub fn log_query(&self, log: &DbQueryLog) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT INTO query_log (domain, client_ip, blocked, cached, response_time_ms, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                log.domain,
                log.client_ip,
                log.blocked,
                log.cached,
                log.response_time_ms,
                log.timestamp.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    /// Get recent queries
    pub fn get_recent_queries(&self, limit: usize) -> Result<Vec<DbQueryLog>, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, domain, client_ip, blocked, cached, response_time_ms, timestamp
             FROM query_log ORDER BY timestamp DESC LIMIT ?1",
        )?;

        let logs = stmt
            .query_map(params![limit as i64], |row| {
                Ok(DbQueryLog {
                    id: row.get(0)?,
                    domain: row.get(1)?,
                    client_ip: row.get(2)?,
                    blocked: row.get(3)?,
                    cached: row.get(4)?,
                    response_time_ms: row.get(5)?,
                    timestamp: DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                        .unwrap()
                        .with_timezone(&Utc),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(logs)
    }

    /// Get query stats
    pub fn get_query_stats(&self) -> Result<QueryStats, DbError> {
        let conn = self.conn()?;

        let total: i64 = conn.query_row("SELECT COUNT(*) FROM query_log", [], |r| r.get(0))?;
        let blocked: i64 = conn.query_row(
            "SELECT COUNT(*) FROM query_log WHERE blocked = 1",
            [],
            |r| r.get(0),
        )?;
        let cached: i64 =
            conn.query_row("SELECT COUNT(*) FROM query_log WHERE cached = 1", [], |r| {
                r.get(0)
            })?;

        Ok(QueryStats {
            total_queries: total as u64,
            blocked_queries: blocked as u64,
            cached_queries: cached as u64,
        })
    }

    /// Clean old query logs (keep last N days)
    pub fn clean_old_queries(&self, days: i64) -> Result<usize, DbError> {
        let conn = self.conn()?;
        let cutoff = Utc::now() - chrono::Duration::days(days);
        let deleted = conn.execute(
            "DELETE FROM query_log WHERE timestamp < ?1",
            params![cutoff.to_rfc3339()],
        )?;
        Ok(deleted)
    }

    // =========================================================================
    // Profile Operations
    // =========================================================================

    /// Create a new profile
    pub fn create_profile(&self, profile: &DbProfile) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT INTO profiles (id, user_id, name, protection_level, blocked_categories,
             custom_blocklist, custom_allowlist, time_rules, device_ids, enabled, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                profile.id,
                profile.user_id,
                profile.name,
                profile.protection_level,
                serde_json::to_string(&profile.blocked_categories).unwrap_or_default(),
                serde_json::to_string(&profile.custom_blocklist).unwrap_or_default(),
                serde_json::to_string(&profile.custom_allowlist).unwrap_or_default(),
                profile.time_rules,
                serde_json::to_string(&profile.device_ids).unwrap_or_default(),
                profile.enabled,
                profile.created_at.to_rfc3339(),
                profile.updated_at.to_rfc3339(),
            ],
        )?;
        debug!("Created profile: {} for user {}", profile.name, profile.user_id);
        Ok(())
    }

    /// Get profile by ID
    pub fn get_profile(&self, id: &str) -> Result<Option<DbProfile>, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, user_id, name, protection_level, blocked_categories, custom_blocklist,
             custom_allowlist, time_rules, device_ids, enabled, created_at, updated_at
             FROM profiles WHERE id = ?1",
        )?;

        let profile = stmt
            .query_row(params![id], |row| {
                Ok(DbProfile {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    name: row.get(2)?,
                    protection_level: row.get(3)?,
                    blocked_categories: serde_json::from_str(&row.get::<_, String>(4)?)
                        .unwrap_or_default(),
                    custom_blocklist: serde_json::from_str(&row.get::<_, String>(5)?)
                        .unwrap_or_default(),
                    custom_allowlist: serde_json::from_str(&row.get::<_, String>(6)?)
                        .unwrap_or_default(),
                    time_rules: row.get(7)?,
                    device_ids: serde_json::from_str(&row.get::<_, String>(8)?)
                        .unwrap_or_default(),
                    enabled: row.get(9)?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                        .unwrap()
                        .with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                        .unwrap()
                        .with_timezone(&Utc),
                })
            })
            .optional()?;

        Ok(profile)
    }

    /// Get all profiles for a user
    pub fn get_user_profiles(&self, user_id: &str) -> Result<Vec<DbProfile>, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, user_id, name, protection_level, blocked_categories, custom_blocklist,
             custom_allowlist, time_rules, device_ids, enabled, created_at, updated_at
             FROM profiles WHERE user_id = ?1",
        )?;

        let profiles = stmt
            .query_map(params![user_id], |row| {
                Ok(DbProfile {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    name: row.get(2)?,
                    protection_level: row.get(3)?,
                    blocked_categories: serde_json::from_str(&row.get::<_, String>(4)?)
                        .unwrap_or_default(),
                    custom_blocklist: serde_json::from_str(&row.get::<_, String>(5)?)
                        .unwrap_or_default(),
                    custom_allowlist: serde_json::from_str(&row.get::<_, String>(6)?)
                        .unwrap_or_default(),
                    time_rules: row.get(7)?,
                    device_ids: serde_json::from_str(&row.get::<_, String>(8)?)
                        .unwrap_or_default(),
                    enabled: row.get(9)?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                        .unwrap()
                        .with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                        .unwrap()
                        .with_timezone(&Utc),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(profiles)
    }

    /// Get all profiles
    pub fn get_all_profiles(&self) -> Result<Vec<DbProfile>, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, user_id, name, protection_level, blocked_categories, custom_blocklist,
             custom_allowlist, time_rules, device_ids, enabled, created_at, updated_at
             FROM profiles",
        )?;

        let profiles = stmt
            .query_map([], |row| {
                Ok(DbProfile {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    name: row.get(2)?,
                    protection_level: row.get(3)?,
                    blocked_categories: serde_json::from_str(&row.get::<_, String>(4)?)
                        .unwrap_or_default(),
                    custom_blocklist: serde_json::from_str(&row.get::<_, String>(5)?)
                        .unwrap_or_default(),
                    custom_allowlist: serde_json::from_str(&row.get::<_, String>(6)?)
                        .unwrap_or_default(),
                    time_rules: row.get(7)?,
                    device_ids: serde_json::from_str(&row.get::<_, String>(8)?)
                        .unwrap_or_default(),
                    enabled: row.get(9)?,
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(10)?)
                        .unwrap()
                        .with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                        .unwrap()
                        .with_timezone(&Utc),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(profiles)
    }

    /// Update a profile
    pub fn update_profile(&self, profile: &DbProfile) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE profiles SET name = ?1, protection_level = ?2, blocked_categories = ?3,
             custom_blocklist = ?4, custom_allowlist = ?5, time_rules = ?6, device_ids = ?7,
             enabled = ?8, updated_at = ?9 WHERE id = ?10",
            params![
                profile.name,
                profile.protection_level,
                serde_json::to_string(&profile.blocked_categories).unwrap_or_default(),
                serde_json::to_string(&profile.custom_blocklist).unwrap_or_default(),
                serde_json::to_string(&profile.custom_allowlist).unwrap_or_default(),
                profile.time_rules,
                serde_json::to_string(&profile.device_ids).unwrap_or_default(),
                profile.enabled,
                Utc::now().to_rfc3339(),
                profile.id,
            ],
        )?;
        Ok(())
    }

    /// Delete a profile
    pub fn delete_profile(&self, id: &str) -> Result<bool, DbError> {
        let conn = self.conn()?;
        let deleted = conn.execute("DELETE FROM profiles WHERE id = ?1", params![id])?;
        Ok(deleted > 0)
    }

    /// Get profile count
    pub fn profile_count(&self) -> Result<usize, DbError> {
        let conn = self.conn()?;
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM profiles", [], |row| row.get(0))?;
        Ok(count as usize)
    }

    // =========================================================================
    // Subscription Operations
    // =========================================================================

    /// Create or update a subscription
    pub fn upsert_subscription(&self, sub: &DbSubscription) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT OR REPLACE INTO subscriptions
             (id, user_id, tier, status, billing_cycle, stripe_customer_id,
              stripe_subscription_id, expires_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                sub.id,
                sub.user_id,
                sub.tier,
                sub.status,
                sub.billing_cycle,
                sub.stripe_customer_id,
                sub.stripe_subscription_id,
                sub.expires_at.map(|dt| dt.to_rfc3339()),
                sub.created_at.to_rfc3339(),
                sub.updated_at.to_rfc3339(),
            ],
        )?;
        debug!("Upserted subscription for user: {}", sub.user_id);
        Ok(())
    }

    /// Get subscription by user ID
    pub fn get_subscription(&self, user_id: &str) -> Result<Option<DbSubscription>, DbError> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, user_id, tier, status, billing_cycle, stripe_customer_id,
             stripe_subscription_id, expires_at, created_at, updated_at
             FROM subscriptions WHERE user_id = ?1",
        )?;

        let sub = stmt
            .query_row(params![user_id], |row| {
                let expires_at_str: Option<String> = row.get(7)?;
                Ok(DbSubscription {
                    id: row.get(0)?,
                    user_id: row.get(1)?,
                    tier: row.get(2)?,
                    status: row.get(3)?,
                    billing_cycle: row.get(4)?,
                    stripe_customer_id: row.get(5)?,
                    stripe_subscription_id: row.get(6)?,
                    expires_at: expires_at_str.map(|s| {
                        DateTime::parse_from_rfc3339(&s)
                            .unwrap()
                            .with_timezone(&Utc)
                    }),
                    created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(8)?)
                        .unwrap()
                        .with_timezone(&Utc),
                    updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(9)?)
                        .unwrap()
                        .with_timezone(&Utc),
                })
            })
            .optional()?;

        Ok(sub)
    }

    /// Update subscription status
    pub fn update_subscription_status(&self, user_id: &str, status: &str) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE subscriptions SET status = ?1, updated_at = ?2 WHERE user_id = ?3",
            params![status, Utc::now().to_rfc3339(), user_id],
        )?;
        Ok(())
    }

    /// Update subscription tier
    pub fn update_subscription_tier(
        &self,
        user_id: &str,
        tier: &str,
        expires_at: Option<DateTime<Utc>>,
    ) -> Result<(), DbError> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE subscriptions SET tier = ?1, expires_at = ?2, updated_at = ?3 WHERE user_id = ?4",
            params![
                tier,
                expires_at.map(|dt| dt.to_rfc3339()),
                Utc::now().to_rfc3339(),
                user_id
            ],
        )?;
        Ok(())
    }

    // =========================================================================
    // Usage Tracking Operations
    // =========================================================================

    /// Get or create usage for current month
    pub fn get_or_create_usage(&self, user_id: &str) -> Result<DbUsage, DbError> {
        let month = Utc::now().format("%Y-%m").to_string();
        let conn = self.conn()?;

        // Try to get existing
        let mut stmt = conn.prepare(
            "SELECT user_id, month, queries_count, profiles_count, devices_count, updated_at
             FROM usage WHERE user_id = ?1 AND month = ?2",
        )?;

        let usage = stmt
            .query_row(params![user_id, &month], |row| {
                Ok(DbUsage {
                    user_id: row.get(0)?,
                    month: row.get(1)?,
                    queries_count: row.get(2)?,
                    profiles_count: row.get(3)?,
                    devices_count: row.get(4)?,
                    updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                        .unwrap()
                        .with_timezone(&Utc),
                })
            })
            .optional()?;

        match usage {
            Some(u) => Ok(u),
            None => {
                // Create new usage record
                let new_usage = DbUsage {
                    user_id: user_id.to_string(),
                    month: month.clone(),
                    queries_count: 0,
                    profiles_count: 0,
                    devices_count: 0,
                    updated_at: Utc::now(),
                };
                conn.execute(
                    "INSERT INTO usage (user_id, month, queries_count, profiles_count, devices_count, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![
                        new_usage.user_id,
                        new_usage.month,
                        new_usage.queries_count,
                        new_usage.profiles_count,
                        new_usage.devices_count,
                        new_usage.updated_at.to_rfc3339(),
                    ],
                )?;
                Ok(new_usage)
            }
        }
    }

    /// Increment query count for a user
    pub fn increment_query_count(&self, user_id: &str) -> Result<(), DbError> {
        let month = Utc::now().format("%Y-%m").to_string();
        let conn = self.conn()?;

        // Upsert with increment
        conn.execute(
            "INSERT INTO usage (user_id, month, queries_count, profiles_count, devices_count, updated_at)
             VALUES (?1, ?2, 1, 0, 0, ?3)
             ON CONFLICT(user_id, month) DO UPDATE SET
             queries_count = queries_count + 1, updated_at = ?3",
            params![user_id, month, Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

    /// Update profile count for a user
    pub fn update_profile_count(&self, user_id: &str, count: i64) -> Result<(), DbError> {
        let month = Utc::now().format("%Y-%m").to_string();
        let conn = self.conn()?;

        conn.execute(
            "INSERT INTO usage (user_id, month, queries_count, profiles_count, devices_count, updated_at)
             VALUES (?1, ?2, 0, ?3, 0, ?4)
             ON CONFLICT(user_id, month) DO UPDATE SET
             profiles_count = ?3, updated_at = ?4",
            params![user_id, month, count, Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

    /// Update device count for a user
    pub fn update_device_count(&self, user_id: &str, count: i64) -> Result<(), DbError> {
        let month = Utc::now().format("%Y-%m").to_string();
        let conn = self.conn()?;

        conn.execute(
            "INSERT INTO usage (user_id, month, queries_count, profiles_count, devices_count, updated_at)
             VALUES (?1, ?2, 0, 0, ?3, ?4)
             ON CONFLICT(user_id, month) DO UPDATE SET
             devices_count = ?3, updated_at = ?4",
            params![user_id, month, count, Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }
}

/// Query statistics
#[derive(Debug, Clone)]
pub struct QueryStats {
    pub total_queries: u64,
    pub blocked_queries: u64,
    pub cached_queries: u64,
}

// Make query_row optional
trait OptionalExt<T> {
    fn optional(self) -> Result<Option<T>, rusqlite::Error>;
}

impl<T> OptionalExt<T> for Result<T, rusqlite::Error> {
    fn optional(self) -> Result<Option<T>, rusqlite::Error> {
        match self {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sqlite_init() {
        let db = SqliteDb::new(":memory:").unwrap();
        assert!(db.blocklist_size().unwrap() == 0);
    }

    #[test]
    fn test_blocklist_operations() {
        let db = SqliteDb::new(":memory:").unwrap();

        let entry = DbBlocklistEntry {
            domain: "malware.com".to_string(),
            category: "malware".to_string(),
            source: "test".to_string(),
            added_at: Utc::now(),
        };

        db.add_to_blocklist(&entry).unwrap();
        assert!(db.is_blocked("malware.com").unwrap());
        assert!(!db.is_blocked("google.com").unwrap());
        assert_eq!(db.blocklist_size().unwrap(), 1);

        db.remove_from_blocklist("malware.com").unwrap();
        assert!(!db.is_blocked("malware.com").unwrap());
    }

    #[test]
    fn test_user_operations() {
        let db = SqliteDb::new(":memory:").unwrap();

        let user = DbUser {
            id: "user-123".to_string(),
            email: "test@example.com".to_string(),
            password_hash: "hash123".to_string(),
            tier: "free".to_string(),
            email_verified: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        db.create_user(&user).unwrap();

        let found = db.get_user("user-123").unwrap().unwrap();
        assert_eq!(found.email, "test@example.com");

        let by_email = db.get_user_by_email("test@example.com").unwrap().unwrap();
        assert_eq!(by_email.id, "user-123");
    }
}
