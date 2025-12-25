//! Shield AI Authentication Module
//!
//! Provides JWT-based authentication, user management, and device registration
//! for the Shield AI DNS protection system.
//!
//! Supports two storage modes:
//! - In-memory (DashMap) for testing
//! - SQLite for production persistence

pub mod jwt;
pub mod handlers;
pub mod middleware;
pub mod models;

pub use jwt::{JwtManager, Claims};
pub use handlers::*;
pub use middleware::auth_middleware;
pub use models::*;

use chrono::Utc;
use dashmap::DashMap;
use shield_db::{SqliteDb, DbUser, DbDevice, DbRefreshToken};
use std::sync::Arc;
use tracing::info;

/// Storage backend for auth service
pub enum AuthStorage {
    /// In-memory storage (for testing)
    Memory {
        users: DashMap<String, User>,
        #[allow(dead_code)]
        sessions: DashMap<String, Session>,
        devices: DashMap<String, DeviceRegistration>,
        refresh_tokens: DashMap<String, RefreshToken>,
    },
    /// SQLite persistent storage (for production)
    Sqlite(Arc<SqliteDb>),
}

impl AuthStorage {
    /// Create in-memory storage
    pub fn memory() -> Self {
        Self::Memory {
            users: DashMap::new(),
            sessions: DashMap::new(),
            devices: DashMap::new(),
            refresh_tokens: DashMap::new(),
        }
    }

    /// Create SQLite storage
    pub fn sqlite(db: Arc<SqliteDb>) -> Self {
        Self::Sqlite(db)
    }
}

/// Authentication service managing users, sessions, and devices
pub struct AuthService {
    jwt_manager: JwtManager,
    storage: AuthStorage,
}

impl AuthService {
    /// Create a new auth service with in-memory storage
    pub fn new(jwt_secret: &str) -> Self {
        info!("Initializing authentication service (in-memory)");
        Self {
            jwt_manager: JwtManager::new(jwt_secret),
            storage: AuthStorage::memory(),
        }
    }

    /// Create auth service with SQLite persistence
    pub fn with_sqlite(jwt_secret: &str, db: Arc<SqliteDb>) -> Self {
        info!("Initializing authentication service (SQLite)");
        Self {
            jwt_manager: JwtManager::new(jwt_secret),
            storage: AuthStorage::sqlite(db),
        }
    }

    /// Register a new user with email and password
    pub fn register(&self, email: &str, password: &str) -> Result<User, AuthError> {
        match &self.storage {
            AuthStorage::Memory { users, .. } => {
                // Check if user exists
                if users.iter().any(|u| u.email == email) {
                    return Err(AuthError::UserExists);
                }

                let user = User::new(email, password)?;
                users.insert(user.id.clone(), user.clone());
                info!("User registered: {}", email);
                Ok(user)
            }
            AuthStorage::Sqlite(db) => {
                // Check if user exists
                if db.get_user_by_email(email).map_err(|e| AuthError::DatabaseError(e.to_string()))?.is_some() {
                    return Err(AuthError::UserExists);
                }

                let user = User::new(email, password)?;
                let db_user = DbUser {
                    id: user.id.clone(),
                    email: user.email.clone(),
                    password_hash: user.password_hash.clone(),
                    tier: format!("{:?}", user.tier).to_lowercase(),
                    email_verified: user.email_verified,
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                };
                db.create_user(&db_user).map_err(|e| AuthError::DatabaseError(e.to_string()))?;
                info!("User registered (SQLite): {}", email);
                Ok(user)
            }
        }
    }

    /// Login with email and password, returns access and refresh tokens
    pub fn login(&self, email: &str, password: &str) -> Result<AuthTokens, AuthError> {
        let user = self.get_user_by_email(email)?
            .ok_or(AuthError::InvalidCredentials)?;

        if !user.verify_password(password)? {
            return Err(AuthError::InvalidCredentials);
        }

        let access_token = self.jwt_manager.generate_access_token(&user.id, &user.tier)?;
        let refresh_token = self.jwt_manager.generate_refresh_token(&user.id)?;

        // Store refresh token
        self.store_refresh_token(&refresh_token)?;

        info!("User logged in: {}", email);
        Ok(AuthTokens {
            access_token,
            refresh_token: refresh_token.token,
            expires_in: 3600, // 1 hour
            token_type: "Bearer".to_string(),
        })
    }

    /// Get user by email (internal)
    fn get_user_by_email(&self, email: &str) -> Result<Option<User>, AuthError> {
        match &self.storage {
            AuthStorage::Memory { users, .. } => {
                Ok(users.iter().find(|u| u.email == email).map(|u| u.clone()))
            }
            AuthStorage::Sqlite(db) => {
                match db.get_user_by_email(email).map_err(|e| AuthError::DatabaseError(e.to_string()))? {
                    Some(db_user) => Ok(Some(self.db_user_to_user(db_user))),
                    None => Ok(None),
                }
            }
        }
    }

    /// Store refresh token
    fn store_refresh_token(&self, token: &RefreshToken) -> Result<(), AuthError> {
        match &self.storage {
            AuthStorage::Memory { refresh_tokens, .. } => {
                refresh_tokens.insert(token.token.clone(), token.clone());
                Ok(())
            }
            AuthStorage::Sqlite(db) => {
                let db_token = DbRefreshToken {
                    token: token.token.clone(),
                    user_id: token.user_id.clone(),
                    expires_at: token.expires_at,
                    created_at: token.created_at,
                };
                db.store_refresh_token(&db_token).map_err(|e| AuthError::DatabaseError(e.to_string()))
            }
        }
    }

    /// Refresh access token using a refresh token
    pub fn refresh(&self, refresh_token: &str) -> Result<AuthTokens, AuthError> {
        let stored_token = self.get_refresh_token(refresh_token)?
            .ok_or(AuthError::InvalidToken)?;

        if stored_token.is_expired() {
            self.delete_refresh_token(refresh_token)?;
            return Err(AuthError::TokenExpired);
        }

        let user = self.get_user(&stored_token.user_id)
            .ok_or(AuthError::UserNotFound)?;

        let access_token = self.jwt_manager.generate_access_token(&user.id, &user.tier)?;

        Ok(AuthTokens {
            access_token,
            refresh_token: refresh_token.to_string(),
            expires_in: 3600,
            token_type: "Bearer".to_string(),
        })
    }

    /// Get refresh token
    fn get_refresh_token(&self, token: &str) -> Result<Option<RefreshToken>, AuthError> {
        match &self.storage {
            AuthStorage::Memory { refresh_tokens, .. } => {
                Ok(refresh_tokens.get(token).map(|t| t.clone()))
            }
            AuthStorage::Sqlite(db) => {
                match db.get_refresh_token(token).map_err(|e| AuthError::DatabaseError(e.to_string()))? {
                    Some(db_token) => Ok(Some(RefreshToken {
                        token: db_token.token,
                        user_id: db_token.user_id,
                        created_at: db_token.created_at,
                        expires_at: db_token.expires_at,
                    })),
                    None => Ok(None),
                }
            }
        }
    }

    /// Delete refresh token
    fn delete_refresh_token(&self, token: &str) -> Result<(), AuthError> {
        match &self.storage {
            AuthStorage::Memory { refresh_tokens, .. } => {
                refresh_tokens.remove(token);
                Ok(())
            }
            AuthStorage::Sqlite(db) => {
                db.delete_refresh_token(token).map_err(|e| AuthError::DatabaseError(e.to_string()))
            }
        }
    }

    /// Logout user, invalidates refresh token
    pub fn logout(&self, refresh_token: &str) -> Result<(), AuthError> {
        self.delete_refresh_token(refresh_token)
    }

    /// Validate an access token and return claims
    pub fn validate_token(&self, token: &str) -> Result<Claims, AuthError> {
        self.jwt_manager.validate_token(token)
    }

    /// Register a new device for a user
    pub fn register_device(&self, user_id: &str, registration: DeviceRegistrationRequest) -> Result<DeviceRegistration, AuthError> {
        // Verify user exists
        if self.get_user(user_id).is_none() {
            return Err(AuthError::UserNotFound);
        }

        let device = DeviceRegistration::new(user_id, registration);

        match &self.storage {
            AuthStorage::Memory { devices, .. } => {
                devices.insert(device.device_id.to_string(), device.clone());
            }
            AuthStorage::Sqlite(db) => {
                let db_device = DbDevice {
                    id: device.device_id.to_string(),
                    user_id: device.user_id.clone(),
                    device_name: device.device_name.clone(),
                    platform: format!("{:?}", device.platform).to_lowercase(),
                    push_token: device.push_token.clone(),
                    os_version: device.os_version.clone(),
                    app_version: device.app_version.clone(),
                    last_seen: device.last_seen,
                    created_at: device.registered_at,
                };
                db.create_device(&db_device).map_err(|e| AuthError::DatabaseError(e.to_string()))?;
            }
        }

        info!("Device registered for user {}: {}", user_id, device.device_id);
        Ok(device)
    }

    /// Update push notification token for a device
    pub fn update_push_token(&self, device_id: &str, push_token: &str) -> Result<(), AuthError> {
        match &self.storage {
            AuthStorage::Memory { devices, .. } => {
                let mut device = devices
                    .get_mut(device_id)
                    .ok_or(AuthError::DeviceNotFound)?;
                device.push_token = Some(push_token.to_string());
                device.last_seen = Utc::now();
                Ok(())
            }
            AuthStorage::Sqlite(db) => {
                db.update_device_push_token(device_id, push_token)
                    .map_err(|e| AuthError::DatabaseError(e.to_string()))
            }
        }
    }

    /// Get all devices for a user
    pub fn get_user_devices(&self, user_id: &str) -> Vec<DeviceRegistration> {
        match &self.storage {
            AuthStorage::Memory { devices, .. } => {
                devices
                    .iter()
                    .filter(|d| d.user_id == user_id)
                    .map(|d| d.clone())
                    .collect()
            }
            AuthStorage::Sqlite(db) => {
                match db.get_user_devices(user_id) {
                    Ok(db_devices) => db_devices.into_iter().map(|d| self.db_device_to_device(d)).collect(),
                    Err(_) => Vec::new(),
                }
            }
        }
    }

    /// Get user by ID
    pub fn get_user(&self, user_id: &str) -> Option<User> {
        match &self.storage {
            AuthStorage::Memory { users, .. } => {
                users.get(user_id).map(|u| u.clone())
            }
            AuthStorage::Sqlite(db) => {
                db.get_user(user_id).ok().flatten().map(|u| self.db_user_to_user(u))
            }
        }
    }

    /// Get JWT manager for external validation
    pub fn jwt_manager(&self) -> &JwtManager {
        &self.jwt_manager
    }

    /// Convert DbUser to User
    fn db_user_to_user(&self, db_user: DbUser) -> User {
        User {
            id: db_user.id,
            email: db_user.email,
            password_hash: db_user.password_hash,
            tier: match db_user.tier.as_str() {
                "pro" => Tier::Pro,
                "enterprise" => Tier::Enterprise,
                _ => Tier::Free,
            },
            created_at: db_user.created_at,
            updated_at: db_user.updated_at,
            email_verified: db_user.email_verified,
        }
    }

    /// Convert DbDevice to DeviceRegistration
    fn db_device_to_device(&self, db_device: DbDevice) -> DeviceRegistration {
        DeviceRegistration {
            device_id: uuid::Uuid::parse_str(&db_device.id).unwrap_or_else(|_| uuid::Uuid::new_v4()),
            user_id: db_device.user_id,
            device_name: db_device.device_name,
            platform: match db_device.platform.as_str() {
                "ios" => Platform::iOS,
                "android" => Platform::Android,
                "web" => Platform::Web,
                "desktop" => Platform::Desktop,
                _ => Platform::Other,
            },
            push_token: db_device.push_token,
            os_version: db_device.os_version,
            app_version: db_device.app_version,
            vpn_profile_id: None,
            registered_at: db_device.created_at,
            last_seen: db_device.last_seen,
        }
    }
}

impl Default for AuthService {
    fn default() -> Self {
        Self::new("default-jwt-secret-change-in-production")
    }
}

/// Thread-safe wrapper for auth service
pub type SharedAuthService = Arc<AuthService>;
