//! Authentication API handlers

use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::sync::Arc;
use tracing::{info, warn};

use crate::{
    AuthService, Claims, DeviceRegistrationRequest, LoginRequest, RefreshRequest,
    RegisterRequest, UpdatePushTokenRequest, UserInfo,
};

/// POST /api/auth/register - Register a new user
pub async fn register(
    State(auth): State<Arc<AuthService>>,
    Json(request): Json<RegisterRequest>,
) -> impl IntoResponse {
    match auth.register(&request.email, &request.password) {
        Ok(user) => {
            let user_info: UserInfo = user.into();
            (StatusCode::CREATED, Json(json!({
                "success": true,
                "user": user_info
            })))
        }
        Err(e) => {
            warn!("Registration failed: {}", e);
            (StatusCode::BAD_REQUEST, Json(json!({
                "success": false,
                "error": e.to_string()
            })))
        }
    }
}

/// POST /api/auth/login - Login with email and password
pub async fn login(
    State(auth): State<Arc<AuthService>>,
    Json(request): Json<LoginRequest>,
) -> impl IntoResponse {
    match auth.login(&request.email, &request.password) {
        Ok(tokens) => {
            info!("User logged in: {}", request.email);
            (StatusCode::OK, Json(json!({
                "success": true,
                "tokens": tokens
            })))
        }
        Err(e) => {
            warn!("Login failed for {}: {}", request.email, e);
            (StatusCode::UNAUTHORIZED, Json(json!({
                "success": false,
                "error": "Invalid credentials"
            })))
        }
    }
}

/// POST /api/auth/refresh - Refresh access token
pub async fn refresh_token(
    State(auth): State<Arc<AuthService>>,
    Json(request): Json<RefreshRequest>,
) -> impl IntoResponse {
    match auth.refresh(&request.refresh_token) {
        Ok(tokens) => {
            (StatusCode::OK, Json(json!({
                "success": true,
                "tokens": tokens
            })))
        }
        Err(e) => {
            warn!("Token refresh failed: {}", e);
            (StatusCode::UNAUTHORIZED, Json(json!({
                "success": false,
                "error": "Invalid or expired refresh token"
            })))
        }
    }
}

/// POST /api/auth/logout - Logout and invalidate refresh token
pub async fn logout(
    State(auth): State<Arc<AuthService>>,
    Json(request): Json<RefreshRequest>,
) -> impl IntoResponse {
    let _ = auth.logout(&request.refresh_token);
    (StatusCode::OK, Json(json!({
        "success": true,
        "message": "Logged out successfully"
    })))
}

/// GET /api/auth/me - Get current user info
pub async fn get_current_user(
    State(auth): State<Arc<AuthService>>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    match auth.get_user(&claims.sub) {
        Some(user) => {
            let user_info: UserInfo = user.into();
            (StatusCode::OK, Json(json!({
                "success": true,
                "user": user_info
            })))
        }
        None => {
            (StatusCode::NOT_FOUND, Json(json!({
                "success": false,
                "error": "User not found"
            })))
        }
    }
}

/// POST /api/devices/register - Register a new device
pub async fn register_device(
    State(auth): State<Arc<AuthService>>,
    Extension(claims): Extension<Claims>,
    Json(request): Json<DeviceRegistrationRequest>,
) -> impl IntoResponse {
    match auth.register_device(&claims.sub, request) {
        Ok(device) => {
            (StatusCode::CREATED, Json(json!({
                "success": true,
                "device": device
            })))
        }
        Err(e) => {
            warn!("Device registration failed: {}", e);
            (StatusCode::BAD_REQUEST, Json(json!({
                "success": false,
                "error": e.to_string()
            })))
        }
    }
}

/// PUT /api/devices/:id/push-token - Update push notification token
pub async fn update_push_token(
    State(auth): State<Arc<AuthService>>,
    Path(device_id): Path<String>,
    Json(request): Json<UpdatePushTokenRequest>,
) -> impl IntoResponse {
    match auth.update_push_token(&device_id, &request.push_token) {
        Ok(_) => {
            (StatusCode::OK, Json(json!({
                "success": true,
                "message": "Push token updated"
            })))
        }
        Err(e) => {
            warn!("Push token update failed: {}", e);
            (StatusCode::NOT_FOUND, Json(json!({
                "success": false,
                "error": e.to_string()
            })))
        }
    }
}

/// GET /api/devices/mine - Get all devices for current user
pub async fn get_my_devices(
    State(auth): State<Arc<AuthService>>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    let devices = auth.get_user_devices(&claims.sub);
    (StatusCode::OK, Json(json!({
        "success": true,
        "devices": devices
    })))
}

/// DELETE /api/devices/:id - Unregister a device
pub async fn unregister_device(
    State(auth): State<Arc<AuthService>>,
    Extension(claims): Extension<Claims>,
    Path(device_id): Path<String>,
) -> impl IntoResponse {
    // TODO: Implement device removal
    (StatusCode::OK, Json(json!({
        "success": true,
        "message": "Device unregistered"
    })))
}
