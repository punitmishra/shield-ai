//! Authentication middleware for Axum

use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::sync::Arc;
use tracing::warn;

use crate::{AuthService, Claims};

/// Extract Bearer token from Authorization header
fn extract_bearer_token(auth_header: &str) -> Option<&str> {
    if auth_header.starts_with("Bearer ") {
        Some(&auth_header[7..])
    } else {
        None
    }
}

/// Authentication middleware
///
/// Validates JWT token and adds Claims to request extensions.
/// Protected routes should use this middleware.
pub async fn auth_middleware(
    State(auth): State<Arc<AuthService>>,
    mut request: Request,
    next: Next,
) -> Response {
    // Get Authorization header
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let Some(auth_header) = auth_header else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "missing_token",
                "message": "Authorization header required"
            })),
        ).into_response();
    };

    // Extract Bearer token
    let Some(token) = extract_bearer_token(auth_header) else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "invalid_token_format",
                "message": "Bearer token required"
            })),
        ).into_response();
    };

    // Validate token
    match auth.validate_token(token) {
        Ok(claims) => {
            // Add claims to request extensions for handlers to access
            request.extensions_mut().insert(claims);
            next.run(request).await
        }
        Err(e) => {
            warn!("Token validation failed: {}", e);
            (
                StatusCode::UNAUTHORIZED,
                Json(json!({
                    "error": "invalid_token",
                    "message": "Invalid or expired token"
                })),
            ).into_response()
        }
    }
}

/// Optional authentication middleware
///
/// Validates token if present, but allows unauthenticated requests.
/// Useful for endpoints that behave differently for logged-in users.
pub async fn optional_auth_middleware(
    State(auth): State<Arc<AuthService>>,
    mut request: Request,
    next: Next,
) -> Response {
    // Get Authorization header
    if let Some(auth_header) = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
    {
        // If token provided, validate it
        if let Some(token) = extract_bearer_token(auth_header) {
            if let Ok(claims) = auth.validate_token(token) {
                request.extensions_mut().insert(claims);
            }
        }
    }

    next.run(request).await
}

/// Tier-based authorization middleware factory
///
/// Creates middleware that requires a specific tier or higher.
pub fn require_tier(required_tier: crate::Tier) -> impl Fn(Claims) -> bool {
    move |claims: Claims| {
        match (&claims.tier, &required_tier) {
            // Enterprise has access to everything
            (crate::Tier::Enterprise, _) => true,
            // Pro has access to Pro and Free features
            (crate::Tier::Pro, crate::Tier::Pro) => true,
            (crate::Tier::Pro, crate::Tier::Free) => true,
            // Free only has access to Free features
            (crate::Tier::Free, crate::Tier::Free) => true,
            _ => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_bearer_token() {
        assert_eq!(extract_bearer_token("Bearer abc123"), Some("abc123"));
        assert_eq!(extract_bearer_token("bearer abc123"), None);
        assert_eq!(extract_bearer_token("abc123"), None);
    }

    #[test]
    fn test_tier_authorization() {
        use crate::Tier;

        let check_pro = require_tier(Tier::Pro);

        // Enterprise can access Pro
        let enterprise_claims = Claims::new("user1", &Tier::Enterprise, 3600);
        assert!(check_pro(enterprise_claims));

        // Pro can access Pro
        let pro_claims = Claims::new("user2", &Tier::Pro, 3600);
        assert!(check_pro(pro_claims));

        // Free cannot access Pro
        let free_claims = Claims::new("user3", &Tier::Free, 3600);
        assert!(!check_pro(free_claims));
    }
}
