/**
 * Uptime Panel API
 */

const si = require('systeminformation');

module.exports = ({ hooks, auth }) => ({
  endpoint: '/api/panels/uptime',
  handler: async (req, res) => {
    let user = req.body?.initData
      ? auth.validateInitData(req.body.initData)
      : auth.getUserFromCookie(req);
    
    if (!user || !auth.isAllowed(user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [time, osInfo] = await Promise.all([si.time(), si.osInfo()]);
    const data = {
      uptime: time.uptime,
      hostname: osInfo.hostname
    };

    res.json(hooks.filter('panel.uptime.data', data));
  }
});
