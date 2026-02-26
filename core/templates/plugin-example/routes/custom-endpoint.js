/**
 * Plugin Custom Route Example
 * 
 * Add custom API endpoints that don't belong to a specific panel.
 */

module.exports = (app, { hooks, config, auth }) => {
  // Public endpoint (no auth required)
  app.get('/api/plugins/example/hello', (req, res) => {
    res.json({ message: 'Hello from the example plugin!' });
  });

  // Protected endpoint (requires auth)
  app.get('/api/plugins/example/secret', auth.requireAuth, (req, res) => {
    res.json({
      message: 'You are authenticated!',
      user: req.user
    });
  });

  // POST endpoint with hook integration
  app.post('/api/plugins/example/action', auth.requireAuth, async (req, res) => {
    const { action } = req.body;

    // Fire a custom hook
    hooks.action('plugin.example.action', action, req.user);

    res.json({ ok: true, action });
  });
};
