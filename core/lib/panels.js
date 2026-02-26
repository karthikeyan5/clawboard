/**
 * Panel discovery, loading, and registration system
 * 
 * Resolution order (last wins):
 * 1. core/panels/ (built-in fallback)
 * 2. custom/panels/ (user panels)
 * 3. plugins/{name}/panels/ (plugin panels)
 * 4. custom/overrides/ (user overrides of core or plugin panels)
 * 
 * Error boundaries: Every panel load is wrapped in try-catch
 */

const fs = require('fs');
const path = require('path');
const hooks = require('./hooks');

/**
 * Scan a directory for panel folders
 * @param {string} dir - Directory to scan
 * @returns {string[]} Panel folder names
 */
function scanPanelDir(dir) {
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (err) {
    console.error(`[Panels] Error scanning ${dir}:`, err.message);
    return [];
  }
}

/**
 * Load panel manifest.json (with validation)
 * @param {string} panelPath - Path to panel folder
 * @returns {object|null} Manifest object or null
 */
function loadManifest(panelPath) {
  const manifestPath = path.join(panelPath, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    // Basic validation
    if (!manifest.id || !manifest.name) {
      console.error(`[Panels] Invalid manifest in ${panelPath}: missing id or name`);
      return null;
    }
    return manifest;
  } catch (err) {
    console.error(`[Panels] Error reading manifest in ${panelPath}:`, err.message);
    return null;
  }
}

/**
 * Load panel api.js (server-side endpoint)
 * @param {string} panelPath - Path to panel folder
 * @param {object} context - Context object (hooks, config)
 * @returns {object|null} API handler { endpoint, handler } or null
 */
function loadPanelAPI(panelPath, context) {
  const apiPath = path.join(panelPath, 'api.js');
  if (!fs.existsSync(apiPath)) return null;
  try {
    const apiModule = require(apiPath);
    if (typeof apiModule === 'function') {
      return apiModule(context);
    }
    return apiModule;
  } catch (err) {
    console.error(`[Panels] Error loading API for ${panelPath}:`, err.message);
    return null;
  }
}

/**
 * Discover all panels across all sources
 * @param {string} rootDir - Dashboard root directory
 * @returns {Map<string, object>} Panel registry { panelId: { manifest, path, source } }
 */
function discoverPanels(rootDir) {
  const registry = new Map();

  // 1. Core panels (built-in fallback)
  const corePanelsDir = path.join(rootDir, 'core', 'panels');
  const corePanels = scanPanelDir(corePanelsDir);
  for (const panelId of corePanels) {
    const panelPath = path.join(corePanelsDir, panelId);
    const manifest = loadManifest(panelPath);
    if (manifest) {
      registry.set(panelId, { manifest, path: panelPath, source: 'core' });
    }
  }

  // 2. Custom panels (user panels)
  const customPanelsDir = path.join(rootDir, 'custom', 'panels');
  const customPanels = scanPanelDir(customPanelsDir);
  for (const panelId of customPanels) {
    const panelPath = path.join(customPanelsDir, panelId);
    const manifest = loadManifest(panelPath);
    if (manifest) {
      registry.set(panelId, { manifest, path: panelPath, source: 'custom' });
    }
  }

  // 3. Plugin panels
  const pluginsDir = path.join(rootDir, 'plugins');
  if (fs.existsSync(pluginsDir)) {
    const plugins = scanPanelDir(pluginsDir);
    for (const pluginName of plugins) {
      const pluginPanelsDir = path.join(pluginsDir, pluginName, 'panels');
      const pluginPanels = scanPanelDir(pluginPanelsDir);
      for (const panelId of pluginPanels) {
        const panelPath = path.join(pluginPanelsDir, panelId);
        const manifest = loadManifest(panelPath);
        if (manifest) {
          registry.set(panelId, { manifest, path: panelPath, source: `plugin:${pluginName}` });
        }
      }
    }
  }

  // 4. Custom overrides (highest priority)
  const overridesDir = path.join(rootDir, 'custom', 'overrides');
  const overrides = scanPanelDir(overridesDir);
  for (const panelId of overrides) {
    const panelPath = path.join(overridesDir, panelId);
    const manifest = loadManifest(panelPath);
    if (manifest) {
      registry.set(panelId, { manifest, path: panelPath, source: 'override' });
    }
  }

  // Fire discovery hook (allows plugins to modify registry)
  hooks.action('panels.discovered', registry);

  return registry;
}

/**
 * Register panel API endpoints with Express app
 * @param {object} app - Express app
 * @param {Map} registry - Panel registry from discoverPanels
 * @param {object} context - Context object (hooks, config)
 */
function registerPanelAPIs(app, registry, context) {
  let registered = 0;
  for (const [panelId, panelInfo] of registry.entries()) {
    const api = loadPanelAPI(panelInfo.path, context);
    if (api && api.endpoint && api.handler) {
      // Wrap in error boundary
      app.all(api.endpoint, async (req, res, next) => {
        try {
          await api.handler(req, res, next);
        } catch (err) {
          console.error(`[Panel API Error] ${panelId}:`, err.message);
          res.status(500).json({ error: 'Panel API error', panel: panelId });
        }
      });
      registered++;
      console.log(`[Panels] Registered API: ${api.endpoint} (${panelInfo.source}/${panelId})`);
    }
  }
  console.log(`[Panels] Total panels discovered: ${registry.size}, APIs registered: ${registered}`);
}

/**
 * Build panel manifest list for frontend (filtered & ordered)
 * @param {Map} registry - Panel registry
 * @param {object} config - Dashboard config
 * @returns {object[]} Array of panel manifests for frontend
 */
function buildPanelList(registry, config) {
  let panels = Array.from(registry.values()).map(p => p.manifest);

  // Filter: remove disabled panels
  const disabled = new Set(config.panels?.disabled || []);
  panels = panels.filter(p => !disabled.has(p.id));

  // Apply filter hook
  panels = hooks.filter('panels.order', panels, config);

  // Sort: by position (from manifest) then by order from config
  const orderMap = new Map();
  (config.panels?.order || []).forEach((id, idx) => orderMap.set(id, idx));

  panels.sort((a, b) => {
    const posA = a.position !== undefined ? a.position : 999;
    const posB = b.position !== undefined ? b.position : 999;
    if (posA !== posB) return posA - posB;
    
    const orderA = orderMap.get(a.id) !== undefined ? orderMap.get(a.id) : 999;
    const orderB = orderMap.get(b.id) !== undefined ? orderMap.get(b.id) : 999;
    return orderA - orderB;
  });

  return panels;
}

module.exports = {
  discoverPanels,
  registerPanelAPIs,
  buildPanelList
};
