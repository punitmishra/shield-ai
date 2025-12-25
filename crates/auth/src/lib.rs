//! Shield AI Authentication Module
//!
//! Provides JWT-based authentication, user management, and device registration
//! for the Shield AI DNS protection system.

pub mod jwt;
pub mod handlers;
pub mod middleware;
pub mod models;

pub use jwt::{JwtManager, Claims};
pub use handlers::*;
pub use middleware::auth_middleware;
pub use models::*;

use dashmap::DashMap;
use std::sync::Arc;
use tracing::info;

/// Authentication service managing users, sessions, and devices
pub struct AuthService {
    jwt_manager: JwtManager,
    users: DashMap<String, User>,
    sessions: DashMap<String, Session>,
    devices: DashMap<String, DeviceRegistration>,
    refresh_tokens: DashMap<String, RefreshToken>,
}

impl AuthService {
    /// Create a new auth service with the given JWT secret
    pub fn new(jwt_secret: &str) -> Self {
        info!("Initializing authentication service");
        Self {
            jwt_manager: JwtManager::new(jwt_secret),
            users: DashMap::new(),
            sessions: DashMap::new(),
            devices: DashMap::new(),
            refresh_tokens: DashMap::new(),
        }
    }

    /// Register a new user with email and password
    pub fn register(&self, email: &str, password: &str) -> Result<User, AuthError> {
        // Check if user exists
        if self.users.iter().any(|u| u.email == email) {
            return Err(AuthError::UserExists);
        }

        let user = User::new(email, password)?;
        self.users.insert(user.id.clone(), user.clone());
        info!("User registered: {}", email);
        Ok(user)
    }

    /// Login with email and password, returns access and refresh tokens
    pub fn login(&self, email: &str, password: &str) -> Result<AuthTokens, AuthError> {
        let user = self.users
            .iter()
            .find(|u| u.email == email)
            .ok_or(AuthError::InvalidCredentials)?;

        if !user.verify_password(password)? {
            return Err(AuthError::InvalidCredentials);
        }

        let access_token = self.jwt_manager.generate_access_token(&user.id, &user.tier)?;
        let refresh_token = self.jwt_manager.generate_refresh_token(&user.id)?;

        // Store refresh token
        self.refresh_tokens.insert(refresh_token.token.clone(), refresh_token.clone());

        info!("User logged in: {}", email);
        Ok(AuthTokens {
            access_token,
            refresh_token: refresh_token.token,
            expires_in: 3600, // 1 hour
            token_type: "Bearer".to_string(),
        })
    }

    /// Refresh access token using a refresh token
    pub fn refresh(&self, refresh_token: &str) -> Result<AuthTokens, AuthError> {
        let stored_token = self.refresh_tokens
            .get(refresh_token)
            .ok_or(AuthError::InvalidToken)?;

        if stored_token.is_expired() {
            self.refresh_tokens.remove(refresh_token);
            return Err(AuthError::TokenExpired);
        }

        let user = self.users
            .get(&stored_token.user_id)
            .ok_or(AuthError::UserNotFound)?;

        let access_token = self.jwt_manager.generate_access_token(&user.id, &user.tier)?;

        Ok(AuthTokens {
            access_token,
            refresh_token: refresh_token.to_string(),
            expires_in: 3600,
            token_type: "Bearer".to_string(),
        })
    }

    /// Logout user, invalidates refresh token
    pub fn logout(&self, refresh_token: &str) -> Result<(), AuthError> {
        self.refresh_tokens.remove(refresh_token);
        Ok(())
    }

    /// Validate an access token and return claims
    pub fn validate_token(&self, token: &str) -> Result<Claims, AuthError> {
        self.jwt_manager.validate_token(token)
    }

    /// Register a new device for a user
    pub fn register_device(&self, user_id: &str, registration: DeviceRegistrationRequest) -> Result<DeviceRegistration, AuthError> {
        if !self.users.contains_key(user_id) {
            return Err(AuthError::UserNotFound);
        }

        let device = DeviceRegistration::new(user_id, registration);
        self.devices.insert(device.device_id.to_string(), device.clone());
        info!("Device registered for user {}: {}", user_id, device.device_id);
        Ok(device)
    }

    /// Update push notification token for a device
    pub fn update_push_token(&self, device_id: &str, push_token: &str) -> Result<(), AuthError> {
        let mut device = self.devices
            .get_mut(device_id)
            .ok_or(AuthError::DeviceNotFound)?;

        device.push_token = Some(push_token.to_string());
        device.last_seen = chrono::Utc::now();
        Ok(())
    }

    /// Get all devices for a user
    pub fn get_user_devices(&self, user_id: &str) -> Vec<DeviceRegistration> {
        self.devices
            .iter()
            .filter(|d| d.user_id == user_id)
            .map(|d| d.clone())
            .collect()
    }

    /// Get user by ID
    pub fn get_user(&self, user_id: &str) -> Option<User> {
        self.users.get(user_id).map(|u| u.clone())
    }

    /// Get JWT manager for external validation
    pub fn jwt_manager(&self) -> &JwtManager {
        &self.jwt_manager
    }
}

impl Default for AuthService {
    fn default() -> Self {
        Self::new("default-jwt-secret-change-in-production")
    }
}

/// Thread-safe wrapper for auth service
pub type SharedAuthService = Arc<AuthService>;
