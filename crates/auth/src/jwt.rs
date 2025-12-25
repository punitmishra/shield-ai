//! JWT token management

use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::models::{AuthError, RefreshToken, Tier};

/// JWT claims structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    /// Subject (user ID)
    pub sub: String,
    /// User tier
    pub tier: Tier,
    /// Issued at timestamp
    pub iat: i64,
    /// Expiration timestamp
    pub exp: i64,
    /// Token ID for revocation
    pub jti: String,
}

impl Claims {
    pub fn new(user_id: &str, tier: &Tier, expires_in_secs: i64) -> Self {
        let now = Utc::now();
        Self {
            sub: user_id.to_string(),
            tier: tier.clone(),
            iat: now.timestamp(),
            exp: (now + Duration::seconds(expires_in_secs)).timestamp(),
            jti: uuid::Uuid::new_v4().to_string(),
        }
    }

    pub fn is_expired(&self) -> bool {
        Utc::now().timestamp() > self.exp
    }
}

/// JWT token manager
pub struct JwtManager {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    access_token_expiry: i64,
}

impl JwtManager {
    /// Create a new JWT manager with the given secret
    pub fn new(secret: &str) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
            access_token_expiry: 3600, // 1 hour
        }
    }

    /// Generate an access token for a user
    pub fn generate_access_token(&self, user_id: &str, tier: &Tier) -> Result<String, AuthError> {
        let claims = Claims::new(user_id, tier, self.access_token_expiry);

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|e| AuthError::JwtError(e.to_string()))
    }

    /// Generate a refresh token for a user
    pub fn generate_refresh_token(&self, user_id: &str) -> Result<RefreshToken, AuthError> {
        Ok(RefreshToken::new(user_id))
    }

    /// Validate an access token and return claims
    pub fn validate_token(&self, token: &str) -> Result<Claims, AuthError> {
        let token_data = decode::<Claims>(token, &self.decoding_key, &Validation::default())
            .map_err(|e| AuthError::JwtError(e.to_string()))?;

        if token_data.claims.is_expired() {
            return Err(AuthError::TokenExpired);
        }

        Ok(token_data.claims)
    }

    /// Get user ID from token without full validation (for logging)
    pub fn get_user_id(&self, token: &str) -> Option<String> {
        let mut validation = Validation::default();
        validation.validate_exp = false;

        decode::<Claims>(token, &self.decoding_key, &validation)
            .ok()
            .map(|t| t.claims.sub)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jwt_generation_and_validation() {
        let manager = JwtManager::new("test-secret");
        let user_id = "user123";
        let tier = Tier::Pro;

        let token = manager.generate_access_token(user_id, &tier).unwrap();
        let claims = manager.validate_token(&token).unwrap();

        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.tier, tier);
    }

    #[test]
    fn test_refresh_token_generation() {
        let manager = JwtManager::new("test-secret");
        let refresh = manager.generate_refresh_token("user123").unwrap();

        assert!(refresh.token.starts_with("rt_"));
        assert!(!refresh.is_expired());
    }
}
