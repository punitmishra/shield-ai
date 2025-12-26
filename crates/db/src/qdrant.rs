//! Qdrant vector database operations
//!
//! Handles vector storage for ML/AI features:
//! - Domain embeddings for similarity search
//! - Threat vectors for pattern matching
//! - ML feature vectors for classification

#![allow(deprecated)]

use crate::error::DbError;
use crate::models::{DomainEmbedding, ThreatVector};
use qdrant_client::prelude::*;
use qdrant_client::qdrant::{
    value::Kind, vectors_config::Config, Condition, CreateCollection, Distance, FieldCondition,
    Filter, PointStruct, SearchPoints, Value as QdrantValue, VectorParams, VectorsConfig,
};
use std::collections::HashMap;
use tracing::{debug, info, warn};

const DOMAIN_COLLECTION: &str = "domain_embeddings";
const THREAT_COLLECTION: &str = "threat_vectors";
const VECTOR_SIZE: u64 = 384; // Typical embedding size for small models

/// Qdrant database wrapper
pub struct QdrantDb {
    client: Option<QdrantClient>,
    connected: bool,
}

impl QdrantDb {
    /// Create new Qdrant connection
    pub async fn new(url: &str) -> Result<Self, DbError> {
        match QdrantClient::from_url(url).build() {
            Ok(client) => {
                let db = Self {
                    client: Some(client),
                    connected: true,
                };

                // Initialize collections
                if let Err(e) = db.init_collections().await {
                    warn!("Failed to initialize Qdrant collections: {}", e);
                }

                Ok(db)
            }
            Err(e) => {
                warn!("Failed to connect to Qdrant: {}", e);
                Ok(Self {
                    client: None,
                    connected: false,
                })
            }
        }
    }

    /// Create disconnected instance (for SQLite-only mode)
    pub fn disconnected() -> Self {
        Self {
            client: None,
            connected: false,
        }
    }

    /// Check if connected
    pub fn is_connected(&self) -> bool {
        self.connected
    }

    /// Get client reference
    fn client(&self) -> Result<&QdrantClient, DbError> {
        self.client
            .as_ref()
            .ok_or_else(|| DbError::ConnectionFailed("Qdrant not connected".to_string()))
    }

    /// Initialize collections
    async fn init_collections(&self) -> Result<(), DbError> {
        let client = self.client()?;

        // Create domain embeddings collection
        if !self.collection_exists(DOMAIN_COLLECTION).await? {
            client
                .create_collection(&CreateCollection {
                    collection_name: DOMAIN_COLLECTION.to_string(),
                    vectors_config: Some(VectorsConfig {
                        config: Some(Config::Params(VectorParams {
                            size: VECTOR_SIZE,
                            distance: Distance::Cosine.into(),
                            ..Default::default()
                        })),
                    }),
                    ..Default::default()
                })
                .await
                .map_err(|e| DbError::Qdrant(e.to_string()))?;
            info!("Created collection: {}", DOMAIN_COLLECTION);
        }

        // Create threat vectors collection
        if !self.collection_exists(THREAT_COLLECTION).await? {
            client
                .create_collection(&CreateCollection {
                    collection_name: THREAT_COLLECTION.to_string(),
                    vectors_config: Some(VectorsConfig {
                        config: Some(Config::Params(VectorParams {
                            size: VECTOR_SIZE,
                            distance: Distance::Cosine.into(),
                            ..Default::default()
                        })),
                    }),
                    ..Default::default()
                })
                .await
                .map_err(|e| DbError::Qdrant(e.to_string()))?;
            info!("Created collection: {}", THREAT_COLLECTION);
        }

        Ok(())
    }

    /// Check if collection exists
    async fn collection_exists(&self, name: &str) -> Result<bool, DbError> {
        let client = self.client()?;
        match client.collection_info(name).await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    // =========================================================================
    // Domain Embedding Operations
    // =========================================================================

    /// Store domain embedding
    pub async fn upsert_domain_embedding(
        &self,
        embedding: &DomainEmbedding,
    ) -> Result<(), DbError> {
        let client = self.client()?;

        let point_id = Self::domain_to_id(&embedding.domain);
        let mut payload: HashMap<String, QdrantValue> = HashMap::new();

        payload.insert(
            "domain".to_string(),
            QdrantValue {
                kind: Some(Kind::StringValue(embedding.domain.clone())),
            },
        );
        payload.insert(
            "risk_score".to_string(),
            QdrantValue {
                kind: Some(Kind::DoubleValue(embedding.risk_score as f64)),
            },
        );
        payload.insert(
            "categories".to_string(),
            QdrantValue {
                kind: Some(Kind::StringValue(
                    serde_json::to_string(&embedding.categories).unwrap(),
                )),
            },
        );
        payload.insert(
            "last_analyzed".to_string(),
            QdrantValue {
                kind: Some(Kind::StringValue(embedding.last_analyzed.to_rfc3339())),
            },
        );

        let point = PointStruct::new(point_id, embedding.vector.clone(), payload);

        client
            .upsert_points_blocking(DOMAIN_COLLECTION, None, vec![point], None)
            .await
            .map_err(|e| DbError::Qdrant(e.to_string()))?;

        debug!("Stored embedding for domain: {}", embedding.domain);
        Ok(())
    }

    /// Search similar domains by vector
    pub async fn search_similar_domains(
        &self,
        vector: &[f32],
        limit: u64,
        min_score: f32,
    ) -> Result<Vec<(String, f32)>, DbError> {
        let client = self.client()?;

        let search_result = client
            .search_points(&SearchPoints {
                collection_name: DOMAIN_COLLECTION.to_string(),
                vector: vector.to_vec(),
                limit,
                score_threshold: Some(min_score),
                with_payload: Some(true.into()),
                ..Default::default()
            })
            .await
            .map_err(|e| DbError::Qdrant(e.to_string()))?;

        let results = search_result
            .result
            .into_iter()
            .filter_map(|point| {
                let domain = point.payload.get("domain").and_then(|v| match &v.kind {
                    Some(Kind::StringValue(s)) => Some(s.clone()),
                    _ => None,
                })?;
                Some((domain, point.score))
            })
            .collect();

        Ok(results)
    }

    /// Search high-risk domains
    pub async fn search_high_risk_domains(
        &self,
        min_risk_score: f32,
        limit: u64,
    ) -> Result<Vec<DomainEmbedding>, DbError> {
        let client = self.client()?;

        // Use scroll to get all high-risk domains
        let scroll_result = client
            .scroll(&qdrant_client::qdrant::ScrollPoints {
                collection_name: DOMAIN_COLLECTION.to_string(),
                filter: Some(Filter {
                    must: vec![Condition {
                        condition_one_of: Some(
                            qdrant_client::qdrant::condition::ConditionOneOf::Field(
                                FieldCondition {
                                    key: "risk_score".to_string(),
                                    r#match: None,
                                    range: Some(qdrant_client::qdrant::Range {
                                        gte: Some(min_risk_score as f64),
                                        ..Default::default()
                                    }),
                                    ..Default::default()
                                },
                            ),
                        ),
                    }],
                    ..Default::default()
                }),
                limit: Some(limit as u32),
                with_payload: Some(true.into()),
                with_vectors: Some(true.into()),
                ..Default::default()
            })
            .await
            .map_err(|e| DbError::Qdrant(e.to_string()))?;

        let results = scroll_result
            .result
            .into_iter()
            .filter_map(|point| self.point_to_domain_embedding(point))
            .collect();

        Ok(results)
    }

    /// Convert point to domain embedding
    fn point_to_domain_embedding(
        &self,
        point: qdrant_client::qdrant::RetrievedPoint,
    ) -> Option<DomainEmbedding> {
        let domain = point.payload.get("domain").and_then(|v| match &v.kind {
            Some(Kind::StringValue(s)) => Some(s.clone()),
            _ => None,
        })?;

        let risk_score = point
            .payload
            .get("risk_score")
            .and_then(|v| match &v.kind {
                Some(Kind::DoubleValue(f)) => Some(*f as f32),
                _ => None,
            })?;

        let categories: Vec<String> = point
            .payload
            .get("categories")
            .and_then(|v| match &v.kind {
                Some(Kind::StringValue(s)) => serde_json::from_str(s).ok(),
                _ => None,
            })
            .unwrap_or_default();

        let last_analyzed = point
            .payload
            .get("last_analyzed")
            .and_then(|v| match &v.kind {
                Some(Kind::StringValue(s)) => chrono::DateTime::parse_from_rfc3339(s).ok(),
                _ => None,
            })
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(chrono::Utc::now);

        let vector = match point.vectors {
            Some(vectors) => match vectors.vectors_options {
                Some(qdrant_client::qdrant::vectors_output::VectorsOptions::Vector(v)) => v.data,
                _ => return None,
            },
            None => return None,
        };

        Some(DomainEmbedding {
            domain,
            vector,
            risk_score,
            categories,
            last_analyzed,
        })
    }

    // =========================================================================
    // Threat Vector Operations
    // =========================================================================

    /// Store threat vector
    pub async fn upsert_threat_vector(&self, threat: &ThreatVector) -> Result<(), DbError> {
        let client = self.client()?;

        let point_id = Self::domain_to_id(&threat.domain);
        let mut payload: HashMap<String, QdrantValue> = HashMap::new();

        payload.insert(
            "domain".to_string(),
            QdrantValue {
                kind: Some(Kind::StringValue(threat.domain.clone())),
            },
        );
        payload.insert(
            "threat_type".to_string(),
            QdrantValue {
                kind: Some(Kind::StringValue(threat.threat_type.clone())),
            },
        );
        payload.insert(
            "confidence".to_string(),
            QdrantValue {
                kind: Some(Kind::DoubleValue(threat.confidence as f64)),
            },
        );
        payload.insert(
            "indicators".to_string(),
            QdrantValue {
                kind: Some(Kind::StringValue(
                    serde_json::to_string(&threat.indicators).unwrap(),
                )),
            },
        );

        let point = PointStruct::new(point_id, threat.embedding.clone(), payload);

        client
            .upsert_points_blocking(THREAT_COLLECTION, None, vec![point], None)
            .await
            .map_err(|e| DbError::Qdrant(e.to_string()))?;

        debug!("Stored threat vector for domain: {}", threat.domain);
        Ok(())
    }

    /// Search similar threats by vector
    pub async fn search_similar_threats(
        &self,
        vector: &[f32],
        limit: u64,
    ) -> Result<Vec<ThreatVector>, DbError> {
        let client = self.client()?;

        let search_result = client
            .search_points(&SearchPoints {
                collection_name: THREAT_COLLECTION.to_string(),
                vector: vector.to_vec(),
                limit,
                with_payload: Some(true.into()),
                with_vectors: Some(true.into()),
                ..Default::default()
            })
            .await
            .map_err(|e| DbError::Qdrant(e.to_string()))?;

        let results = search_result
            .result
            .into_iter()
            .filter_map(|point| {
                let domain = point.payload.get("domain").and_then(|v| match &v.kind {
                    Some(Kind::StringValue(s)) => Some(s.clone()),
                    _ => None,
                })?;

                let threat_type = point
                    .payload
                    .get("threat_type")
                    .and_then(|v| match &v.kind {
                        Some(Kind::StringValue(s)) => Some(s.clone()),
                        _ => None,
                    })?;

                let confidence = point
                    .payload
                    .get("confidence")
                    .and_then(|v| match &v.kind {
                        Some(Kind::DoubleValue(f)) => Some(*f as f32),
                        _ => None,
                    })?;

                let indicators: Vec<String> = point
                    .payload
                    .get("indicators")
                    .and_then(|v| match &v.kind {
                        Some(Kind::StringValue(s)) => serde_json::from_str(s).ok(),
                        _ => None,
                    })
                    .unwrap_or_default();

                Some(ThreatVector {
                    domain,
                    embedding: vec![], // Skip embedding in results
                    threat_type,
                    confidence,
                    indicators,
                })
            })
            .collect();

        Ok(results)
    }

    // =========================================================================
    // Utilities
    // =========================================================================

    /// Convert domain to point ID (hash)
    fn domain_to_id(domain: &str) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        domain.hash(&mut hasher);
        hasher.finish()
    }

    /// Get collection stats
    pub async fn get_stats(&self) -> Result<QdrantStats, DbError> {
        if !self.connected {
            return Ok(QdrantStats::default());
        }

        let client = self.client()?;

        let domain_count = match client.collection_info(DOMAIN_COLLECTION).await {
            Ok(info) => info
                .result
                .map(|r| r.points_count.unwrap_or(0))
                .unwrap_or(0),
            Err(_) => 0,
        };

        let threat_count = match client.collection_info(THREAT_COLLECTION).await {
            Ok(info) => info
                .result
                .map(|r| r.points_count.unwrap_or(0))
                .unwrap_or(0),
            Err(_) => 0,
        };

        Ok(QdrantStats {
            connected: self.connected,
            domain_embeddings: domain_count,
            threat_vectors: threat_count,
        })
    }
}

/// Qdrant statistics
#[derive(Debug, Clone, Default)]
pub struct QdrantStats {
    pub connected: bool,
    pub domain_embeddings: u64,
    pub threat_vectors: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_domain_to_id() {
        let id1 = QdrantDb::domain_to_id("google.com");
        let id2 = QdrantDb::domain_to_id("google.com");
        let id3 = QdrantDb::domain_to_id("facebook.com");

        assert_eq!(id1, id2);
        assert_ne!(id1, id3);
    }

    #[test]
    fn test_disconnected() {
        let db = QdrantDb::disconnected();
        assert!(!db.is_connected());
    }
}
