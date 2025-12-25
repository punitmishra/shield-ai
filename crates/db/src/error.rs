//! Database error types

use thiserror::Error;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("SQLite error: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("Qdrant error: {0}")]
    Qdrant(String),

    #[error("Connection pool error: {0}")]
    Pool(#[from] r2d2::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Already exists: {0}")]
    AlreadyExists(String),

    #[error("Invalid data: {0}")]
    InvalidData(String),

    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
}
