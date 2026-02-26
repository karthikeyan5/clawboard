/**
 * Example Panel API
 * 
 * This is the server-side data endpoint for your panel.
 * It runs in Node.js and has access to the full OpenClaw environment.
 */

module.exports = ({ hooks, auth, config }) => ({
  // The API endpoint your panel will fetch data from
  endpoint: '/api/panels/example-panel',
  
  // The request handler (standard Express middleware)
  handler: async (req, res) => {
    // ── Auth check (supports both Mini App and browser cookie) ──
    let user = req.body?.initData
      ? auth.validateInitData(req.body.initData)
      : auth.getUserFromCookie(req);
    
    if (!user || !auth.isAllowed(user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // ── Your data collection logic goes here ──
    // Example: Read a file, query a database, call an API, run a shell command, etc.
    const data = {
      value: Math.random() * 100,
      timestamp: Date.now(),
      message: 'Hello from the example panel!'
    };

    // ── Apply filter hook (allows other plugins to modify your data) ──
    const filtered = hooks.filter('panel.example-panel.data', data);

    // ── Return JSON ──
    res.json(filtered);
  }
});
