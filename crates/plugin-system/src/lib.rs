//! Shield AI Plugin System
//!
//! WASM-based plugin system for extending Shield AI functionality.
//! Plugins can:
//! - Add custom domain filtering rules
//! - Implement custom threat detection
//! - Add analytics and reporting
//! - Integrate with external services

use anyhow::{anyhow, Result};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::{debug, error, info, warn};
use uuid::Uuid;
use wasmtime::*;

/// Plugin metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginMetadata {
    pub id: Uuid,
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub capabilities: Vec<PluginCapability>,
    pub enabled: bool,
}

/// What a plugin can do
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PluginCapability {
    DomainFilter,
    ThreatDetection,
    Analytics,
    Logging,
    Custom,
}

/// Result from a plugin's domain check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDomainResult {
    pub should_block: bool,
    pub reason: Option<String>,
    pub confidence: f32,
    pub category: Option<String>,
}

impl Default for PluginDomainResult {
    fn default() -> Self {
        Self {
            should_block: false,
            reason: None,
            confidence: 0.0,
            category: None,
        }
    }
}

/// A loaded WASM plugin
pub struct Plugin {
    pub metadata: PluginMetadata,
    engine: Engine,
    module: Module,
    store: Store<PluginState>,
    instance: Option<Instance>,
}

/// Plugin execution state
#[allow(dead_code)] // Reserved for WASM memory limiting feature
struct PluginState {
    memory_limit: usize,
    execution_count: u64,
}

impl Plugin {
    /// Load a plugin from WASM bytes
    pub fn load(wasm_bytes: &[u8], metadata: PluginMetadata) -> Result<Self> {
        let mut config = Config::new();
        config.wasm_memory64(false);
        config.consume_fuel(true);

        let engine = Engine::new(&config)?;
        let module = Module::new(&engine, wasm_bytes)?;

        let mut store = Store::new(
            &engine,
            PluginState {
                memory_limit: 16 * 1024 * 1024, // 16MB
                execution_count: 0,
            },
        );

        // Set fuel limit for execution
        store.set_fuel(1_000_000)?;

        info!("Loaded plugin: {} v{}", metadata.name, metadata.version);

        Ok(Self {
            metadata,
            engine,
            module,
            store,
            instance: None,
        })
    }

    /// Initialize the plugin instance
    pub fn initialize(&mut self) -> Result<()> {
        let mut linker = Linker::new(&self.engine);

        // Add host functions that plugins can call
        linker.func_wrap("env", "log_message", |mut caller: Caller<'_, PluginState>, ptr: i32, len: i32| {
            if let Some(memory) = caller.get_export("memory").and_then(|e| e.into_memory()) {
                let data = memory.data(&caller);
                if let Some(slice) = data.get(ptr as usize..(ptr + len) as usize) {
                    if let Ok(msg) = std::str::from_utf8(slice) {
                        debug!("Plugin log: {}", msg);
                    }
                }
            }
        })?;

        linker.func_wrap("env", "get_time", || -> i64 {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs() as i64
        })?;

        let instance = linker.instantiate(&mut self.store, &self.module)?;
        self.instance = Some(instance);

        // Call plugin's init function if it exists
        if let Some(init) = self.instance.as_ref().and_then(|i| i.get_func(&mut self.store, "init")) {
            let init = init.typed::<(), ()>(&self.store)?;
            init.call(&mut self.store, ())?;
        }

        Ok(())
    }

    /// Check if a domain should be blocked
    pub fn check_domain(&mut self, domain: &str) -> Result<PluginDomainResult> {
        let instance = self.instance.as_ref().ok_or_else(|| anyhow!("Plugin not initialized"))?;

        // Get the check_domain function
        let check_fn = instance
            .get_func(&mut self.store, "check_domain")
            .ok_or_else(|| anyhow!("Plugin doesn't export check_domain"))?;

        // Get memory
        let memory = instance
            .get_memory(&mut self.store, "memory")
            .ok_or_else(|| anyhow!("Plugin doesn't export memory"))?;

        // Write domain to plugin memory
        let domain_bytes = domain.as_bytes();
        let domain_ptr = 1024i32; // Fixed offset for simplicity
        memory.write(&mut self.store, domain_ptr as usize, domain_bytes)?;

        // Call the function
        let check_fn = check_fn.typed::<(i32, i32), i32>(&self.store)?;
        let result = check_fn.call(&mut self.store, (domain_ptr, domain_bytes.len() as i32))?;

        // Refuel for next call
        self.store.set_fuel(1_000_000)?;
        self.store.data_mut().execution_count += 1;

        // Parse result (0 = allow, 1 = block, 2 = unknown)
        Ok(match result {
            0 => PluginDomainResult::default(),
            1 => PluginDomainResult {
                should_block: true,
                reason: Some("Blocked by plugin".to_string()),
                confidence: 1.0,
                category: None,
            },
            _ => PluginDomainResult::default(),
        })
    }

    /// Get plugin execution statistics
    pub fn stats(&self) -> PluginStats {
        PluginStats {
            execution_count: self.store.data().execution_count,
            enabled: self.metadata.enabled,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginStats {
    pub execution_count: u64,
    pub enabled: bool,
}

/// Plugin manager for loading and running plugins
pub struct PluginManager {
    plugins: Arc<DashMap<Uuid, Plugin>>,
    max_plugins: usize,
}

impl PluginManager {
    pub fn new(max_plugins: usize) -> Self {
        info!("Initializing Plugin Manager (max {} plugins)", max_plugins);
        Self {
            plugins: Arc::new(DashMap::new()),
            max_plugins,
        }
    }

    /// Load a plugin from WASM bytes
    pub fn load_plugin(&self, wasm_bytes: &[u8], metadata: PluginMetadata) -> Result<Uuid> {
        if self.plugins.len() >= self.max_plugins {
            return Err(anyhow!("Maximum number of plugins reached"));
        }

        let id = metadata.id;
        let mut plugin = Plugin::load(wasm_bytes, metadata)?;
        plugin.initialize()?;

        self.plugins.insert(id, plugin);
        info!("Plugin {} loaded and initialized", id);

        Ok(id)
    }

    /// Unload a plugin
    pub fn unload_plugin(&self, id: &Uuid) -> bool {
        if self.plugins.remove(id).is_some() {
            info!("Plugin {} unloaded", id);
            true
        } else {
            warn!("Plugin {} not found", id);
            false
        }
    }

    /// Enable or disable a plugin
    pub fn set_enabled(&self, id: &Uuid, enabled: bool) -> bool {
        if let Some(mut plugin) = self.plugins.get_mut(id) {
            plugin.metadata.enabled = enabled;
            info!("Plugin {} {}", id, if enabled { "enabled" } else { "disabled" });
            true
        } else {
            false
        }
    }

    /// Check domain against all enabled plugins
    pub fn check_domain(&self, domain: &str) -> Vec<(Uuid, PluginDomainResult)> {
        let mut results = Vec::new();

        for mut entry in self.plugins.iter_mut() {
            if entry.metadata.enabled && entry.metadata.capabilities.contains(&PluginCapability::DomainFilter) {
                match entry.check_domain(domain) {
                    Ok(result) => results.push((*entry.key(), result)),
                    Err(e) => error!("Plugin {} error: {}", entry.key(), e),
                }
            }
        }

        results
    }

    /// Should domain be blocked based on any plugin?
    pub fn should_block(&self, domain: &str) -> bool {
        self.check_domain(domain).iter().any(|(_, r)| r.should_block)
    }

    /// List all plugins
    pub fn list_plugins(&self) -> Vec<PluginMetadata> {
        self.plugins.iter().map(|p| p.metadata.clone()).collect()
    }

    /// Get plugin stats
    pub fn get_stats(&self, id: &Uuid) -> Option<PluginStats> {
        self.plugins.get(id).map(|p| p.stats())
    }

    /// Get aggregate stats
    pub fn aggregate_stats(&self) -> PluginManagerStats {
        PluginManagerStats {
            total_plugins: self.plugins.len(),
            enabled_plugins: self.plugins.iter().filter(|p| p.metadata.enabled).count(),
            total_executions: self.plugins.iter().map(|p| p.store.data().execution_count).sum(),
        }
    }
}

impl Default for PluginManager {
    fn default() -> Self {
        Self::new(10)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManagerStats {
    pub total_plugins: usize,
    pub enabled_plugins: usize,
    pub total_executions: u64,
}

/// Example: Create a simple blocklist plugin in WAT format
pub fn create_example_plugin_wat() -> &'static str {
    r#"
    (module
        ;; Import host functions
        (import "env" "log_message" (func $log (param i32 i32)))
        (import "env" "get_time" (func $get_time (result i64)))

        ;; Memory for string operations
        (memory (export "memory") 1)

        ;; Initialize plugin
        (func (export "init")
            ;; Plugin initialization
            nop
        )

        ;; Check if domain should be blocked
        ;; Returns: 0 = allow, 1 = block
        (func (export "check_domain") (param $ptr i32) (param $len i32) (result i32)
            ;; Simple example: block if domain contains "ads"
            ;; In real implementation, would parse and check domain
            (i32.const 0)
        )
    )
    "#
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plugin_metadata() {
        let meta = PluginMetadata {
            id: Uuid::new_v4(),
            name: "Test Plugin".to_string(),
            version: "1.0.0".to_string(),
            author: "Shield AI".to_string(),
            description: "Test plugin".to_string(),
            capabilities: vec![PluginCapability::DomainFilter],
            enabled: true,
        };

        assert!(meta.enabled);
        assert!(meta.capabilities.contains(&PluginCapability::DomainFilter));
    }

    #[test]
    fn test_plugin_manager_creation() {
        let manager = PluginManager::new(5);
        assert_eq!(manager.max_plugins, 5);
        assert!(manager.plugins.is_empty());
    }

    #[test]
    fn test_aggregate_stats() {
        let manager = PluginManager::new(10);
        let stats = manager.aggregate_stats();
        assert_eq!(stats.total_plugins, 0);
        assert_eq!(stats.enabled_plugins, 0);
    }

    #[test]
    fn test_example_wat() {
        let wat = create_example_plugin_wat();
        assert!(wat.contains("check_domain"));
        assert!(wat.contains("memory"));
    }
}
