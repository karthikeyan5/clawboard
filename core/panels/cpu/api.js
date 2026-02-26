/**
 * CPU Panel API — Server-side data endpoint
 * 
 * Returns: { load: number, cores: number }
 */

const si = require('systeminformation');

module.exports = ({ hooks, auth }) => ({
  endpoint: '/api/panels/cpu',
  handler: async (req, res) => {
    // Auth check (supports both Mini App and cookie)
    let user = req.body?.initData
      ? auth.validateInitData(req.body.initData)
      : auth.getUserFromCookie(req);
    
    if (!user || !auth.isAllowed(user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const cpu = await si.currentLoad();
    const data = {
      load: Math.round(cpu.currentLoad * 10) / 10,
      cores: cpu.cpus?.length || 0
    };

    // Apply filter hook (allows custom panels to modify data)
    const filtered = hooks.filter('panel.cpu.data', data);
    res.json(filtered);
  }
});
