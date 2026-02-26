/**
 * Memory Panel API
 */

const si = require('systeminformation');

module.exports = ({ hooks, auth }) => ({
  endpoint: '/api/panels/memory',
  handler: async (req, res) => {
    let user = req.body?.initData
      ? auth.validateInitData(req.body.initData)
      : auth.getUserFromCookie(req);
    
    if (!user || !auth.isAllowed(user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const mem = await si.mem();
    const data = {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      available: mem.available,
      pct: Math.round((mem.used / mem.total) * 1000) / 10
    };

    res.json(hooks.filter('panel.memory.data', data));
  }
});
