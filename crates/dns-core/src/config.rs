//! DNS Configuration management

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use anyhow::{Result, anyhow};

/// Main DNS configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigManager {
    pub dns: DnsSettings,
    pub cache: CacheSettings,
    pub filter: FilterSettings,
    pub logging: LoggingSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsSettings {
    pub upstream_servers: Vec<String>,
    pub bind_address: String,
    pub bind_port: u16,
    pub enable_dnssec: bool,
    pub enable_doh: bool,
    pub enable_dot: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheSettings {
    pub enabled: bool,
    pub max_size: usize,
    pub default_ttl: u32,
    pub min_ttl: u32,
    pub max_ttl: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterSettings {
    pub enabled: bool,
    pub blocklists: Vec<String>,
    pub allowlists: Vec<String>,
    pub enable_ai: bool,
    pub ai_threshold: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingSettings {
    pub level: String,
    pub format: String,
    pub file: Option<PathBuf>,
}

impl Default for ConfigManager {
    fn default() -> Self {
        Self {
            dns: DnsSettings {
                upstream_servers: vec![
                    "1.1.1.1:53".to_string(),
                    "8.8.8.8:53".to_string(),
                ],
                bind_address: "0.0.0.0".to_string(),
                bind_port: 53,
                enable_dnssec: true,
                enable_doh: false,
                enable_dot: false,
            },
            cache: CacheSettings {
                enabled: true,
                max_size: 10000,
                default_ttl: 300,
                min_ttl: 60,
                max_ttl: 86400,
            },
            filter: FilterSettings {
                enabled: true,
                blocklists: vec![],
                allowlists: vec![],
                enable_ai: true,
                ai_threshold: 0.7,
            },
            logging: LoggingSettings {
                level: "info".to_string(),
                format: "json".to_string(),
                file: None,
            },
        }
    }
}

impl ConfigManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn from_file(path: &PathBuf) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let config: ConfigManager = serde_json::from_str(&content)
            .map_err(|e| anyhow!("Failed to parse config: {}", e))?;
        Ok(config)
    }

    pub fn save(&self, path: &PathBuf) -> Result<()> {
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }
}
