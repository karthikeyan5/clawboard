/**
 * Auto-update system (stub for v2, full implementation in later versions)
 * 
 * Reads .version file, checks GitHub releases (future)
 * Provides version info for /api/version endpoint
 */

const fs = require('fs');
const path = require('path');

let versionInfo = null;

/**
 * Load version info from .version file
 * @param {string} rootDir - Dashboard root directory
 */
function loadVersion(rootDir) {
  const versionPath = path.join(rootDir, '.version');
  try {
    if (fs.existsSync(versionPath)) {
      versionInfo = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    } else {
      versionInfo = {
        version: '2.0.0',
        installed_at: new Date().toISOString(),
        source: 'unknown'
      };
    }
  } catch (err) {
    console.error('[Updater] Error reading .version:', err.message);
    versionInfo = { version: '2.0.0', error: 'Version file unreadable' };
  }
}

/**
 * Check for updates (stub — always returns null for now)
 * @returns {Promise<object|null>} Update info or null
 */
async function checkUpdate() {
  // TODO: Implement in v3
  // - Fetch latest release from GitHub
  // - Compare versions
  // - Check compatibility
  return null;
}

/**
 * Apply update (stub — not implemented)
 * @param {string} updateUrl - URL to download update from
 * @returns {Promise<boolean>} Success status
 */
async function applyUpdate(updateUrl) {
  // TODO: Implement in v3
  // - Download update
  // - Verify integrity
  // - Backup current version
  // - Apply update
  // - Restart server
  throw new Error('Auto-update not implemented in v2');
}

/**
 * Get current version info
 * @returns {object} Version info object
 */
function getVersionInfo() {
  return versionInfo || { version: '2.0.0', error: 'Version not loaded' };
}

module.exports = {
  loadVersion,
  checkUpdate,
  applyUpdate,
  getVersionInfo
};
