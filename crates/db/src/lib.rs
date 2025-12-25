//! Shield AI Database Layer
//!
//! Provides unified access to:
//! - SQLite for relational data (users, devices, blocklists)
//! - Qdrant for vector storage (domain embeddings, threat vectors)

pub mod sqlite;
pub mod qdrant;
pub mod models;
pub mod error;

pub use error::DbError;
pub use sqlite::SqliteDb;
pub use qdrant::QdrantDb;
pub use models::*;

use std::sync::Arc;
use tracing::info;

/// Unified database manager
pub struct Database {
    pub sqlite: Arc<SqliteDb>,
    pub qdrant: Arc<QdrantDb>,
}

impl Database {
    /// Initialize database connections
    pub async fn new(sqlite_path: &str, qdrant_url: &str) -> Result<Self, DbError> {
        info!("Initializing database connections");

        let sqlite = Arc::new(SqliteDb::new(sqlite_path)?);
        info!("SQLite connected: {}", sqlite_path);

        let qdrant = Arc::new(QdrantDb::new(qdrant_url).await?);
        info!("Qdrant connected: {}", qdrant_url);

        Ok(Self { sqlite, qdrant })
    }

    /// Initialize with default paths
    pub async fn default() -> Result<Self, DbError> {
        Self::new("data/shield.db", "http://localhost:6334").await
    }

    /// Initialize SQLite only (for environments without Qdrant)
    pub fn sqlite_only(path: &str) -> Result<Self, DbError> {
        let sqlite = Arc::new(SqliteDb::new(path)?);
        let qdrant = Arc::new(QdrantDb::disconnected());
        Ok(Self { sqlite, qdrant })
    }
}
