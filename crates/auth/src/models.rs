//! Authentication data models

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

/// Authentication errors
#[derive(Debug, Error)]
pub enum AuthError {
    #[error("User already exists")]
    UserExists,

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Invalid token")]
    InvalidToken,

    #[error("Token expired")]
    TokenExpired,

    #[error("User not found")]
    UserNotFound,

    #[error("Device not found")]
    DeviceNotFound,

    #[error("Password hashing error: {0}")]
    PasswordHashError(String),

    #[error("JWT error: {0}")]
    JwtError(String),
}

/// User tier matching shield-tiers crate
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Tier {
    Free,
    Pro,
    Enterprise,
}

impl Default for Tier {
    fn default() -> Self {
        Tier::Free
    }
}

/// User account
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub tier: Tier,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub email_verified: bool,
}

impl User {
    /// Create a new user with hashed password
    pub fn new(email: &str, password: &str) -> Result<Self, AuthError> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| AuthError::PasswordHashError(e.to_string()))?
            .to_string();

        Ok(Self {
            id: Uuid::new_v4().to_string(),
            email: email.to_lowercase(),
            password_hash,
            tier: Tier::Free,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            email_verified: false,
        })
    }

    /// Verify password against stored hash
    pub fn verify_password(&self, password: &str) -> Result<bool, AuthError> {
        let parsed_hash = PasswordHash::new(&self.password_hash)
            .map_err(|e| AuthError::PasswordHashError(e.to_string()))?;

        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }
}

/// Session for tracking active logins
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub user_id: String,
    pub device_id: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

/// Refresh token for obtaining new access tokens
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshToken {
    pub token: String,
    pub user_id: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

impl RefreshToken {
    pub fn new(user_id: &str) -> Self {
        let token = format!("rt_{}", Uuid::new_v4().to_string().replace("-", ""));
        Self {
            token,
            user_id: user_id.to_string(),
            created_at: Utc::now(),
            expires_at: Utc::now() + Duration::days(30),
        }
    }

    pub fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at
    }
}

/// Authentication tokens returned after login
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: u64,
    pub token_type: String,
}

/// Platform type for device registration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    iOS,
    Android,
    Web,
    Desktop,
    Other,
}

impl Default for Platform {
    fn default() -> Self {
        Platform::Other
    }
}

/// Device registration request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceRegistrationRequest {
    pub device_name: String,
    pub platform: Platform,
    pub push_token: Option<String>,
    pub os_version: Option<String>,
    pub app_version: Option<String>,
}

/// Registered device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceRegistration {
    pub device_id: Uuid,
    pub user_id: String,
    pub device_name: String,
    pub platform: Platform,
    pub push_token: Option<String>,
    pub os_version: Option<String>,
    pub app_version: Option<String>,
    pub vpn_profile_id: Option<String>,
    pub registered_at: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
}

impl DeviceRegistration {
    pub fn new(user_id: &str, request: DeviceRegistrationRequest) -> Self {
        Self {
            device_id: Uuid::new_v4(),
            user_id: user_id.to_string(),
            device_name: request.device_name,
            platform: request.platform,
            push_token: request.push_token,
            os_version: request.os_version,
            app_version: request.app_version,
            vpn_profile_id: None,
            registered_at: Utc::now(),
            last_seen: Utc::now(),
        }
    }
}

/// Login request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// Registration request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
}

/// Token refresh request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

/// Update push token request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePushTokenRequest {
    pub push_token: String,
}

/// User info response (safe for API)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub tier: Tier,
    pub email_verified: bool,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserInfo {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            tier: user.tier,
            email_verified: user.email_verified,
            created_at: user.created_at,
        }
    }
}
