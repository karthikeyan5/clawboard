/**
 * Processes Panel API
 */

const si = require('systeminformation');

module.exports = ({ hooks, auth }) => ({
  endpoint: '/api/panels/processes',
  handler: async (req, res) => {
    let user = req.body?.initData
      ? auth.validateInitData(req.body.initData)
      : auth.getUserFromCookie(req);
    
    if (!user || !auth.isAllowed(user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [proc, osInfo] = await Promise.all([si.processes(), si.osInfo()]);
    const data = {
      total: proc.all,
      running: proc.running,
      sleeping: proc.sleeping,
      os: `${osInfo.distro} ${osInfo.release}`
    };

    res.json(hooks.filter('panel.processes.data', data));
  }
});
