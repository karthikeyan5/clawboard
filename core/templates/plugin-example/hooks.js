/**
 * Plugin Hooks Example
 * 
 * Register action listeners and filters to modify dashboard behavior.
 */

module.exports = (hooks, { config, auth }) => {
  // ── Action: Do something when the server starts ──
  hooks.on('server.init', (app) => {
    console.log('[Example Plugin] Server initializing...');
  });

  // ── Action: Do something when the server is ready ──
  hooks.on('server.ready', (server) => {
    console.log('[Example Plugin] Server ready!');
  });

  // ── Filter: Modify panel data before it's sent to the client ──
  hooks.addFilter('panel.cpu.data', (data) => {
    // Add a custom field to CPU panel data
    data.customField = 'Hello from plugin!';
    return data;
  });

  // ── Filter: Change the order of panels ──
  hooks.addFilter('panels.order', (panels) => {
    // Move your plugin's panel to the top
    return panels.sort((a, b) => {
      if (a.id === 'my-plugin-panel') return -1;
      if (b.id === 'my-plugin-panel') return 1;
      return 0;
    });
  });

  // ── Filter: Modify API response data ──
  hooks.addFilter('api.config', (config) => {
    // Add plugin metadata to config
    config.plugins = config.plugins || [];
    config.plugins.push({
      id: 'example-plugin',
      name: 'Example Plugin',
      version: '1.0.0'
    });
    return config;
  });
};
